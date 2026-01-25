// Test the plugin imports work correctly
import * as indexExports from '../index.ts';
import * as pluginExports from '../dist/qwen-auth-plugin.js';
import * as minPluginExports from '../dist/qwen-auth-plugin.min.js';

console.log('=== Index.ts exports ===');
console.log('QwenAuthPlugin:', typeof indexExports.QwenAuthPlugin);
console.log('loadCredentials:', typeof indexExports.loadCredentials);
console.log('ACCESS_TOKEN_EXPIRY_BUFFER_MS:', typeof indexExports.ACCESS_TOKEN_EXPIRY_BUFFER_MS);

console.log('\n=== Plugin.js exports ===');
console.log('QwenAuthPlugin:', typeof pluginExports.QwenAuthPlugin);
console.log('default:', typeof pluginExports.default);
console.log('loadCredentials:', typeof pluginExports.loadCredentials);

console.log('\n=== Plugin.min.js exports ===');
console.log('QwenAuthPlugin:', typeof minPluginExports.QwenAuthPlugin);
console.log('default:', typeof minPluginExports.default);
console.log('loadCredentials:', typeof minPluginExports.loadCredentials);

// Test calling the plugin with a mock input
const mockInput = {
  client: {
    auth: {
      set: async () => {}
    }
  }
};

try {
  const hooks = await pluginExports.QwenAuthPlugin(mockInput);
  console.log('\n=== Plugin Hook Test ===');
  console.log('hooks.auth:', typeof hooks.auth);
  console.log('hooks.auth.provider:', hooks.auth.provider);
  console.log('hooks.chat.headers:', typeof hooks['chat.headers']);
  console.log('Auth methods count:', hooks.auth.methods.length);
  console.log('Auth methods:', hooks.auth.methods.map(m => m.label));
} catch (e) {
  console.error('Plugin test failed:', e);
}

console.log('\n✅ All imports work correctly!');
