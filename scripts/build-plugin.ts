/**
 * Build script for creating a one-file OpenCode plugin
 *
 * This script bundles the qwen-auth plugin into a single file
 * that can be placed in .opencode/plugins/ for local testing
 * or distributed as a standalone plugin.
 *
 * Usage: bun run scripts/build-plugin.ts
 */

import * as fs from "fs/promises";
import * as path from "path";

const ROOT_DIR = path.join(import.meta.dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const DIST_DIR = path.join(ROOT_DIR, "dist");

const BANNER = `/**
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
`;

const MIN_BANNER = `/** qwen-auth - OpenCode Plugin for Qwen. MIT License. https://github.com/lion-lef/qwen-auth-opencode */
`;

async function buildPlugin() {
  console.log("Building one-file OpenCode plugin with Bun...\n");

  // Ensure dist directory exists
  await fs.mkdir(DIST_DIR, { recursive: true });

  const entryPoint = path.join(SRC_DIR, "opencode-plugin.ts");
  const outfile = path.join(DIST_DIR, "qwen-auth-plugin.js");
  const minifiedOutfile = path.join(DIST_DIR, "qwen-auth-plugin.min.js");

  try {
    // Build readable version
    const result = await Bun.build({
      entrypoints: [entryPoint],
      outdir: DIST_DIR,
      naming: "qwen-auth-plugin.js",
      format: "esm",
      target: "node",
      sourcemap: "none",
      minify: false, // Keep readable for debugging
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
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    if (!result.success) {
      console.error("Build failed:");
      for (const log of result.logs) {
        console.error(log);
      }
      process.exit(1);
    }

    // Add banner to the output file
    const content = await fs.readFile(outfile, "utf-8");
    await fs.writeFile(outfile, BANNER + content);

    // Report build results
    console.log("Build completed successfully!");
    console.log(`  Output: ${outfile}`);

    const stats = await fs.stat(outfile);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);

    // Build minified version
    const minResult = await Bun.build({
      entrypoints: [entryPoint],
      outdir: DIST_DIR,
      naming: "qwen-auth-plugin.min.js",
      format: "esm",
      target: "node",
      sourcemap: "none",
      minify: true,
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
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    if (!minResult.success) {
      console.error("Minified build failed:");
      for (const log of minResult.logs) {
        console.error(log);
      }
      process.exit(1);
    }

    // Add banner to minified version
    const minContent = await fs.readFile(minifiedOutfile, "utf-8");
    await fs.writeFile(minifiedOutfile, MIN_BANNER + minContent);

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
