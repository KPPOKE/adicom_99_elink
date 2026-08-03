#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/adicom99-deploy}"
SHARED_DIR="${SHARED_DIR:-$DEPLOY_ROOT/shared}"
BACKUP_DIR="${BACKUP_DIR:-$SHARED_DIR/backup}"
STATUS_FILE="${BACKUP_STATUS_FILE:-$SHARED_DIR/backup-status}"
RESTIC_ENV_FILE="${RESTIC_ENV_FILE:-$SHARED_DIR/restic.env}"
MYSQL_CNF_FILE="${MYSQL_CNF_FILE:-$SHARED_DIR/mysql-backup.cnf}"
STAGING_DIR="$BACKUP_DIR/staging"
LOCK_FILE="$BACKUP_DIR/backup.lock"

mkdir -p "$BACKUP_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Backup lain masih berjalan" >&2; exit 1; }
[[ -f "$RESTIC_ENV_FILE" ]] || { echo "$RESTIC_ENV_FILE belum tersedia" >&2; exit 1; }
[[ -f "$MYSQL_CNF_FILE" ]] || { echo "$MYSQL_CNF_FILE belum tersedia" >&2; exit 1; }

set -a
source "$RESTIC_ENV_FILE"
set +a
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY wajib diset}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE wajib diset}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE wajib diset}"
for command in restic rclone mysqldump gzip flock; do
  command -v "$command" >/dev/null || { echo "$command tidak ditemukan" >&2; exit 1; }
done

rm -rf -- "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
trap 'rm -rf -- "$STAGING_DIR"' EXIT

mysqldump --defaults-extra-file="$MYSQL_CNF_FILE" --single-transaction --quick --routines --triggers --events --hex-blob --no-tablespaces "$MYSQL_DATABASE" | gzip -9 > "$STAGING_DIR/mysql.sql.gz"
gzip -t "$STAGING_DIR/mysql.sql.gz"
restic backup --tag adicom99 "$STAGING_DIR/mysql.sql.gz" "$SHARED_DIR/uploads" "$SHARED_DIR/.env"
restic forget --tag adicom99 --keep-hourly 24 --keep-daily 7 --keep-weekly 4 --keep-monthly 6

date -u +%s > "${STATUS_FILE}.tmp"
chmod 644 "${STATUS_FILE}.tmp"
mv "${STATUS_FILE}.tmp" "$STATUS_FILE"
echo "Backup selesai pada $(date -u +%FT%TZ)"
