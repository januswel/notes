#!/bin/sh
set -e

cd tools/og-image-gen
npm install
npm run generate
cd ../..

zola build
