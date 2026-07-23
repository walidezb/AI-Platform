import { createMockAiServer } from './mocks/ai-server';

const mockAi = createMockAiServer(8001);

async function globalSetup() {
  await mockAi.start();
  console.log('✅ Mock AI server started on :8001');
  process.env.AI_SERVICE_URL = mockAi.url;
}

async function globalTeardown() {
  await mockAi.stop();
  console.log('✅ Mock AI server stopped');
}

export default globalSetup;
export { globalTeardown };
