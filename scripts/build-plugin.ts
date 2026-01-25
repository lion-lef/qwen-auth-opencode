/**
 * Build script for creating a one-file OpenCode plugin
 *
 * This script bundles the qwen-auth plugin into a single file
 * that can be placed in .opencode/plugins/ for local testing
 * or distributed as a standalone plugin.
 *
 * Usage: npx tsx scripts/build-plugin.ts
 */

import * as esbuild from "esbuild";
import * as fs from "fs/promises";
import * as path from "path";

const ROOT_DIR = path.join(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const DIST_DIR = path.join(ROOT_DIR, "dist");

async function buildPlugin() {
  console.log("Building one-file OpenCode plugin...\n");

  // Ensure dist directory exists
  await fs.mkdir(DIST_DIR, { recursive: true });

  const entryPoint = path.join(SRC_DIR, "opencode-plugin.ts");
  const outfile = path.join(DIST_DIR, "qwen-auth-plugin.js");

  try {
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile,
      format: "esm",
      platform: "node",
      target: "node20",
      sourcemap: false,
      minify: false,  // Keep readable for debugging
      treeShaking: true,
      external: [
        // Node.js built-in modules
        "node:*",
        "fs",
        "path",
        "os",
        "crypto",
        "http",
        "child_process",
        "fs/promises",
      ],
      // Banner with plugin metadata
      banner: {
        js: `/**
 * qwen-auth - OpenCode Authentication Plugin for Qwen Models
 *
 * This is a bundled one-file plugin for OpenCode.
 * Place this file in ~/.config/opencode/plugins/ or .opencode/plugins/
 *
 * Features:
 * - Qwen OAuth Device Flow (free tier, compatible with chat.qwen.ai)
 * - DashScope API Key authentication
 *
 * @see https://github.com/lion-lef/qwen-auth-opencode
 * @license MIT
 */
`,
      },
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      logLevel: "info",
    });

    // Report build results
    console.log("\nBuild completed successfully!");
    console.log(`  Output: ${outfile}`);

    const stats = await fs.stat(outfile);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const warning of result.warnings) {
        console.log(`  - ${warning.text}`);
      }
    }

    // Also create a minified version for production use
    const minifiedOutfile = path.join(DIST_DIR, "qwen-auth-plugin.min.js");

    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: minifiedOutfile,
      format: "esm",
      platform: "node",
      target: "node20",
      sourcemap: false,
      minify: true,
      treeShaking: true,
      external: [
        "node:*",
        "fs",
        "path",
        "os",
        "crypto",
        "http",
        "child_process",
        "fs/promises",
      ],
      banner: {
        js: `/** qwen-auth - OpenCode Plugin for Qwen. MIT License. https://github.com/lion-lef/qwen-auth-opencode */`,
      },
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      logLevel: "silent",
    });

    const minStats = await fs.stat(minifiedOutfile);
    console.log(`\nMinified version:`);
    console.log(`  Output: ${minifiedOutfile}`);
    console.log(`  Size: ${(minStats.size / 1024).toFixed(2)} KB`);

    console.log("\n--- Usage Instructions ---");
    console.log("1. Copy the plugin file to your OpenCode plugins directory:");
    console.log("   cp dist/qwen-auth-plugin.js ~/.config/opencode/plugins/");
    console.log("");
    console.log("2. Or for project-specific use:");
    console.log("   mkdir -p .opencode/plugins");
    console.log("   cp dist/qwen-auth-plugin.js .opencode/plugins/");
    console.log("");
    console.log("3. Restart OpenCode to load the plugin");

  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildPlugin();
