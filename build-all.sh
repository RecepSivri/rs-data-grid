#!/usr/bin/env bash
# Builds every app in this repo for production, then consolidates all 5
# micro-frontend bundles INTO root-config's own dist/ folder, under dist/mfe/<name>/.
# The result -- rs-data-grid-root-config/dist/ -- is a single, self-contained,
# ready-to-upload folder: the shell's index.html plus every framework's bundle,
# all served same-origin so nothing needs separate hosting. Stops on first failure.
#
# Usage:
#   ./build-all.sh
#
# After this succeeds, run ./serve-all.sh to preview that one folder locally
# on a single port, exactly as it will behave once deployed.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

# Fresh checkouts (a CI/host like Netlify, or a new machine) have no
# node_modules anywhere. Installing only when missing keeps repeated local
# runs fast while still making this script self-sufficient as a CI build
# command -- `npm ci` uses each project's committed package-lock.json.
ensure_deps() {
  if [ ! -d "$1/node_modules" ]; then
    echo "  installing dependencies in $1..."
    (cd "$1" && npm ci)
  fi
}

step "root-config (shell) -- vite build -> dist/"
ensure_deps rs-data-grid-root-config
(cd rs-data-grid-root-config && npm run build)

step "rs-data-grid-react -- single-spa bundle -> dist-single-spa/rs-data-grid-react.js"
ensure_deps rs-data-grid-react
(cd rs-data-grid-react && npm run build:single-spa)

step "rs-data-grid-angular -- single-spa bundle -> dist/rsivri-data-grid/main.js"
ensure_deps rs-data-grid-angular
# Unlike the other 4 apps, the rsivri-data-grid app depends on rs-grid-angular
# as an ordinary registry package (^0.1.0), resolved by npm ci from whatever
# is actually published -- there's no Vite-style self-reference trick for
# Angular libraries. So on a clean CI install (Netlify) it always gets the
# last-published rs-grid-angular, which silently drifts behind this repo's
# own in-progress library source. Building the library fresh from source and
# overwriting node_modules/rs-grid-angular with that output, every time,
# keeps the app compiling against what's actually in this repo -- no publish
# required. (.angular is cleared first: its incremental cache can otherwise
# serve a stale compiled library even after a fresh source build.)
(
  cd rs-data-grid-angular
  rm -rf .angular
  npx ng build rs-grid-angular
  rm -rf node_modules/rs-grid-angular
  mkdir -p node_modules/rs-grid-angular
  cp -R dist/rs-grid-angular/. node_modules/rs-grid-angular/
  npm run build:single-spa:rsivri-data-grid
)

step "rs-data-grid-vue -- single-spa bundle -> dist-single-spa/rs-data-grid-vue.js"
ensure_deps rs-data-grid-vue
(cd rs-data-grid-vue && npm run build:single-spa)

step "rs-data-grid-vanilla -- single-spa bundle -> dist-single-spa/rs-data-grid-vanilla.js"
ensure_deps rs-data-grid-vanilla
(cd rs-data-grid-vanilla && npm run build:single-spa)

step "rs-data-grid-jquery -- single-spa bundle -> dist-single-spa/rs-data-grid-jquery.js"
ensure_deps rs-data-grid-jquery
(cd rs-data-grid-jquery && npm run build:single-spa)

step "Consolidating all 5 bundles into rs-data-grid-root-config/dist/mfe/ (single deploy package)"
PKG_DIR="rs-data-grid-root-config/dist"
rm -rf "$PKG_DIR/mfe"
mkdir -p "$PKG_DIR/mfe/react" "$PKG_DIR/mfe/angular" "$PKG_DIR/mfe/vue" "$PKG_DIR/mfe/vanilla" "$PKG_DIR/mfe/jquery"
cp -R rs-data-grid-react/dist-single-spa/. "$PKG_DIR/mfe/react/"
cp -R rs-data-grid-angular/dist/rsivri-data-grid/. "$PKG_DIR/mfe/angular/"
cp -R rs-data-grid-vue/dist-single-spa/. "$PKG_DIR/mfe/vue/"
cp -R rs-data-grid-vanilla/dist-single-spa/. "$PKG_DIR/mfe/vanilla/"
cp -R rs-data-grid-jquery/dist-single-spa/. "$PKG_DIR/mfe/jquery/"

printf '\n\033[1;32mAll 6 builds succeeded and were consolidated into one package.\033[0m\n'
printf 'Deploy-ready folder: %s\n' "$PKG_DIR"
printf 'Next: ./serve-all.sh to preview that one folder locally on a single port.\n\n'

printf 'Package contents:\n'
find "$PKG_DIR" -maxdepth 2 -mindepth 1 | sort

printf '\nTotal package size:\n'
du -sh "$PKG_DIR" 2>/dev/null
