#!/usr/bin/env bash
# Azure App Service Linux post-deployment hook.
# Runs after Oryx builds Node and installs dependencies.
# Builds the design system CSS and self-hosts the JS vendor files.

set -euo pipefail

echo "[postdeploy] copying vendor assets..."
node scripts/copy-vendor.js

echo "[postdeploy] building CSS..."
node scripts/build-css.js

echo "[postdeploy] done."
