import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiscoveredPackage } from './types.js';

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
  const distPath = join(pkg.path, 'dist');

  try {
    await stat(distPath);
  } catch {
    return { success: false, error: `Build output not found at ${distPath}` };
  }

  // Check for index.js
  try {
    await stat(join(distPath, 'index.js'));
  } catch {
    return { success: false, error: `Missing dist/index.js in ${pkg.name}` };
  }

  // Check for index.d.ts (optional, just warn)
  try {
    await stat(join(distPath, 'index.d.ts'));
  } catch {
    console.log(`  Warning: ${pkg.name} missing dist/index.d.ts`);
  }

  return { success: true };
}

export async function publishPackage(
  pkg: DiscoveredPackage,
  registry: string,
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
