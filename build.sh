#!/usr/bin/env bash
# Packs the extension into releases/tubedebrief-<version>.zip for the Chrome Web Store.
# The Store wants a plain ZIP with manifest.json at the archive root — not a .crx.
set -euo pipefail

cd "$(dirname "$0")"

SLUG=tubedebrief
OUT_DIR=releases

# Paths that ship to users. Listed explicitly rather than zipping the whole tree
# so that .git/, .idea/, .claude/, the READMEs and past releases can't leak into
# the package. Add new runtime directories here.
SOURCES=(
  manifest.json
  background
  content
  core
  icons
  offscreen
  options
  popup
)

command -v jq >/dev/null || { echo "build.sh: jq is required" >&2; exit 1; }
command -v zip >/dev/null || { echo "build.sh: zip is required" >&2; exit 1; }

VERSION=$(jq -re '.version' manifest.json)

for path in "${SOURCES[@]}"; do
  [[ -e $path ]] || { echo "build.sh: missing $path" >&2; exit 1; }
done

mkdir -p "$OUT_DIR"
ARCHIVE="$OUT_DIR/$SLUG-$VERSION.zip"

# zip merges into an existing archive instead of replacing it, so start clean —
# otherwise files deleted since the last build would survive in the package.
rm -f "$ARCHIVE"

zip -rq "$ARCHIVE" "${SOURCES[@]}" -x '*.DS_Store'

# Listed once into a variable: piping unzip straight into `grep -q` makes grep
# exit on the first match, and the resulting SIGPIPE trips pipefail.
NAMES=$(unzip -Z1 "$ARCHIVE")

# The Store rejects archives where the manifest sits in a subdirectory.
grep -qxF manifest.json <<<"$NAMES" || {
  echo "build.sh: manifest.json is not at the archive root" >&2
  exit 1
}

echo "$ARCHIVE ($(du -h "$ARCHIVE" | cut -f1), $(grep -vc '/$' <<<"$NAMES") files)"
