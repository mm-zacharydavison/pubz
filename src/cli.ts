#!/usr/bin/env node

import { discoverPackages, sortByDependencyOrder } from './discovery.js';
import { closePrompt, confirm, prompt, select } from './prompts.js';
import {
  createGitTag,
  publishPackage,
  pushGitTag,
  runBuild,
  verifyBuild,
} from './publish.js';
import type { PublishOptions, VersionBumpType } from './types.js';
import {
  bumpVersion,
  previewBump,
  updateLocalDependencyVersions,
  updatePackageVersion,
} from './version.js';

const REGISTRIES = {
  npm: 'https://registry.npmjs.org',
  github: 'https://npm.pkg.github.com',
} as const;

function printUsage() {
  console.log(`
pubz - Interactive npm package publisher

Usage: pubz [options]

Options:
  --dry-run              Show what would be published without actually publishing
  --registry <url>       Specify npm registry URL (default: public npm)
  --otp <code>           One-time password for 2FA
  --skip-build           Skip the build step
  --yes, -y              Skip confirmation prompts (use defaults)
  -h, --help             Show this help message

Examples:
  pubz                                           # Interactive publish
  pubz --dry-run                                 # Preview what would happen
  pubz --registry https://npm.pkg.github.com    # Publish to GitHub Packages
`);
}

