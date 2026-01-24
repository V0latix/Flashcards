#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "/tmp/vitest-config.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat > "$TMP_DIR/vitest.config.mjs" <<EOF
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire('${ROOT_DIR}/package.json')
const { defineConfig } = require('vitest/config')

export default defineConfig({
  root: '${ROOT_DIR}',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      resolve('${ROOT_DIR}', 'src/test/setup.ts'),
      resolve('${ROOT_DIR}', 'src/test/setupTests.ts')
    ]
  }
})
EOF

if [[ "$MODE" == "ui" ]]; then
  vitest --ui --config "$TMP_DIR/vitest.config.mjs"
elif [[ "$MODE" == "watch" ]]; then
  vitest --config "$TMP_DIR/vitest.config.mjs"
else
  vitest run --config "$TMP_DIR/vitest.config.mjs"
fi
