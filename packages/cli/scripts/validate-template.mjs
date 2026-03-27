import {
  mkdtempSync,
  rmSync,
  cpSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const packageDir = resolve(scriptDir, "..");
const repoRoot = resolve(packageDir, "..", "..");
const templateDir = join(packageDir, "template");
const localPackages = {
  "@astro-minimax/core": resolve(repoRoot, "packages/core"),
  "@astro-minimax/ai": resolve(repoRoot, "packages/ai"),
  "@astro-minimax/notify": resolve(repoRoot, "packages/notify"),
  "@astro-minimax/cli": resolve(repoRoot, "packages/cli"),
  "@astro-minimax/knowledge-model": resolve(
    repoRoot,
    "packages/knowledge-model"
  ),
};

if (!existsSync(templateDir)) {
  throw new Error(`Template directory not found: ${templateDir}`);
}

const tempRoot = mkdtempSync(join(tmpdir(), "astro-minimax-template-"));
const tempPackagesDir = join(tempRoot, "packages");
const tempTemplateDir = join(tempRoot, "template");

try {
  writeWorkspaceRootFiles();
  mkdirSync(tempPackagesDir, { recursive: true });
  copyLocalPackages(tempPackagesDir);
  cpSync(templateDir, tempTemplateDir, { recursive: true });
  rewritePackageDependencies(tempTemplateDir, true);
  run("pnpm", ["install", "--ignore-scripts"], tempRoot, repoRoot);
  run(
    "pnpm",
    ["--dir", tempRoot, "--filter", "@astro-minimax/knowledge-model", "build"],
    tempRoot,
    repoRoot
  );
  run(
    "pnpm",
    ["--dir", tempRoot, "--filter", "@astro-minimax/notify", "build"],
    tempRoot,
    repoRoot
  );
  run("pnpm", ["install", "--ignore-scripts"], tempRoot, repoRoot);
  run(
    "pnpm",
    ["--dir", tempRoot, "--filter", "@astro-minimax/ai", "build"],
    tempRoot,
    repoRoot
  );
  run(
    "pnpm",
    ["--dir", tempRoot, "--filter", "@astro-minimax/cli", "build"],
    tempRoot,
    repoRoot
  );
  run("pnpm", ["install", "--ignore-scripts"], tempRoot, repoRoot);
  run("pnpm", ["exec", "astro", "check"], tempTemplateDir, repoRoot);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function writeWorkspaceRootFiles() {
  writeFileSync(
    join(tempRoot, "package.json"),
    `${JSON.stringify({ private: true, name: "astro-minimax-template-validation" }, null, 2)}\n`
  );
  writeFileSync(
    join(tempRoot, "pnpm-workspace.yaml"),
    'packages:\n  - "packages/*"\n  - "template"\n'
  );
}

function copyLocalPackages(tempPackagesRoot) {
  for (const [pkgName, sourceDir] of Object.entries(localPackages)) {
    const targetDir = join(tempPackagesRoot, pkgName.split("/")[1]);
    cpSync(sourceDir, targetDir, {
      recursive: true,
      filter: source => !source.includes(`${sourceDir}/node_modules`),
    });
    rewritePackageDependencies(targetDir, false);
  }
}

function rewritePackageDependencies(packagePath, includeTemplateOnly) {
  const packageJsonPath = join(packagePath, "package.json");
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  for (const field of ["dependencies", "devDependencies"]) {
    if (!pkg[field]) continue;
    for (const [name] of Object.entries(localPackages)) {
      if (!pkg[field][name]) continue;

      if (includeTemplateOnly || pkg[field][name] === "workspace:*") {
        pkg[field][name] = "workspace:*";
      }
    }
  }

  if (includeTemplateOnly && pkg.devDependencies?.["@astro-minimax/cli"]) {
    delete pkg.devDependencies["@astro-minimax/cli"];
  }

  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function run(command, args, cwd, repoDir) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      INIT_CWD: repoDir,
    },
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}`);
  }
}
