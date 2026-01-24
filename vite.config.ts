import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      resolve(__dirname, 'src/test/setup.ts'),
      resolve(__dirname, 'src/test/setupTests.ts')
    ]
  }
})
