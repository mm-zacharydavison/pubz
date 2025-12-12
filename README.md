# `pubz`

```bash
bunx pubz
```

`pubz` publishes multiple packages in one command, with some useful steps:

1. Prompts you to bump version number of packages.
2. Prompts you for where you want to publish (e.g. `npm` or private registry).
3. Prompts you to create a `git tag` and push it.

# Example

```bash
bunx pubz
```

```bash
pubz - npm package publisher
=============================

Discovering packages...

Found 1 publishable package(s):

  - pubz@0.1.0

Step 1: Version Management
--------------------------

Current version: 0.1.0

Bump version before publishing? [y/N] n
Select publish target:

  > 1) Public npm registry (https://registry.npmjs.org)
    2) GitHub Packages (https://npm.pkg.github.com)

Enter choice [1-2] (default: 1): 1

Publishing to: https://registry.npmjs.org

Step 2: Building Packages
-------------------------

Running build...

$ bun build src/cli.ts --outdir dist --target node
Bundled 6 modules in 4ms

  cli.js  20.0 KB  (entry point)


Build completed successfully

Verifying builds...

  pubz build verified

Step 3: Publishing to npm
-------------------------

About to publish the following packages:

  pubz@0.1.0

Registry: https://registry.npmjs.org

Continue? [y/N] y

Publishing packages...

Publishing pubz@0.1.0...
bun publish v1.3.2 (b131639c)

packed 0.70KB package.json
packed 322B README.md
packed 20.0KB dist/cli.js

Total files: 3
Shasum: 0494617a65c8a92d8a2c43d115dea0f94919102f
Integrity: sha512-KLEM/H7EOadzz[...]c1up2JcHW9gcQ==
Unpacked size: 21.1KB
Packed size: 5.73KB
Tag: latest
Access: public
Registry: https://registry.npmjs.org

 + pubz@0.1.0
  pubz published successfully

==================================
Publishing complete!

Published version: 0.1.0

Create a git tag for v0.1.0? [y/N] y

A  .npmrc
M  README.md
M  package.json
M  src/cli.ts
M  src/publish.ts
M  src/types.ts
Uncommitted changes detected. Committing...
error: pathspec 'release' did not match any file(s) known to git
error: pathspec 'v0.1.0' did not match any file(s) known to git
  Changes committed
  Tag v0.1.0 created
Push tag to origin? [y/N] y
fatal: 'origin' does not appear to be a git repository
fatal: Could not read from remote repository.

Please make sure you have the correct access rights
and the repository exists.

Done!
```