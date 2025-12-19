# `pubz`

```bash
bunx pubz
```

`pubz` publishes multiple packages in one command, with some useful steps:

1. Discovers all publishable packages (supports monorepos)
2. Sorts packages by dependency order
3. Prompts you to select which packages to publish
4. Prompts you to bump version number of packages
5. Updates inter-package dependency versions
6. Commits version changes
7. Prompts you for where you want to publish (e.g. `npm` or private registry)
8. Builds packages
9. Publishes to npm
10. Prompts you to create a `git tag` and push it

## Options

| Flag                   | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `--dry-run`            | Show what would be published without actually publishing                 |
| `--registry <url>`     | Specify npm registry URL (default: public npm)                           |
| `--otp <code>`         | One-time password for 2FA                                                |
| `--skip-build`         | Skip the build step                                                      |
| `--yes`, `-y`          | Skip yes/no confirmation prompts (still asks for choices)                |
| `--ci`                 | CI mode: skip all prompts, auto-accept everything (requires `--version`) |
| `--version <value>`    | Version bump type (`patch`, `minor`, `major`) or explicit version        |
| `-h`, `--help`         | Show help message                                                        |

## Examples

### Interactive publish

```bash
bunx pubz
```

### Preview changes (dry run)

```bash
bunx pubz --dry-run
```

### Quick publish with confirmations auto-accepted

```bash
bunx pubz --yes
```

### Publish to GitHub Packages

```bash
bunx pubz --registry https://npm.pkg.github.com
```

### CI mode with version bump

```bash
bunx pubz --ci --version patch
bunx pubz --ci --version minor
bunx pubz --ci --version major
```

### CI mode with explicit version

```bash
bunx pubz --ci --version 1.2.3
```

## GitHub Actions

Here's an example workflow for publishing with `pubz`, using an input selector for patch/minor/major version bump.

```yaml
name: Publish

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version bump type or explicit version'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install

      - name: Configure git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Configure npm
        run: echo "//registry.npmjs.org/:_authToken=${{ secrets.NPM_TOKEN }}" > ~/.npmrc

      - name: Publish
        run: bunx pubz --ci --version ${{ inputs.version }}

      - name: Push changes
        run: git push && git push --tags
```

## Example Output

```bash
bunx pubz
```

```
pubz - npm package publisher
══════════════════════════════

Discovering packages...

Found 1 publishable package(s):

  • pubz@0.2.2

Step 1: Version Management
──────────────────────────────

Current version: 0.2.2

? Bump version before publishing? [Y/n]
? Select version bump type:

  > 1) patch (0.2.2 -> 0.2.3)
    2) minor (0.2.2 -> 0.3.0)
    3) major (0.2.2 -> 1.0.0)

  Enter choice [1-3] (default: 1): 1

Updating version to 0.2.3 in all packages...

  Updated pubz: 0.2.2 -> 0.2.3
 M package.json
Committing version bump...
[main 945e1a3] chore: release v0.2.3
 1 file changed, 1 insertion(+), 1 deletion(-)
  Changes committed

? Select publish target:

  > 1) Public npm registry (https://registry.npmjs.org)
    2) GitHub Packages (https://npm.pkg.github.com)

  Enter choice [1-2] (default: 1):

Publishing to: https://registry.npmjs.org

Step 2: Building Packages
──────────────────────────────

Running build...

$ bun build src/cli.ts --outdir dist --target node
Bundled 7 modules in 7ms

  cli.js  28.65 KB  (entry point)


Build completed successfully

Verifying builds...

  ✓ pubz build verified

Step 3: Publishing to npm
──────────────────────────────

About to publish the following packages:

  • pubz@0.2.3

Registry: https://registry.npmjs.org

? Continue? [Y/n]

Publishing packages...

Publishing pubz@0.2.3...
bun publish v1.3.2 (b131639c)

packed 0.70KB package.json
packed 2.28KB README.md
packed 28.65KB dist/cli.js

Total files: 3
Shasum: b8cd25d62b05d5cd6a4ecc8ff6ef6e522e7b2aa5
Integrity: sha512-jihTMvUxMeXNX[...]2+gtHJexETkWA==
Unpacked size: 31.64KB
Packed size: 8.31KB
Tag: latest
Access: public
Registry: https://registry.npmjs.org

 + pubz@0.2.3
  pubz published successfully

══════════════════════════════
Publishing complete!

Published version: 0.2.3

? Create a git tag for v0.2.3? [Y/n]

  Tag v0.2.3 created
? Push tag to origin? [Y/n]
To github.com:mm-zacharydavison/pubz.git
 * [new tag]         v0.2.3 -> v0.2.3
  Tag v0.2.3 pushed to origin

Done!
```
