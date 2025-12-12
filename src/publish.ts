import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiscoveredPackage, PackageJson } from './types.js';

export interface BuildResult {
  success: boolean;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  error?: string;
}

function run(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';

    proc.stdout?.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    proc.stderr?.on('data', (data) => {
      output += data.toString();
      process.stderr.write(data);
    });

    proc.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

export async function runBuild(
  cwd: string,
  dryRun: boolean,
): Promise<BuildResult> {
  if (dryRun) {
    console.log('[DRY RUN] Would run: bun run build');
    return { success: true };
  }

  console.log('Running build...');
  console.log('');

  const result = await run('bun', ['run', 'build'], cwd);

  if (result.code !== 0) {
    return { success: false, error: 'Build failed' };
  }

  console.log('');
  console.log('Build completed successfully');
  return { success: true };
}

export async function verifyBuild(
  pkg: DiscoveredPackage,
): Promise<BuildResult> {
  const content = await readFile(pkg.packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content) as PackageJson & {
    main?: string;
    bin?: string | Record<string, string>;
    exports?: Record<string, unknown> | string;
  };

  // Collect files to verify from package.json
  const filesToCheck: string[] = [];

  // Check main entry
  if (packageJson.main) {
    filesToCheck.push(packageJson.main);
  }

  // Check bin entries
  if (packageJson.bin) {
    if (typeof packageJson.bin === 'string') {
      filesToCheck.push(packageJson.bin);
    } else {
      filesToCheck.push(...Object.values(packageJson.bin));
    }
  }

  // Check exports (simple case)
  if (packageJson.exports) {
    if (typeof packageJson.exports === 'string') {
      filesToCheck.push(packageJson.exports);
    } else if (typeof packageJson.exports['.'] === 'string') {
      filesToCheck.push(packageJson.exports['.'] as string);
    }
  }

  // Default to dist/index.js if nothing specified
  if (filesToCheck.length === 0) {
    filesToCheck.push('./dist/index.js');
  }

  // Verify each file exists
  for (const file of filesToCheck) {
    const filePath = join(pkg.path, file);
    try {
      await stat(filePath);
    } catch {
      return { success: false, error: `Missing ${file} in ${pkg.name}` };
    }
  }

  return { success: true };
}

export async function publishPackage(
  pkg: DiscoveredPackage,
  registry: string,
  otp: string,
  dryRun: boolean,
): Promise<PublishResult> {
  if (dryRun) {
    console.log(
      `  [DRY RUN] Would publish ${pkg.name}@${pkg.version} to ${registry}`,
    );
    return { success: true };
  }

  console.log(`Publishing ${pkg.name}@${pkg.version}...`);

  const args = ['publish', '--registry', registry, '--access', 'public'];
  if (otp) {
    args.push('--otp', otp);
  }
  const result = await run('bun', args, pkg.path);

  if (result.code !== 0) {
    return { success: false, error: `Failed to publish ${pkg.name}` };
  }

  console.log(`  ${pkg.name} published successfully`);
  return { success: true };
}

export async function createGitTag(
  version: string,
  cwd: string,
  dryRun: boolean,
): Promise<{ success: boolean; error?: string }> {
  const tagName = `v${version}`;

  if (dryRun) {
    console.log(`[DRY RUN] Would create git tag: ${tagName}`);
    return { success: true };
  }

  // Check for uncommitted changes
  const statusResult = await run('git', ['status', '--porcelain'], cwd);
  if (statusResult.output.trim()) {
    console.log('Uncommitted changes detected. Committing...');
    await run('git', ['add', '-A'], cwd);
    await run('git', ['commit', '-m', `chore: release ${tagName}`], cwd);
    console.log('  Changes committed');
  }

  // Create tag
  const tagResult = await run('git', ['tag', tagName], cwd);
  if (tagResult.code !== 0) {
    return {
      success: false,
      error: `Failed to create tag ${tagName} (may already exist)`,
    };
  }

  console.log(`  Tag ${tagName} created`);
  return { success: true };
}

export async function pushGitTag(
  version: string,
  cwd: string,
  dryRun: boolean,
): Promise<{ success: boolean; error?: string }> {
  const tagName = `v${version}`;

  if (dryRun) {
    console.log(`[DRY RUN] Would push git tag: ${tagName}`);
    return { success: true };
  }

  const result = await run('git', ['push', 'origin', tagName], cwd);
  if (result.code !== 0) {
    return { success: false, error: `Failed to push tag ${tagName}` };
  }

  console.log(`  Tag ${tagName} pushed to origin`);
  return { success: true };
}
