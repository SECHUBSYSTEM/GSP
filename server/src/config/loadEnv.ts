import { config } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/** Load .env from monorepo root and server package (pnpm runs scripts from server/). */
export function loadEnv(): void {
  const configDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(configDir, '../../../.env'),
    resolve(configDir, '../../.env'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
    }
  }
}

loadEnv();
