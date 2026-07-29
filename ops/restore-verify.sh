#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/adicom99-deploy}"
SHARED_DIR="${SHARED_DIR:-$DEPLOY_ROOT/shared}"
RESTIC_ENV_FILE="${RESTIC_ENV_FILE:-$SHARED_DIR/restic.env}"
MYSQL_RESTORE_CNF_FILE="${MYSQL_RESTORE_CNF_FILE:-$SHARED_DIR/mysql-restore.cnf}"
RESTORE_DATABASE="${RESTORE_DATABASE:-adicom99_restore_check}"
RESTORE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/adicom99-restore.XXXXXX")"
DATABASE_CREATED=0

[[ "$RESTORE_DATABASE" =~ ^adicom99_restore_[A-Za-z0-9_]+$ ]] || { echo "Nama database restore harus diawali adicom99_restore_" >&2; exit 1; }
[[ -f "$RESTIC_ENV_FILE" ]] || { echo "$RESTIC_ENV_FILE belum tersedia" >&2; exit 1; }
[[ -f "$MYSQL_RESTORE_CNF_FILE" ]] || { echo "$MYSQL_RESTORE_CNF_FILE belum tersedia" >&2; exit 1; }
cleanup() {
  rm -rf -- "$RESTORE_DIR"
  if [[ "$DATABASE_CREATED" -eq 1 ]]; then
    mysql --defaults-extra-file="$MYSQL_RESTORE_CNF_FILE" -e "DROP DATABASE IF EXISTS \`$RESTORE_DATABASE\`;" || true
  fi
}
trap cleanup EXIT

set -a
source "$RESTIC_ENV_FILE"
set +a

restic restore latest --tag adicom99 --target "$RESTORE_DIR"
dump_file="$(find "$RESTORE_DIR" -name mysql.sql.gz -type f | head -n 1)"
[[ -n "$dump_file" ]] || { echo "Dump MySQL tidak ditemukan dalam snapshot" >&2; exit 1; }
gzip -t "$dump_file"

mysql --defaults-extra-file="$MYSQL_RESTORE_CNF_FILE" -e "DROP DATABASE IF EXISTS \`$RESTORE_DATABASE\`; CREATE DATABASE \`$RESTORE_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
DATABASE_CREATED=1
gunzip -c "$dump_file" | mysql --defaults-extra-file="$MYSQL_RESTORE_CNF_FILE" "$RESTORE_DATABASE"
table_count="$(mysql --defaults-extra-file="$MYSQL_RESTORE_CNF_FILE" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$RESTORE_DATABASE';")"
[[ "$table_count" -gt 0 ]] || { echo "Database hasil restore tidak memiliki tabel" >&2; exit 1; }
echo "Restore terverifikasi: $table_count tabel berhasil dipulihkan"
