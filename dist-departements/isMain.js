import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export function isMainModule(importMetaUrl) {
    const thisPath = resolve(fileURLToPath(importMetaUrl));
    const arg1 = process.argv[1];
    if (!arg1)
        return false;
    const entryPath = resolve(arg1);
    return thisPath === entryPath;
}
