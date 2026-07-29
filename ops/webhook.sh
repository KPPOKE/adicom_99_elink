#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/adicom99-deploy}"
SOURCE_DIR="${SOURCE_DIR:-$DEPLOY_ROOT/source}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-deploy}"

NPM_FILE="$(find /www/server/nvm/versions/node /www/server/nodejs -name npm \( -type f -o -type l \) 2>/dev/null | sort -V | tail -n 1)"
if [[ -z "$NPM_FILE" ]]; then
  echo "npm tidak ditemukan" >&2
  exit 1
fi
export PATH="$PATH:/usr/local/bin:$(dirname "$NPM_FILE")"

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  echo "Source deployment tidak ditemukan: $SOURCE_DIR" >&2
  exit 1
fi

git -C "$SOURCE_DIR" fetch origin "$DEPLOY_BRANCH"
git -C "$SOURCE_DIR" reset --hard "origin/$DEPLOY_BRANCH"
exec bash "$SOURCE_DIR/ops/deploy.sh"
