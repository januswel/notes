#!/bin/sh
set -e

cd tools/embed-gen
npm clean-install
npm run fetch
cd ../..

cd tools/og-image-gen
npm clean-install
npm run generate
cd ../..

zola build
