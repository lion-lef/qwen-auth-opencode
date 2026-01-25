/**
 * Check exports from root index.ts
 * This helps identify non-function exports that could cause issues with OpenCode
 */

import * as rootModule from "../index";

console.log("=== Root Module Exports ===");
const entries = Object.entries(rootModule);

const functionExports: string[] = [];
const nonFunctionExports: string[] = [];

for (const [key, value] of entries) {
  const type = typeof value;
  console.log(`${key}: ${type}`);

  if (type === "function") {
    functionExports.push(key);
  } else {
    nonFunctionExports.push(`${key} (${type})`);
  }
}

console.log("\n=== Summary ===");
console.log(`Total exports: ${entries.length}`);
console.log(`Function exports: ${functionExports.length}`);
console.log(`Non-function exports: ${nonFunctionExports.length}`);

if (nonFunctionExports.length > 0) {
  console.log("\n=== Non-Function Exports (PROBLEM!) ===");
  for (const exp of nonFunctionExports) {
    console.log(`  - ${exp}`);
  }
}
