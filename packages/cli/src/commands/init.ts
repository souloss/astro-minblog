import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL("..", import.meta.url));
const templateDir = join(__dirname, "..", "template");
const pwaDir = join(__dirname, "..", "template-pwa");
const packageRootDir = join(__dirname, "..");
const repoRootDir = join(packageRootDir, "..", "..");
const localPackagesDirName = ".astro-minimax-local-packages";
const localFontsDir = join(repoRootDir, "apps", "blog", "public", "fonts");
const localPackageBuildOrder = [
  "@astro-minimax/knowledge-model",
  "@astro-minimax/notify",
  "@astro-minimax/ai",
  "@astro-minimax/cli",
] as const;
const localWorkspacePackages = {
  "@astro-minimax/core": join(repoRootDir, "packages", "core"),
  "@astro-minimax/ai": join(repoRootDir, "packages", "ai"),
  "@astro-minimax/notify": join(repoRootDir, "packages", "notify"),
  "@astro-minimax/cli": join(repoRootDir, "packages", "cli"),
  "@astro-minimax/knowledge-model": join(repoRootDir, "packages", "knowledge-model"),
} as const;

export function initCommand(args: string[]): void {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Create a new astro-minimax blog project

Usage:
  astro-minimax init <project-name> [options]

Arguments:
  <project-name>    Directory name for the new blog

Options:
  --pwa             Include PWA support (service worker, manifest.json)
  --local-packages  Use local workspace packages instead of registry versions

Description:
  Creates a new blog with all necessary configuration files,
  AI-powered features, and a clean structure ready for content.

Examples:
  astro-minimax init my-blog
  astro-minimax init my-blog --pwa
  astro-minimax init my-blog --local-packages
  astro-minimax init ./blogs/tech-blog
`);
    return;
  }

  const enablePwa = args.includes("--pwa");
  const useLocalPackages = args.includes("--local-packages");
  const projectName = args.find(a => !a.startsWith("--"))!;
  const targetDir = resolve(process.cwd(), projectName);

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true });

  if (enablePwa && existsSync(pwaDir)) {
    cpSync(pwaDir, targetDir, { recursive: true });
    console.log("  📦 PWA support enabled (sw.js + manifest.json)\n");
  }

  const pkgPath = join(targetDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.name = basename(targetDir);

  if (useLocalPackages) {
    buildLocalWorkspacePackages();
    setupLocalWorkspacePackages(pkg, targetDir);
    copyLocalPackageAssets(targetDir);
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`\n  ✅ Created "${projectName}" successfully!\n`);
  console.log("  Getting started:\n");
  console.log(`    cd ${projectName}`);
  console.log("    pnpm install");
  console.log("    pnpm dev\n");
  console.log("  CLI commands:\n");
  console.log("    astro-minimax post new <title>    Create a new post");
  console.log("    astro-minimax ai process          Process with AI");
  console.log("    astro-minimax ai profile build    Build author profile\n");
  console.log("  Documentation: https://github.com/souloss/astro-minimax\n");
}

function setupLocalWorkspacePackages(
  pkg: Record<string, unknown>,
  targetDir: string
): void {
  const localPackagesDir = join(targetDir, localPackagesDirName);
  mkdirSync(localPackagesDir, { recursive: true });

  for (const [packageName, packagePath] of Object.entries(localWorkspacePackages)) {
    validateLocalPackage(packageName, packagePath);

    const vendoredPackageDir = getVendoredPackageDir(targetDir, packageName);
    cpSync(packagePath, vendoredPackageDir, {
      recursive: true,
      filter: source => !source.includes(`${packagePath}/node_modules`),
    });

    rewriteVendoredPackageDependencies(vendoredPackageDir, targetDir);
  }

  for (const field of ["dependencies", "devDependencies"] as const) {
    const dependencies = pkg[field];
    if (!isDependencyMap(dependencies)) {
      continue;
    }

    for (const [packageName, packagePath] of Object.entries(localWorkspacePackages)) {
      if (!dependencies[packageName]) {
        continue;
      }

      validateLocalPackage(packageName, packagePath);
      dependencies[packageName] = toFileDependency(
        getVendoredPackageDir(targetDir, packageName),
        targetDir
      );
    }
  }
}

function rewriteVendoredPackageDependencies(
  packageDir: string,
  targetDir: string
): void {
  const packageJsonPath = join(packageDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Vendored package.json not found: ${packageJsonPath}`);
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as Record<string, unknown>;

  for (const field of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
    const dependencies = pkg[field];
    if (!isDependencyMap(dependencies)) {
      continue;
    }

    for (const packageName of Object.keys(localWorkspacePackages)) {
      if (!dependencies[packageName]) {
        continue;
      }

      dependencies[packageName] = toFileDependency(
        getVendoredPackageDir(targetDir, packageName),
        packageDir
      );
    }
  }

  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
}

function getVendoredPackageDir(targetDir: string, packageName: string): string {
  return join(targetDir, localPackagesDirName, packageName.split("/")[1]);
}

function validateLocalPackage(packageName: string, packagePath: string): void {
  if (!existsSync(packagePath)) {
    throw new Error(`Local package not found for ${packageName}: ${packagePath}`);
  }
}

function copyLocalPackageAssets(targetDir: string): void {
  if (!existsSync(localFontsDir)) {
    throw new Error(`Local fonts directory not found: ${localFontsDir}`);
  }

  cpSync(localFontsDir, join(targetDir, "public", "fonts"), {
    recursive: true,
  });
}

function buildLocalWorkspacePackages(): void {
  for (const packageName of localPackageBuildOrder) {
    const result = spawnSync(
      "pnpm",
      ["--dir", repoRootDir, "--filter", packageName, "build"],
      {
        stdio: "inherit",
      }
    );

    if (result.status !== 0) {
      throw new Error(`Failed to build local package: ${packageName}`);
    }
  }
}

function isDependencyMap(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null;
}

function toFileDependency(packagePath: string, targetDir: string): string {
  const relativePath = relative(targetDir, packagePath).replaceAll("\\", "/");
  return `file:${relativePath}`;
}