function parseArgs(args: string[]): PublishOptions & { help: boolean } {
  const options: PublishOptions & { help: boolean } = {
    dryRun: false,
    registry: '',
    otp: '',
    skipBuild: false,
    skipPrompts: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--registry':
        options.registry = args[++i] || '';
        break;
      case '--otp':
        options.otp = args[++i] || '';
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--yes':
      case '-y':
        options.skipPrompts = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const cwd = process.cwd();

  if (options.dryRun) {
    console.log('DRY RUN MODE - No actual changes will be made');
    console.log('');
  }

  console.log('pubz - npm package publisher');
  console.log('=============================');
  console.log('');

  // Discover packages
  console.log('Discovering packages...');
  console.log('');

  let packages = await discoverPackages(cwd);

  // Filter out private packages
  const publishablePackages = packages.filter((p) => !p.isPrivate);

  if (publishablePackages.length === 0) {
    console.log('No publishable packages found.');
    console.log('');
    console.log('Make sure your packages:');
    console.log('  - Have a package.json with a "name" field');
    console.log('  - Do not have "private": true');
    console.log('');
    process.exit(1);
  }

  // Sort by dependency order
  packages = sortByDependencyOrder(publishablePackages);

  console.log(`Found ${packages.length} publishable package(s):`);
  console.log('');
  for (const pkg of packages) {
    const deps =
      pkg.localDependencies.length > 0
        ? ` (depends on: ${pkg.localDependencies.join(', ')})`
        : '';
    console.log(`  - ${pkg.name}@${pkg.version}${deps}`);
  }
  console.log('');

  // Get current version (use first package as source of truth)
  const currentVersion = packages[0].version;

  // Step 1: Version Management
  console.log('Step 1: Version Management');
  console.log('--------------------------');
  console.log('');
  console.log(`Current version: ${currentVersion}`);
  console.log('');

  let newVersion = currentVersion;

  if (!options.skipPrompts) {
    const shouldBump = await confirm('Bump version before publishing?');

    if (shouldBump) {
      const bumpType = await select<VersionBumpType>(
        'Select version bump type:',
        [
          {
            label: `patch (${previewBump(currentVersion, 'patch')})`,
            value: 'patch',
          },
          {
            label: `minor (${previewBump(currentVersion, 'minor')})`,
            value: 'minor',
          },
          {
            label: `major (${previewBump(currentVersion, 'major')})`,
            value: 'major',
          },
        ],
      );

      newVersion = bumpVersion(currentVersion, bumpType);

      console.log('');
      console.log(`Updating version to ${newVersion} in all packages...`);
      console.log('');

      for (const pkg of packages) {
        await updatePackageVersion(pkg, newVersion, options.dryRun);
      }

      // Update local dependency versions
      await updateLocalDependencyVersions(packages, newVersion, options.dryRun);

      // Update in-memory versions
      for (const pkg of packages) {
        pkg.version = newVersion;
      }

      console.log('');
    }
  }

  // Step 2: Registry Selection
  let registry = options.registry;

  if (!registry && !options.skipPrompts) {
    registry = await select('Select publish target:', [
      {
        label: 'Public npm registry (https://registry.npmjs.org)',
        value: REGISTRIES.npm,
      },
      {
        label: 'GitHub Packages (https://npm.pkg.github.com)',
        value: REGISTRIES.github,
      },
    ]);
  }

  registry = registry || REGISTRIES.npm;

  console.log('');
  console.log(`Publishing to: ${registry}`);
  console.log('');

  // Step 3: Build
  if (!options.skipBuild) {
    console.log('Step 2: Building Packages');
    console.log('-------------------------');
    console.log('');

    const buildResult = await runBuild(cwd, options.dryRun);
    if (!buildResult.success) {
      console.error(`Build failed: ${buildResult.error}`);
      closePrompt();
      process.exit(1);
    }

    console.log('');
    console.log('Verifying builds...');
    console.log('');

    let allBuildsVerified = true;
    for (const pkg of packages) {
      const result = await verifyBuild(pkg);
      if (result.success) {
        console.log(`  ${pkg.name} build verified`);
      } else {
        console.error(`  ${pkg.name}: ${result.error}`);
        allBuildsVerified = false;
      }
    }

    console.log('');

    if (!allBuildsVerified) {
      console.error(
        'Build verification failed. Please fix the issues and try again.',
      );
      closePrompt();
      process.exit(1);
    }
  }

  // Step 4: Publish
  console.log('Step 3: Publishing to npm');
  console.log('-------------------------');
  console.log('');

  if (options.dryRun) {
    console.log(
      `[DRY RUN] Would publish the following packages to ${registry}:`,
    );
    console.log('');
    for (const pkg of packages) {
      console.log(`  ${pkg.name}@${newVersion}`);
    }
    console.log('');
    console.log('Run without --dry-run to actually publish.');
  } else {
    console.log('About to publish the following packages:');
    console.log('');
    for (const pkg of packages) {
      console.log(`  ${pkg.name}@${newVersion}`);
    }
    console.log('');
    console.log(`Registry: ${registry}`);
    console.log('');

    if (!options.skipPrompts) {
      const shouldContinue = await confirm('Continue?');
      if (!shouldContinue) {
        console.log('Publish cancelled.');
        closePrompt();
        process.exit(0);
      }
    }

    console.log('');
    console.log('Publishing packages...');
    console.log('');

    for (const pkg of packages) {
      const result = await publishPackage(pkg, registry, options.otp, options.dryRun);
      if (!result.success) {
        console.error(`Failed to publish ${pkg.name}: ${result.error}`);
        console.log('');
        console.log('Stopping publish process.');
        closePrompt();
        process.exit(1);
      }
    }
  }

  console.log('');
  console.log('==================================');
  console.log('Publishing complete!');
  console.log('');
  console.log(`Published version: ${newVersion}`);
  console.log('');

  // Step 5: Git tagging
  if (!options.dryRun && !options.skipPrompts) {
    const shouldTag = await confirm(`Create a git tag for v${newVersion}?`);

    if (shouldTag) {
      console.log('');
      const tagResult = await createGitTag(newVersion, cwd, options.dryRun);

      if (tagResult.success) {
        const shouldPush = await confirm('Push tag to origin?');
        if (shouldPush) {
          await pushGitTag(newVersion, cwd, options.dryRun);
        } else {
          console.log(
            `Tag created locally. Push manually with: git push origin v${newVersion}`,
          );
        }
      } else {
        console.error(tagResult.error);
      }
      console.log('');
    }
  }

  console.log('Done!');
  closePrompt();
}

main().catch((error) => {
  console.error('Error:', error.message);
  closePrompt();
  process.exit(1);
});
