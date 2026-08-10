#!/usr/bin/env bash
# Nightly backup: the whole data volume, encrypted when a passphrase is
# set, dated, pruned to the last 14. Restore is tar -xzf into OSYLE_DATA
# and a restart; drill it monthly (the restore drill is stage 15).
set -euo pipefail

DATA="${OSYLE_DATA:-$(dirname "$0")/../api/data}"
DEST="${OSYLE_BACKUPS:-$(dirname "$0")/../backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

ARCHIVE="$DEST/osyle-$STAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$(dirname "$DATA")" "$(basename "$DATA")"

if [ -n "${OSYLE_BACKUP_PASSPHRASE:-}" ]; then
  gpg --batch --yes --symmetric --cipher-algo AES256 \
    --passphrase "$OSYLE_BACKUP_PASSPHRASE" "$ARCHIVE"
  rm "$ARCHIVE"
  ARCHIVE="$ARCHIVE.gpg"
fi

ls -1t "$DEST"/osyle-* 2>/dev/null | tail -n +15 | xargs -r rm
echo "backed up: $ARCHIVE"
