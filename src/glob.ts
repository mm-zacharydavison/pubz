import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function glob(pattern: string, cwd: string): Promise<string[]> {
  // Simple glob implementation for workspace patterns
  // Supports: packages/*, packages/**, src/*
  const results: string[] = [];

  // Remove trailing /* or /**
  const basePattern = pattern.replace(/\/\*\*?$/, '');
  const isRecursive = pattern.endsWith('/**');

  const basePath = join(cwd, basePattern);

  try {
    const entries = await readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entryPath = join(basePattern, entry.name);
        const fullPath = join(cwd, entryPath);

        // Check if this directory has a package.json
        try {
          await stat(join(fullPath, 'package.json'));
          results.push(entryPath);
        } catch {
          // No package.json, skip unless recursive
          if (isRecursive) {
            const subResults = await glob(`${entryPath}/*`, cwd);
            results.push(...subResults);
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return results;
}
