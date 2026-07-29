#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/adicom99-deploy}"
SOURCE_DIR="${SOURCE_DIR:-$DEPLOY_ROOT/source}"
SHARED_DIR="${SHARED_DIR:-$DEPLOY_ROOT/shared}"
CURRENT_LINK="${CURRENT_LINK:-/www/wwwroot/adicom99}"

[[ -d "$CURRENT_LINK/.git" && ! -L "$CURRENT_LINK" ]] || { echo "Direktori aplikasi lama tidak ditemukan atau bootstrap sudah dijalankan" >&2; exit 1; }
for command in git rsync pm2; do
  command -v "$command" >/dev/null || { echo "$command tidak ditemukan" >&2; exit 1; }
done

mkdir -p "$DEPLOY_ROOT" "$SHARED_DIR/uploads"
if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  origin="$(git -C "$CURRENT_LINK" remote get-url origin)"
  git clone "$origin" "$SOURCE_DIR"
fi

git -C "$SOURCE_DIR" fetch origin main
git -C "$SOURCE_DIR" reset --hard origin/main

if [[ ! -f "$SHARED_DIR/.env" ]]; then
  cp "$CURRENT_LINK/.env" "$SHARED_DIR/.env"
  chmod 600 "$SHARED_DIR/.env"
fi
if ! grep -q '^BACKUP_STATUS_FILE=' "$SHARED_DIR/.env"; then
  printf '\nBACKUP_STATUS_FILE="%s/backup-status"\n' "$SHARED_DIR" >> "$SHARED_DIR/.env"
fi
rsync -a "$CURRENT_LINK/public/uploads/" "$SHARED_DIR/uploads/"

DEPLOY_BRANCH=main bash "$SOURCE_DIR/ops/deploy.sh"
echo "Bootstrap selesai. Ganti webhook dengan: bash $SOURCE_DIR/ops/webhook.sh"
