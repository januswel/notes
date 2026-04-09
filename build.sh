#!/bin/sh
set -e

cd tools/og-image-gen
npm clean-install
npm run generate
cd ../..

zola build
