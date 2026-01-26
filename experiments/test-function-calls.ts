/**
 * Test what happens when exported functions are called without proper arguments
 * This simulates what OpenCode might do when iterating through exports
 */

import * as rootModule from "../index";

console.log("=== Testing function calls without arguments ===\n");

const errors: Array<{ fn: string; error: string }> = [];

for (const [key, value] of Object.entries(rootModule)) {
  if (typeof value === "function") {
    console.log(`Testing: ${key}()`);
    try {
      // Try calling the function without any arguments
      // This is what OpenCode appears to do
      const result = (value as Function)();

      // If it's a promise, handle it
      if (result instanceof Promise) {
        result.catch((err: Error) => {
          console.log(`  [ASYNC ERROR] ${err.message}`);
          errors.push({ fn: key, error: `[ASYNC] ${err.message}` });
        });
      } else {
        console.log(`  [OK] Result type: ${typeof result}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  [ERROR] ${message}`);
      errors.push({ fn: key, error: message });
    }
  }
}

console.log("\n=== Summary ===");
console.log(`Total functions: ${Object.values(rootModule).filter(v => typeof v === "function").length}`);
console.log(`Errors: ${errors.length}`);

if (errors.length > 0) {
  console.log("\n=== Errors ===");
  for (const { fn, error } of errors) {
    console.log(`  ${fn}: ${error}`);
  }
}

// Wait a bit for async errors to show
setTimeout(() => {
  console.log("\n=== Done ===");
}, 1000);
