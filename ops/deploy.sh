#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-adicom99}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/www/adicom99-deploy}"
SOURCE_DIR="${SOURCE_DIR:-$DEPLOY_ROOT/source}"
RELEASES_DIR="${RELEASES_DIR:-$DEPLOY_ROOT/releases}"
SHARED_DIR="${SHARED_DIR:-$DEPLOY_ROOT/shared}"
CURRENT_LINK="${CURRENT_LINK:-/www/wwwroot/adicom99}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-deploy}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
LOCK_FILE="$DEPLOY_ROOT/deploy.lock"

mkdir -p "$DEPLOY_ROOT" "$RELEASES_DIR" "$SHARED_DIR/uploads"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Deployment lain masih berjalan" >&2; exit 1; }

for command in git npm npx pm2 curl tar flock; do
  command -v "$command" >/dev/null || { echo "$command tidak ditemukan" >&2; exit 1; }
done
[[ -f "$SHARED_DIR/.env" ]] || { echo "$SHARED_DIR/.env belum tersedia" >&2; exit 1; }
[[ -d "$SOURCE_DIR/.git" ]] || { echo "$SOURCE_DIR bukan repository Git" >&2; exit 1; }

git -C "$SOURCE_DIR" fetch origin "$DEPLOY_BRANCH"
SHA="$(git -C "$SOURCE_DIR" rev-parse "origin/$DEPLOY_BRANCH")"
RELEASE="$RELEASES_DIR/$SHA"
CURRENT_SHA="$(readlink -f "$CURRENT_LINK" 2>/dev/null | xargs basename 2>/dev/null || true)"

if [[ "$CURRENT_SHA" == "$SHA" ]]; then
  APP_VERSION="$SHA" pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --only "$APP_NAME" --update-env
  for _ in $(seq 1 30); do
    if curl --fail --silent "$HEALTH_URL" | grep -q "\"version\":\"$SHA\""; then
      echo "Release $SHA sudah aktif dan sehat"
      exit 0
    fi
    sleep 2
  done
  echo "Release aktif gagal health check" >&2
  exit 1
fi

[[ "$RELEASE" == "$RELEASES_DIR/"* ]] || { echo "Path release tidak aman" >&2; exit 1; }
rm -rf -- "$RELEASE"
mkdir -p "$RELEASE"
git -C "$SOURCE_DIR" archive "$SHA" | tar -x -C "$RELEASE"
ln -s "$SHARED_DIR/.env" "$RELEASE/.env"
rm -rf -- "$RELEASE/public/uploads"
ln -s "$SHARED_DIR/uploads" "$RELEASE/public/uploads"

cd "$RELEASE"
npm ci --include=dev
npm run build
npx prisma migrate deploy
npm prune --omit=dev

PREVIOUS_TARGET=""
LEGACY_DIR=""
SWITCHED=0

rollback() {
  local status=$?
  trap - ERR
  echo "Deployment gagal, mengembalikan release sebelumnya" >&2
  if [[ "$SWITCHED" -eq 1 ]]; then
    if [[ -n "$PREVIOUS_TARGET" ]]; then
      ln -sfn "$PREVIOUS_TARGET" "${CURRENT_LINK}.rollback"
      mv -Tf "${CURRENT_LINK}.rollback" "$CURRENT_LINK"
      APP_VERSION="$(basename "$PREVIOUS_TARGET")" pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --only "$APP_NAME" --update-env || true
    elif [[ -n "$LEGACY_DIR" && -d "$LEGACY_DIR" ]]; then
      rm -f "$CURRENT_LINK"
      mv "$LEGACY_DIR" "$CURRENT_LINK"
      pm2 restart "$APP_NAME" || true
    fi
  fi
  rm -rf -- "$RELEASE"
  exit "$status"
}
trap rollback ERR

ln -sfn "$RELEASE" "${CURRENT_LINK}.next"
if [[ -d "$CURRENT_LINK" && ! -L "$CURRENT_LINK" ]]; then
  LEGACY_DIR="$DEPLOY_ROOT/legacy-$(date -u +%Y%m%d%H%M%S)"
  command -v rsync >/dev/null || { echo "rsync tidak ditemukan" >&2; false; }
  pm2 stop "$APP_NAME" || true
  rsync -a "$CURRENT_LINK/public/uploads/" "$SHARED_DIR/uploads/"
  mv "$CURRENT_LINK" "$LEGACY_DIR"
else
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
fi
mv -Tf "${CURRENT_LINK}.next" "$CURRENT_LINK"
SWITCHED=1

APP_VERSION="$SHA" pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --only "$APP_NAME" --update-env

healthy=0
for _ in $(seq 1 30); do
  if curl --fail --silent "$HEALTH_URL" | grep -q "\"version\":\"$SHA\""; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "$healthy" -eq 1 ]] || { echo "Health check release $SHA gagal" >&2; false; }

trap - ERR
mapfile -t old_releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | awk '{print $2}')
for ((i=KEEP_RELEASES; i<${#old_releases[@]}; i++)); do
  [[ "${old_releases[$i]}" == "$RELEASES_DIR/"* ]] && rm -rf -- "${old_releases[$i]}"
done

echo "Deployment $SHA selesai dan sehat"
