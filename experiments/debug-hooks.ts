import { QwenAuthPlugin } from '../src/opencode-plugin';

const mockInput = {
  client: { auth: { set: async () => {} } },
  project: {},
  directory: '/test',
  worktree: '/test',
  serverUrl: new URL('http://localhost:3000'),
};

const hooks = await QwenAuthPlugin(mockInput as any);
console.log('Keys:', Object.keys(hooks));
console.log('Has chat.headers:', 'chat.headers' in hooks);
