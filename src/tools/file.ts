import fs from 'fs/promises';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getRootDir, isValidPath } from '../config.js';

const rootDir = getRootDir();

export const fileManager = new McpServer({
  name: config.name,
  version: config.version,
});

// 📂 List directory contents
fileManager.tool(
  'read_directory',
  'Lists files and subdirectories in a specified folder',
  { path: z.string().describe('Path to the directory (relative or absolute)') },
  async ({ path: dirPath }) => {
    try {
      const safePath = isValidPath(dirPath, rootDir);
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file',
            path: path.posix.join(dirPath, e.name).replace(/\\/g, '/'),
          })), null, 2) 
        }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📖 Read file content
fileManager.tool(
  'read_file',
  'Reads and returns the text content of a file',
  { path: z.string().describe('Path to the file') },
  async ({ path: filePath }) => {
    try {
      const safePath = isValidPath(filePath, rootDir);
      const content = await fs.readFile(safePath, 'utf-8');
      return { 
        content: [{ type: 'text', text: content }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// ✏️ Write file content
fileManager.tool(
  'write_file',
  'Creates a new file or overwrites an existing one with the provided content',
  {
    path: z.string().describe('Path to the file'),
    content: z.string().describe('Text content to write'),
  },
  async ({ path: filePath, content }) => {
    try {
      const safePath = isValidPath(filePath, rootDir);
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, content, 'utf-8');
      return { 
        content: [{ type: 'text', text: `✅ File successfully written: ${filePath}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📋 Read file as binary buffer
fileManager.tool(
  'read_file_binary',
  'Reads a file and returns raw binary content as base64',
  { path: z.string().describe('Path to the file') },
  async ({ path: filePath }) => {
    try {
      const safePath = isValidPath(filePath, rootDir);
      const buffer = await fs.readFile(safePath);
      return { 
        content: [{ type: 'text', text: `Base64: ${buffer.toString('base64')}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📊 Get file stats
fileManager.tool(
  'get_file_stats',
  'Returns metadata about a file (size, permissions, etc.)',
  { path: z.string().describe('Path to the file') },
  async ({ path: filePath }) => {
    try {
      const safePath = isValidPath(filePath, rootDir);
      const stat = await fs.stat(safePath);
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            name: stat.name,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            isDirectory: stat.isDirectory(),
            permissions: stat.mode.toString(8)
          }, null, 2) 
        }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📁 List file contents in tree format
fileManager.tool(
  'tree',
  'Lists directory structure with depth limit',
  { path: z.string().describe('Path to the directory'), depth: z.number().optional().default(-1).describe('Max depth, -1 for unlimited') },
  async ({ path: dirPath, depth = -1 }) => {
    try {
      const safePath = isValidPath(dirPath, rootDir);
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      
      function printTree(currentPath: string, level: number) {
        if (level === 0 || depth !== -1 && level > depth) return '';
        
        let result = '└── ';
        const isDirectory = entries.find(e => e.name === path.basename(currentPath)).isDirectory();
        
        return result + JSON.stringify(entries.map((e, i) => {
          if (i < entries.length - 1) {
            return `${'    '.repeat(level)}├── ${e.isDirectory() ? '📁' : '📄'} ${e.name}`;
          } else {
            return `${'    '.repeat(level)}└── ${e.isDirectory() ? '📁' : '📄'} ${e.name}`;
          }
        }).join('\n'));
      }

      return { 
        content: [{ type: 'text', text: printTree(dirPath, 0) }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

fileManager.tool(
  'view_permissions',
  'View detailed permissions for a file or directory',
  { path: z.string().describe('Path to the file or directory') },
  async ({ path: targetPath }) => {
    try {
      const safePath = isValidPath(targetPath, rootDir);
      const stat = await fs.stat(safePath);
      
      // Get octal permissions
      const modeOctal = (stat.mode & 0o777).toString(8);
      
      // Parse permission bits for symbolic representation
      function getPermissionSymbol(mode: number, type: 'owner' | 'group' | 'other'): string {
        return [
          { read: mode & 0b100 ? 'r' : '-', write: mode & 0b010 ? 'w' : '-' },
          { execute: (mode & 0b111) & (type === 'owner' || type === 'group') ? (mode & 0b110 ? 'x' : '-') : '-' }
        ].flat();
      }
      
      // Get symbolic permissions for owner, group, and others
      const ownerPerm = stat.mode.toString(8).substr(-3) + '.owner';
      const groupPerm = (stat.mode & 0o777) & 0o600; // Simplified
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            path: targetPath,
            modeOctal: `0${modeOctal}`,
            symbolic: `${stat.mode.toString(8).substr(-3)}`,
            ownerUid: stat.uid || 'N/A',
            ownerGid: stat.gid || 'N/A',
            isDirectory: stat.isDirectory(),
            fileFlags: Array.from(stat.flags).map(f => f.name) || [],
          }, null, 2) 
        }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

