#!/bin/sh
set -e

if [ -n "$CI" ]; then
  ZOLA_VERSION="${ZOLA_VERSION:-0.20.0}"
  curl -sL "https://github.com/getzola/zola/releases/download/v${ZOLA_VERSION}/zola-v${ZOLA_VERSION}-x86_64-unknown-linux-gnu.tar.gz" | tar xz
  export PATH="$PWD:$PATH"
fi

cd tools/embed-gen
npm clean-install
npm run fetch
cd ../..

cd tools/og-image-gen
npm clean-install
npm run generate
cd ../..

zola build
