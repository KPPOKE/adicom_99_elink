#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/adicom99-deploy}"
SHARED_DIR="${SHARED_DIR:-$DEPLOY_ROOT/shared}"
BACKUP_DIR="${BACKUP_DIR:-$SHARED_DIR/backup}"
RESTIC_ENV_FILE="${RESTIC_ENV_FILE:-$SHARED_DIR/restic.env}"

mkdir -p "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/backup.lock"
flock -n 9 || { echo "Proses backup lain masih berjalan" >&2; exit 1; }
[[ -f "$RESTIC_ENV_FILE" ]] || { echo "$RESTIC_ENV_FILE belum tersedia" >&2; exit 1; }
set -a
source "$RESTIC_ENV_FILE"
set +a
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY wajib diset}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE wajib diset}"

restic check
restic forget --tag adicom99 --keep-hourly 24 --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
echo "Pemeriksaan repository backup selesai"
