import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

export { createApp } from './app.js';

export async function startServer() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`GSP API listening on http://localhost:${env.PORT}`);
  });
}

const isDirectRun = process.argv[1]?.includes('index');
if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
