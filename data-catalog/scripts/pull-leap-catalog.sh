#!/usr/bin/env bash
#
# pull-leap-catalog.sh
#
# Pulls the LEAP data catalog and sample JSON files from the irl_stats
# repository into a consuming codebase.  The catalog and samples give
# AI coding tools (Claude, Copilot, etc.) the context they need to
# understand dataset schemas, and they can be used as fixtures for unit
# tests.
#
# Usage:
#   ./scripts/pull-leap-catalog.sh                  # defaults: branch=main, output=.
#   ./scripts/pull-leap-catalog.sh -b my-branch     # use a specific branch
#   ./scripts/pull-leap-catalog.sh -o vendor/leap    # custom output directory
#   ./scripts/pull-leap-catalog.sh -r https://github.com/arturo-mayorga/irl_stats.git
#
# What it pulls:
#   - data-catalog.md            — the canonical dataset catalog
#   - samples/                   — trimmed JSON samples from every dataset
#   - scripts/pull-leap-catalog.sh — latest version of this script
#

set -euo pipefail

SCRIPT_NAME="scripts/pull-leap-catalog.sh"

# --- Defaults ---
REPO_URL="https://github.com/arturo-mayorga/irl_stats.git"
BRANCH="main"
OUTPUT_DIR="."

# --- Parse arguments ---
usage() {
    echo "Usage: $0 [-r repo_url] [-b branch] [-o output_dir]"
    echo ""
    echo "Pulls the LEAP data catalog and sample files for AI coding tools."
    echo ""
    echo "Options:"
    echo "  -r  Git repository URL (default: $REPO_URL)"
    echo "  -b  Branch to pull from (default: $BRANCH)"
    echo "  -o  Output directory (default: $OUTPUT_DIR)"
    echo "  -h  Show this help message"
    exit 1
}

while getopts "r:b:o:h" opt; do
    case $opt in
        r) REPO_URL="$OPTARG" ;;
        b) BRANCH="$OPTARG" ;;
        o) OUTPUT_DIR="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# --- Main ---
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Pulling LEAP catalog + samples from $REPO_URL (branch: $BRANCH)..."
echo ""

# Sparse checkout: only grab the catalog, samples, and this script
git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse \
    "$REPO_URL" "$TMPDIR/repo" 2>&1 | sed 's/^/  /'

cd "$TMPDIR/repo"
git sparse-checkout set data-catalog.md samples/ "$SCRIPT_NAME" 2>&1 | sed 's/^/  /'
cd - > /dev/null

# Prepare output directory
mkdir -p "$OUTPUT_DIR"

# Copy catalog
if [ -f "$TMPDIR/repo/data-catalog.md" ]; then
    cp "$TMPDIR/repo/data-catalog.md" "$OUTPUT_DIR/data-catalog.md"
    echo "  ✓ data-catalog.md"
else
    echo "  ✗ data-catalog.md not found (check branch name)" >&2
fi

# Copy samples
if [ -d "$TMPDIR/repo/samples" ]; then
    rm -rf "$OUTPUT_DIR/samples"
    cp -r "$TMPDIR/repo/samples" "$OUTPUT_DIR/samples"
    SAMPLE_COUNT=$(find "$OUTPUT_DIR/samples" -name '*.json' | wc -l)
    echo "  ✓ samples/ ($SAMPLE_COUNT JSON files)"
else
    echo "  ✗ samples/ directory not found" >&2
fi

# Update this script
if [ -f "$TMPDIR/repo/$SCRIPT_NAME" ]; then
    mkdir -p "$OUTPUT_DIR/scripts"
    cp "$TMPDIR/repo/$SCRIPT_NAME" "$OUTPUT_DIR/$SCRIPT_NAME"
    chmod +x "$OUTPUT_DIR/$SCRIPT_NAME"
    echo "  ✓ $SCRIPT_NAME (updated to latest)"
else
    echo "  ✗ $SCRIPT_NAME not found" >&2
fi

echo ""
echo "Done! LEAP catalog is available at: $OUTPUT_DIR/"
echo ""
echo "Contents:"
echo "  $OUTPUT_DIR/data-catalog.md   — Dataset catalog (schemas, data flow)"
echo "  $OUTPUT_DIR/samples/          — Trimmed JSON samples from every dataset"
echo "  $OUTPUT_DIR/$SCRIPT_NAME      — This script (latest version)"
