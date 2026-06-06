#!/usr/bin/env python3
"""
Knowledge Vault — Index Generator

Scans all HTML files in the content/ directory, extracts metadata from
<script id="metadata" type="application/json"> tags, and generates:

  - data/index.json        (searchable note index for the frontend)
  - data/metadata_cache.json (file hash cache for incremental builds)

Usage:
    python scripts/generate_index.py
"""

import os
import sys
import json
import hashlib
import re
from pathlib import Path

# ---- Configuration ----
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONTENT_DIR = PROJECT_ROOT / "content"
DATA_DIR = PROJECT_ROOT / "data"
INDEX_FILE = DATA_DIR / "index.json"
CACHE_FILE = DATA_DIR / "metadata_cache.json"

# Required metadata fields
REQUIRED_FIELDS = {"id", "slug", "title", "date", "timestamp", "type", "tags", "summary"}

# Allowed type values
ALLOWED_TYPES = {"dsa","learning", "journal", "project", "book", "question", "revision", "philosophy"}

# Regex to extract the metadata JSON block
METADATA_PATTERN = re.compile(
    r'<script\s+id=["\']metadata["\']\s+type=["\']application/json["\']>\s*(.*?)\s*</script>',
    re.DOTALL | re.IGNORECASE
)


def sha256_hash(filepath: Path) -> str:
    """Compute SHA256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_cache() -> dict:
    """Load the metadata cache from disk."""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            print(f"  ⚠  Warning: Could not read cache file: {e}")
    return {}


def save_cache(cache: dict) -> None:
    """Save the metadata cache to disk."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def extract_metadata(filepath: Path) -> dict | None:
    """Extract metadata JSON from an HTML content file."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except OSError as e:
        print(f"  ⚠  Warning: Could not read {filepath}: {e}")
        return None

    match = METADATA_PATTERN.search(content)
    if not match:
        print(f"  ⚠  Warning: No metadata script found in {filepath.name} — skipping")
        return None

    json_str = match.group(1)
    try:
        metadata = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"  ⚠  Warning: Invalid JSON in {filepath.name} — {e} — skipping")
        return None

    # Validate required fields
    missing = REQUIRED_FIELDS - set(metadata.keys())
    if missing:
        print(f"  ⚠  Warning: {filepath.name} missing fields: {', '.join(missing)} — skipping")
        return None

    # Validate type
    if metadata.get("type") not in ALLOWED_TYPES:
        print(f"  ⚠  Warning: {filepath.name} has invalid type '{metadata.get('type')}' — skipping")
        return None

    return metadata


def generate_index() -> None:
    """Main index generation routine."""
    print("🧠 Knowledge Vault — Index Generator")
    print("=" * 42)

    # Ensure content directory exists
    if not CONTENT_DIR.exists():
        print(f"\n  ❌ Content directory not found: {CONTENT_DIR}")
        print("  Create it and add some .html note files.")
        sys.exit(1)

    # Find all HTML files
    html_files = sorted(CONTENT_DIR.glob("*.html"))
    if not html_files:
        print(f"\n  ⚠  No .html files found in {CONTENT_DIR}")
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
        print("  📄 Generated empty index.json")
        return

    print(f"\n  📁 Found {len(html_files)} content file(s)\n")

    # Load cache
    cache = load_cache()
    new_cache = {}
    index_entries = []

    stats = {"cached": 0, "parsed": 0, "skipped": 0}

    for filepath in html_files:
        filename = filepath.name
        file_hash = sha256_hash(filepath)
        relative_path = f"content/{filename}"

        # Check cache
        cached_entry = cache.get(filename)
        if cached_entry and cached_entry.get("hash") == file_hash:
            # Cache hit — reuse metadata
            metadata = cached_entry["metadata"]
            new_cache[filename] = cached_entry
            stats["cached"] += 1
            status = "✓ cached"
        else:
            # Cache miss — parse file
            metadata = extract_metadata(filepath)
            if metadata is None:
                stats["skipped"] += 1
                continue

            new_cache[filename] = {
                "hash": file_hash,
                "metadata": metadata
            }
            stats["parsed"] += 1
            status = "⟳ parsed"

        print(f"  {status}  {filename}")

        # Build index entry
        entry = {
            "id": metadata["id"],
            "slug": metadata["slug"],
            "title": metadata["title"],
            "date": metadata["date"],
            "timestamp": metadata["timestamp"],
            "type": metadata["type"],
            "tags": metadata["tags"],
            "summary": metadata["summary"],
            "file": relative_path
        }
        index_entries.append(entry)

    # Sort by timestamp descending (newest first)
    index_entries.sort(key=lambda e: e.get("timestamp", ""), reverse=True)

    # Write index.json
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index_entries, f, indent=2, ensure_ascii=False)

    # Write cache
    save_cache(new_cache)

    # Report
    print(f"\n{'=' * 42}")
    print(f"  📝 {len(index_entries)} note(s) indexed")
    print(f"  ✓  {stats['cached']} cached | ⟳ {stats['parsed']} parsed | ⚠ {stats['skipped']} skipped")
    print(f"\n  📄 {INDEX_FILE}")
    print(f"  📄 {CACHE_FILE}")
    print(f"\n  ✅ Done!")


if __name__ == "__main__":
    generate_index()
