import { existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

interface ProjectContext {
  gitRoot: string;
  blogPath: string;
  blogPkgPath: string;
  installPath: string;
  installPkgPath: string;
  isMonorepo: boolean;
  relativeBlogPath: string;
}

function findGitRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(join(dir, ".git"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

function findBlogRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(join(dir, "src", "data", "blog"))) {
      return dir;
    }
    if (
      existsSync(join(dir, "pnpm-workspace.yaml")) &&
      existsSync(join(dir, "apps", "blog", "src", "data", "blog"))
    ) {
      return join(dir, "apps", "blog");
    }
    dir = dirname(dir);
  }
  return null;
}

function detectPackageManager(dir: string): "pnpm" | "npm" | "yarn" {
  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

function isMonorepo(dir: string): boolean {
  return (
    existsSync(join(dir, "pnpm-workspace.yaml")) ||
    existsSync(join(dir, "apps")) ||
    existsSync(join(dir, "packages"))
  );
}

function analyzeProject(): ProjectContext | null {
  const cwd = process.cwd();
  const gitRoot = findGitRoot(cwd);
  const blogRoot = findBlogRoot(cwd);

  if (!gitRoot) {
    return null;
  }

  if (!blogRoot) {
    return null;
  }

  const blogPath = join(blogRoot, "src", "data", "blog");
  const blogPkgPath = join(blogRoot, "package.json");
  const monorepo = isMonorepo(gitRoot);

  const installPath = monorepo ? gitRoot : blogRoot;
  const installPkgPath = join(installPath, "package.json");
  const relativeBlogPath = relative(installPath, blogPath);

  return {
    gitRoot,
    blogPath,
    blogPkgPath,
    installPath,
    installPkgPath,
    isMonorepo: monorepo,
    relativeBlogPath,
  };
}

function generatePreCommitScript(ctx: ProjectContext): string {
  const blogPattern = ctx.isMonorepo
    ? `${ctx.relativeBlogPath}/*.md|${ctx.relativeBlogPath}/**/*.md`
    : `src/data/blog/*.md|src/data/blog/**/*.md`;

  return `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# astro-minimax pre-commit hook
# Auto-fill pubDatetime/modDatetime only when empty or missing
# Will NOT overwrite manually specified dates

git diff --cached --name-status | while read -r status file; do
  case "$file" in
    ${blogPattern})
      case "$status" in
        M)
          filecontent=$(cat "$file" 2>/dev/null) || continue
          frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
          draft=$(echo "$frontmatter" | awk '/^draft: /{print $2}')
          
          if [ "$draft" = "false" ]; then
            modDatetime=$(echo "$frontmatter" | awk '/^modDatetime: /{print $2}')
            if [ -z "$modDatetime" ] || [ "$modDatetime" = "" ]; then
              echo "Auto-filled modDatetime: $file"
              sed -i.bak "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" "$file" && rm -f "$file.bak"
              git add "$file"
            fi
          fi
          
          if [ "$draft" = "first" ]; then
            echo "First release: $file"
            sed -i.bak -e "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime:/" -e "/---.*/,/---.*/s/^draft:.*$/draft: false/" "$file" && rm -f "$file.bak"
            git add "$file"
          fi
          ;;
        A)
          filecontent=$(cat "$file" 2>/dev/null) || continue
          frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
          pubDatetime=$(echo "$frontmatter" | awk '/^pubDatetime: /{print $2}')
          
          if [ -z "$pubDatetime" ] || [ "$pubDatetime" = "" ]; then
            echo "Auto-filled pubDatetime: $file"
            sed -i.bak "/---.*/,/---.*/s/^pubDatetime:.*$/pubDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" "$file" && rm -f "$file.bak"
            git add "$file"
          fi
          ;;
      esac
      ;;
  esac
done
`;
}

async function getInstallCommand(
  pm: "pnpm" | "npm" | "yarn",
  isMonorepo: boolean
): Promise<string> {
  if (isMonorepo) {
    switch (pm) {
      case "pnpm":
        return "pnpm add -Dw husky";
      case "yarn":
        return "yarn add -DW husky";
      case "npm":
        return "npm install -D -w . husky";
    }
  }
  switch (pm) {
    case "pnpm":
      return "pnpm add -D husky";
    case "yarn":
      return "yarn add -D husky";
    case "npm":
      return "npm install -D husky";
  }
}

async function getRemoveCommand(
  pm: "pnpm" | "npm" | "yarn",
  isMonorepo: boolean
): Promise<string> {
  if (isMonorepo) {
    switch (pm) {
      case "pnpm":
        return "pnpm remove -w husky";
      case "yarn":
        return "yarn remove -W husky";
      case "npm":
        return "npm uninstall -w . husky";
    }
  }
  switch (pm) {
    case "pnpm":
      return "pnpm remove husky";
    case "yarn":
      return "yarn remove husky";
    case "npm":
      return "npm uninstall husky";
  }
}

async function installCommand(): Promise<void> {
  const ctx = analyzeProject();

  if (!ctx) {
    console.error("\n  Error: Could not find a valid blog project.");
    console.error(
      "  Make sure you're in an astro-minimax blog directory with git initialized.\n"
    );
    process.exit(1);
  }

  if (!existsSync(ctx.installPkgPath)) {
    console.error(`\n  Error: package.json not found at ${ctx.installPath}`);
    console.error("  Run this command from your blog's root directory.\n");
    process.exit(1);
  }

  const pm = detectPackageManager(ctx.installPath);
  console.log(
    `\n  Project type: ${ctx.isMonorepo ? "Monorepo" : "Single project"}`
  );
  console.log(`  Git root: ${ctx.gitRoot}`);
  console.log(`  Blog path: ${ctx.blogPath}`);
  console.log(`  Package manager: ${pm}`);
  console.log(`\n  Installing husky...\n`);

  try {
    const installCmd = await getInstallCommand(pm, ctx.isMonorepo);
    await execAsync(installCmd, { cwd: ctx.installPath });
    console.log("  ✅ Husky installed\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("workspace")) {
      console.error("  ❌ Failed to install husky in monorepo.");
      console.error("  Try running: pnpm add -Dw husky (at monorepo root)\n");
    } else {
      console.error(`  ❌ Failed to install husky: ${message}\n`);
    }
    process.exit(1);
  }

  console.log("  Initializing husky...\n");
  try {
    await execAsync("npx husky init", { cwd: ctx.installPath });
    console.log("  ✅ Husky initialized\n");
  } catch {
    const huskyDir = join(ctx.installPath, ".husky");
    const huskyUnderscoreDir = join(huskyDir, "_");
    await mkdir(huskyUnderscoreDir, { recursive: true });
    await writeFile(
      join(huskyUnderscoreDir, "husky.sh"),
      `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="\$(basename "\$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  readonly husky_skip_init=1
  export husky_skip_init
  sh -e "\$0" "\$@"
  exitCode="\$?"

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  exit $exitCode
fi
`
    );
  }

  const huskyDir = join(ctx.installPath, ".husky");
  await mkdir(huskyDir, { recursive: true });

  const preCommitPath = join(huskyDir, "pre-commit");
  const script = generatePreCommitScript(ctx);
  await writeFile(preCommitPath, script, { mode: 0o755 });
  console.log("  ✅ Created .husky/pre-commit\n");

  try {
    const pkgContent = await readFile(ctx.installPkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

    pkg.scripts = pkg.scripts || {};
    pkg.scripts.prepare = "husky";

    await writeFile(ctx.installPkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log('  ✅ Added "prepare": "husky" script\n');
  } catch {
    console.warn(
      '  ⚠️  Could not update package.json. Add "prepare": "husky" manually.\n'
    );
  }

  console.log("  ═══════════════════════════════════════");
  console.log("  Git hooks installed successfully!\n");
  console.log("  The pre-commit hook will auto-fill:");
  console.log("    • pubDatetime (new files, if empty)");
  console.log("    • modDatetime (modified files, draft: false, if empty)");
  console.log("    • Handle draft: first for first publish\n");
  console.log("  Manually specified dates are NEVER overwritten.");
  console.log(`\n  Watching: ${ctx.relativeBlogPath}/*.md\n`);
}

async function uninstallCommand(): Promise<void> {
  const ctx = analyzeProject();

  if (!ctx) {
    console.error("\n  Error: Could not find a valid blog project.\n");
    process.exit(1);
  }

  const pm = detectPackageManager(ctx.installPath);
  console.log(
    `\n  Project type: ${ctx.isMonorepo ? "Monorepo" : "Single project"}`
  );
  console.log(`  Package manager: ${pm}`);
  console.log("\n  Uninstalling husky...\n");

  const huskyDir = join(ctx.installPath, ".husky");
  if (existsSync(huskyDir)) {
    await rm(huskyDir, { recursive: true, force: true });
    console.log("  ✅ Removed .husky directory\n");
  } else {
    console.log("  ℹ️  No .husky directory found\n");
  }

  try {
    const removeCmd = await getRemoveCommand(pm, ctx.isMonorepo);
    await execAsync(removeCmd, { cwd: ctx.installPath });
    console.log("  ✅ Removed husky from dependencies\n");
  } catch {
    console.log("  ℹ️  Husky was not installed\n");
  }

  try {
    const pkgContent = await readFile(ctx.installPkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);

    if (pkg.scripts?.prepare === "husky") {
      delete pkg.scripts.prepare;
      if (Object.keys(pkg.scripts).length === 0) {
        delete pkg.scripts;
      }
      await writeFile(ctx.installPkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log('  ✅ Removed "prepare" script\n');
    }
  } catch {}

  console.log("  Git hooks uninstalled successfully!\n");
}

async function statusCommand(): Promise<void> {
  const ctx = analyzeProject();

  if (!ctx) {
    console.log("\n  ❌ Not in an astro-minimax blog directory\n");
    return;
  }

  const huskyDir = join(ctx.installPath, ".husky");
  const preCommitPath = join(huskyDir, "pre-commit");
  const hasHusky = existsSync(huskyDir);
  const hasPreCommit = existsSync(preCommitPath);

  console.log("\n  Git Hooks Status\n");
  console.log(
    `  Project type:     ${ctx.isMonorepo ? "Monorepo" : "Single project"}`
  );
  console.log(`  Git root:         ${ctx.gitRoot}`);
  console.log(`  Blog path:        ${ctx.blogPath}`);
  console.log(`  Install location: ${ctx.installPath}`);
  console.log(`  Package manager:  ${detectPackageManager(ctx.installPath)}`);
  console.log(`  Husky installed:  ${hasHusky ? "✅ Yes" : "❌ No"}`);
  console.log(`  Pre-commit hook:  ${hasPreCommit ? "✅ Yes" : "❌ No"}\n`);

  if (!hasHusky) {
    console.log("  Run 'astro-minimax hooks install' to set up git hooks.\n");
  }
}

export async function hooksCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Git hooks setup for astro-minimax

Usage:
  astro-minimax hooks <subcommand>

Subcommands:
  install     Install Husky and create pre-commit hook
  uninstall   Remove Husky and hooks
  status      Show current hooks status

Pre-commit Hook Behavior:
  The hook auto-fills dates ONLY when empty or missing:
  • New files: Fill pubDatetime if not specified
  • Modified files (draft: false): Fill modDatetime if empty
  • First release (draft: first): Set draft to false

  Important: Manually specified dates are NEVER overwritten.
  If you set pubDatetime or modDatetime yourself, the hook respects it.

Project Types:
  • Single project: Blog created via 'astro-minimax init'
  • Monorepo: Development setup with apps/ and packages/

Examples:
  astro-minimax hooks install    # Set up hooks
  astro-minimax hooks status     # Check installation
  astro-minimax hooks uninstall  # Remove hooks
`);
    return;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case "install":
      await installCommand();
      break;
    case "uninstall":
      await uninstallCommand();
      break;
    case "status":
      await statusCommand();
      break;
    default:
      console.error(`\n  Unknown subcommand: ${subcommand}`);
      console.error("  Available: install, uninstall, status\n");
      process.exit(1);
  }
}
