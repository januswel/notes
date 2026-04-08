#!/bin/sh
set -e

cd tools/og-image-gen
pnpm install
pnpm generate
cd ../..

zola build
