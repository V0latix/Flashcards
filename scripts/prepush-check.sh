#!/usr/bin/env bash
set -euo pipefail

echo "Running pre-push checks..."
npm run check
