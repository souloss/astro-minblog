#!/usr/bin/env node
/**
 * Build script for @astro-minimax/ai package.
 * 
 * WHY: Components need to be pre-compiled to JavaScript with explicit `h()` calls
 * instead of relying on jsx-runtime transformation. This ensures they work correctly
 * when consumed via `file:` protocol (CLI-created blogs) where the bundler's JSX
 * transformation pipeline may not handle external packages correctly.
 * 
 * STRATEGY:
 * 1. Use esbuild for all JS compilation with `h()` calls for JSX
 * 2. Use tsc only for type declaration generation
 */

import * as esbuild from 'esbuild';
import { mkdir, writeFile, readFile, readdir, stat, rm } from 'fs/promises';
import { join, dirname, basename, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src');
const distDir = join(packageRoot, 'dist');

/**
 * Post-process the compiled JS to ensure proper imports.
 * - Add missing h/Fragment imports from preact for JSX
 * - Replace .ts imports with .js for ESM compatibility
 */
function postProcessCode(code, isJsxFile) {
  // Replace .ts/.tsx imports with .js
  code = code.replace(/from\s*['"](\.[^'"]+)\.tsx?['"]/g, 'from "$1.js"');
  
  // For JSX files, ensure h and Fragment are imported from preact
  if (isJsxFile) {
    // Check if the file uses h() or Fragment
    const usesH = /\bh\s*\(/.test(code);
    const usesFragment = /\bFragment\b/.test(code);
    
    if (usesH || usesFragment) {
      // Check if already imported
      const hasPreactImport = /from\s*['"]preact['"]/.test(code);
      const hasHImport = /import\s*\{[^}]*\bh\b[^}]*\}\s*from\s*['"]preact['"]/.test(code);
      const hasFragmentImport = /import\s*\{[^}]*Fragment[^}]*\}\s*from\s*['"]preact['"]/.test(code);
      
      const needsH = usesH && !hasHImport;
      const needsFragment = usesFragment && !hasFragmentImport;
      
      if (needsH || needsFragment) {
        const imports = [];
        if (needsH) imports.push('h');
        if (needsFragment) imports.push('Fragment');
        
        const importStmt = `import { ${imports.join(', ')} } from 'preact';\n`;
        
        // Find the first import to insert after
        const firstImportMatch = code.match(/^import\s+.+from\s+['"][^'"]+['"];\s*$/m);
        if (firstImportMatch) {
          const insertPos = firstImportMatch.index + firstImportMatch[0].length;
          code = code.slice(0, insertPos) + '\n' + importStmt + code.slice(insertPos);
        } else {
          // No imports, add at the top
          code = importStmt + '\n' + code;
        }
      }
    }
  }
  
  return code;
}

async function getAllFiles(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function buildPackage() {
  console.log('Building @astro-minimax/ai...');
  
  // Clean dist
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // Get ALL .ts/.tsx files to compile (not just entry points)
  // WHY: With bundle: false, each imported file must be compiled separately.
  // Previously we only compiled ENTRY_POINTS, causing missing files like utils/i18n.js
  console.log('\n[1/3] Compiling JavaScript with esbuild...');
  
  const allSourceFiles = await getAllFiles(srcDir);
  
  for (const srcPath of allSourceFiles) {
    const relativePath = relative(srcDir, srcPath);
    const outPath = join(distDir, relativePath.replace(/\.tsx?$/, '.js'));
    const isJsxFile = srcPath.endsWith('.tsx');
    const isComponent = relativePath.startsWith('components/');
    
    // Skip .d.ts files
    if (srcPath.endsWith('.d.ts')) continue;
    
    // Ensure output directory exists
    await mkdir(dirname(outPath), { recursive: true });
    
    // For components, we need to bundle them to resolve relative imports
    // For other files, we just compile without bundling
    if (isComponent) {
      // Bundle components with their internal dependencies
      await esbuild.build({
        entryPoints: [srcPath],
        outfile: outPath,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        bundle: true,
        // External: keep peer dependencies and package exports external
        external: [
          'preact',
          'preact/hooks',
          'preact/jsx-runtime',
          '@ai-sdk/react',
          'ai',
        ],
        jsx: 'transform',
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        tsconfig: join(packageRoot, 'tsconfig.components.json'),
        sourcemap: false,
        minify: false,
      });
    } else {
      // Non-component files: compile without bundling
      await esbuild.build({
        entryPoints: [srcPath],
        outfile: outPath,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        bundle: false,
        jsx: 'transform',
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        tsconfig: join(packageRoot, 'tsconfig.components.json'),
        sourcemap: false,
        minify: false,
      });
    }
    
    // Post-process to fix imports and add h/Fragment for JSX files
    let code = await readFile(outPath, 'utf-8');
    code = postProcessCode(code, isJsxFile);
    await writeFile(outPath, code, 'utf-8');
  }

  // Copy AIChatWidget.astro
  console.log('\n[2/3] Copying Astro component...');
  const astroSrc = join(srcDir, 'components', 'AIChatWidget.astro');
  const astroOut = join(distDir, 'components', 'AIChatWidget.astro');
  await mkdir(dirname(astroOut), { recursive: true });
  await writeFile(astroOut, await readFile(astroSrc, 'utf-8'), 'utf-8');
  console.log('  AIChatWidget.astro -> dist/components/AIChatWidget.astro');

  // Generate type declarations with tsc
  console.log('\n[3/3] Generating type declarations...');
  try {
    // Use npx to ensure tsc is found in local node_modules
    execSync('npx tsc -p tsconfig.types.json', {
      cwd: packageRoot,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Type declaration generation had errors (continuing anyway)');
  }

  // Make dev-server.js executable
  const devServer = join(distDir, 'server', 'dev-server.js');
  try {
    const { chmodSync } = await import('fs');
    chmodSync(devServer, 0o755);
  } catch {}

  console.log('\n✓ Build complete!');
}

buildPackage().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});