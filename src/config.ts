import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const ROOT_DIR_ENV = 'MCP_ROOT_DIR';

// Default to current working directory if no env var is set
export function getRootDir(): string {
  try {
    return resolve(process.env[ROOT_DIR_ENV] || process.cwd());
  } catch (error) {
    throw new Error(`Cannot determine root directory: ${(error as Error).message}`);
  }
}

// Validate path safety - prevents directory traversal attacks
export function isValidPath(inputPath: string, rootDir: string): string | never {
  try {
    const resolved = resolve(rootDir, inputPath.replace(/\\/g, '/'));
    if (!resolved.startsWith(rootDir + '/') && resolved !== rootDir) {
      throw new Error('Access denied: path traversal outside root directory');
    }
    return resolved;
  } catch (error) {
    throw new Error(`Invalid path: ${(error as Error).message}`);
  }
}

export const config = {
  name: 'file-manager-server',
  version: '1.0.0',
};
