import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

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

