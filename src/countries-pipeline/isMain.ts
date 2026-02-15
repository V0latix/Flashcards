import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Works for both `node file.ts` and runners like `tsx file.ts` where the script
// path may appear at argv[1] or argv[2].
export function isMainModule(importMetaUrl: string): boolean {
  for (const arg of process.argv.slice(1)) {
    if (!arg || arg.startsWith('-')) continue
    try {
      const href = pathToFileURL(resolve(arg)).href
      if (href === importMetaUrl) return true
    } catch {
      // ignore
    }
  }
  return false
}

