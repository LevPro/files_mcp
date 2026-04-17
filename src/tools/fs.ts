import fs from 'fs/promises';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getRootDir, isValidPath } from '../config.js';
import fileManager from './file.ts';

const rootDir = getRootDir();

// ➕ Create file or directory
fileManager.tool(
  'create',
  'Creates a new file or directory at the specified path',
  {
    path: z.string().describe('Destination path'),
    type: z.enum(['file', 'directory']).describe('Type of item to create'),
    content: z.string().optional().describe('Initial text content (only for files)'),
  },
  async ({ path: targetPath, type, content }) => {
    try {
      const safePath = isValidPath(targetPath, rootDir);
      
      if (type === 'directory') {
        await fs.mkdir(safePath, { recursive: true });
        return { 
          content: [{ type: 'text', text: `✅ Directory created: ${targetPath}` }] 
        };
      } else {
        const finalPath = path.join(rootDir, targetPath);
        await fs.mkdir(path.dirname(finalPath), { recursive: true });
        await fs.writeFile(finalPath, content || '', 'utf-8');
        return { 
          content: [{ type: 'text', text: `✅ File created: ${targetPath}` }] 
        };
      }
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 🗑️ Delete file or directory
fileManager.tool(
  'delete',
  'Deletes a file or directory. Directories require recursive: true',
  {
    path: z.string().describe('Path to delete'),
    recursive: z.boolean().optional().default(false).describe('Required when deleting non-empty directories'),
  },
  async ({ path: targetPath, recursive }) => {
    try {
      const safePath = isValidPath(targetPath, rootDir);
      
      // Check if it's a directory and needs recursion
      const stat = await fs.stat(safePath);
      if (stat.isDirectory() && !recursive) {
        return { 
          content: [{ type: 'text', text: "Error: Directory deletion requires recursive: true" }], 
          isError: true 
        };
      }
      
      await fs.rm(safePath, { recursive: true, force: true });
      return { 
        content: [{ type: 'text', text: `✅ Deleted: ${targetPath}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// ➡️ Move file or directory
fileManager.tool(
  'move',
  'Moves or renames a file or directory from source to destination',
  {
    source: z.string().describe('Current path'),
    destination: z.string().describe('Target path'),
  },
  async ({ source, destination }) => {
    try {
      const safeSrc = isValidPath(source.replace(/\\/g, '/'), rootDir);
      const safeDest = isValidPath(destination.replace(/\\/g, '/'), rootDir);
      
      await fs.mkdir(path.dirname(safeDest), { recursive: true });
      await fs.rename(safeSrc, safeDest);
      return { 
        content: [{ type: 'text', text: `✅ Moved: ${source} -> ${destination}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📋 Copy file or directory
fileManager.tool(
  'copy',
  'Copies a file or directory from source to destination',
  {
    source: z.string().describe('Original path'),
    destination: z.string().describe('Target path'),
  },
  async ({ source, destination }) => {
    try {
      const safeSrc = isValidPath(source.replace(/\\/g, '/'), rootDir);
      const safeDest = isValidPath(destination.replace(/\\/g, '/'), rootDir);
      
      await fs.mkdir(path.dirname(safeDest), { recursive: true });
      const stat = await fs.stat(safeSrc);
      await fs.cp(safeSrc, safeDest, { recursive: stat.isDirectory() });
      return { 
        content: [{ type: 'text', text: `✅ Copied: ${source} -> ${destination}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 🔤 Change file encoding
fileManager.tool(
  'change_file_encoding',
  'Reads a file with a source encoding and rewrites it with a target encoding',
  {
    path: z.string().describe('Path to the file'),
    from_encoding: z.string().describe("Current encoding (e.g., utf8, latin1, utf16le)"),
    to_encoding: z.string().describe("Target encoding (e.g., utf8, ascii, utf16le)"),
  },
  async ({ path: filePath, from_encoding, to_encoding }) => {
    try {
      const safePath = isValidPath(filePath, rootDir);
      
      // Read as raw buffer to preserve original bytes
      const buffer = await fs.readFile(safePath);
      // Decode using source encoding, then re-encode with target encoding
      const text = buffer.toString(from_encoding.toLowerCase() || 'utf8');
      await fs.writeFile(safePath, text, to_encoding.toLowerCase() || 'utf8');
      
      return { 
        content: [{ type: 'text', text: `✅ Encoding changed: ${from_encoding} -> ${to_encoding} for ${filePath}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 👤 Change owner (UID/GID) - Unix only
fileManager.tool(
  'change_owner',
  'Changes the owner and group of a file or directory (Unix-like systems only)',
  {
    path: z.string().describe('Path to the file or directory'),
    uid: z.number().int().optional().describe("User ID. Omit to keep current."),
    gid: z.number().int().optional().describe("Group ID. Omit to keep current."),
  },
  async ({ path: targetPath, uid, gid }) => {
    try {
      const safePath = isValidPath(targetPath.replace(/\\/g, '/'), rootDir);
      const stat = await fs.stat(safePath);
      
      const finalUid = uid ?? stat.uid;
      const finalGid = gid ?? stat.gid;
      
      await fs.chown(safePath, finalUid, finalGid);
      
      return { 
        content: [{ type: 'text', text: `✅ Owner updated: UID=${finalUid}, GID=${finalGid} for ${targetPath}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 🔐 Change permissions (mode)
fileManager.tool(
  'change_permissions',
  'Changes access permissions for a file or directory using UNIX octal mode',
  {
    path: z.string().describe('Path to the file or directory'),
    mode: z.string().describe("Octal permission string (e.g., '755', '644')"),
  },
  async ({ path: targetPath, mode }) => {
    try {
      const safePath = isValidPath(targetPath.replace(/\\/g, '/'), rootDir);
      
      // Validate octal format first
      if (!/^[0-7]{3}$/.test(mode)) {
        throw new Error('Invalid octal mode. Use standard 3-digit format (e.g., "755")');
      }
      
      const numericMode = parseInt(mode, 8);
      
      await fs.chmod(safePath, numericMode);
      
      return { 
        content: [{ type: 'text', text: `✅ Permissions changed to ${mode} for ${targetPath}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 🔍 Search files recursively
fileManager.tool(
  'search_files',
  'Searches for files matching a pattern in the directory tree',
  { path: z.string().describe('Path to search from'), pattern: z.string().describe("Glob pattern (e.g., *.js, node_modules)"), max_depth: z.number().optional().default(-1).describe('Max depth, -1 for unlimited') },
  async ({ path: searchDir, pattern, max_depth = -1 }) => {
    try {
      const safePath = isValidPath(searchDir, rootDir);
      
      async function search(currentPath: string, level: number): Promise<string[]> {
        if (level > Math.max(0, max_depth)) return [];
        
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const results: string[] = [];
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            const subResults = await search(fullPath, level + 1);
            results.push(...subResults);
          } else if (entry.isFile() && new RegExp(pattern.replace(/\*/g, '.*')).test(entry.name)) {
            results.push(path.posix.join(currentPath, entry.name));
          }
        }
        
        return results;
      }
      
      const matches = await search(safePath, 0);
      
      return { 
        content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 🔢 Get file size in human-readable format
fileManager.tool(
  'get_file_size',
  'Returns the size of a file in human-readable format (B, KB, MB, GB)',
  { path: z.string().describe('Path to the file') },
  async ({ path: filePath }) => {
    try {
      const safePath = isValidPath(filePath, rootDir);
      const stat = await fs.stat(safePath);
      
      const sizeB = stat.size;
      const suffixes = [' B', ' KB', ' MB', ' GB'];
      let index = 0;
      while (sizeB >= 1024 && index < suffixes.length - 1) {
        sizeB /= 1024;
        index++;
      }
      
      return { 
        content: [{ type: 'text', text: `Size: ${sizeB.toFixed(2)}${suffixes[index]}` }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📋 Get recent file list
fileManager.tool(
  'get_recent_files',
  'Lists recently modified files in the directory (last N minutes)',
  { path: z.string().describe('Path to check'), max_minutes: z.number().optional().default(60).describe('Minutes ago') },
  async ({ path: dirPath, max_minutes }) => {
    try {
      const safePath = isValidPath(dirPath, rootDir);
      
      // Get directory stats and filter by modification time
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      
      const now = Date.now();
      const cutoffTime = now - (max_minutes * 60 * 1000);
      
      const recentFiles = entries
        .filter(e => !e.isDirectory()) // Only files for now
        .map((entry) => {
          const stat = fs.stat(path.join(safePath, entry.name));
          if (stat.mtimeMs > cutoffTime) {
            return { name: entry.name, modified: stat.mtime.toISOString() };
          }
          return null;
        })
        .filter(Boolean); // Remove nulls
      
      return { 
        content: [{ type: 'text', text: JSON.stringify(recentFiles, null, 2) }] 
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
  'View detailed permissions for a file or directory (Unix-style)',
  { 
    path: z.string().describe('Path to the file or directory'),
    full_details: z.boolean().optional().default(false).describe('Include UID/GID and owner info (may require root)') 
  },
  async ({ path: targetPath, full_details = false }) => {
    try {
      const safePath = isValidPath(targetPath.replace(/\\/g, '/'), rootDir);
      
      let stat;
      try {
        stat = await fs.stat(safePath);
      } catch (e) {
        return { 
          content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], 
          isError: true 
        };
      }
      
      // Parse permission bits for symbolic representation
      const ownerRead = stat.mode & 0o400 ? 'r' : '-';
      const ownerWrite = stat.mode & 0o200 ? 'w' : '-';
      const ownerExec = stat.mode & 0o100 ? 'x' : '-';
      
      const groupRead = stat.mode & 0o40 ? 'r' : '-';
      const groupWrite = stat.mode & 0o20 ? 'w' : '-';
      const groupExec = stat.mode & 0o10 ? 'x' : '-';
      
      const otherRead = stat.mode & 0o4 ? 'r' : '-';
      const otherWrite = stat.mode & 0o2 ? 'w' : '-';
      const otherExec = stat.mode & 0o1 ? 'x' : '-';
      
      // Get symbolic permissions string (e.g., rwxr-xr--)
      const symbolicPermission = `${ownerRead}${ownerWrite}${ownerExec}${groupRead}${groupWrite}${groupExec}${otherRead}${otherWrite}${otherExec}`;
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            path: targetPath,
            symbolic: symbolicPermission,
            octal: `0${(stat.mode & 0o777).toString(8)}`,
            full_mode: stat.mode.toString(8), // Full mode including setuid/setgid/sticky bits
            is_directory: stat.isDirectory(),
            file_type: stat.isFile() ? 'file' : 
                       stat.isDirectory() ? 'directory' : 
                       stat.isSymbolicLink() ? 'symlink' : 'other',
            size: stat.size,
            uid: full_details && process.platform !== 'win32' ? (stat.uid || -1) : null,
            gid: full_details && process.platform !== 'win32' ? (stat.gid || -1) : null,
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

// 🔍 List directory permissions recursively
fileManager.tool(
  'list_permissions_recursive',
  'Lists permissions for all files and directories in a specified path (tree view)',
  { 
    path: z.string().describe('Path to list'),
    depth: z.number().optional().default(-1).describe('Max recursion depth, -1 for unlimited') 
  },
  async ({ path: dirPath, depth = -1 }) => {
    try {
      const safePath = isValidPath(dirPath.replace(/\\/g, '/'), rootDir);
      
      // Function to recursively list permissions with tree structure
      async function listRecursive(currentPath: string): Promise<string[]> {
        if (depth !== -1) {
          const currentDepth = await getDepth(currentPath, safePath);
          if (currentDepth > depth) return [];
        }
        
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const results: string[] = [];
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          try {
            const stat = await fs.stat(fullPath);
            
            // Calculate depth
            let currentDepth = 0;
            if (!currentPath.includes(safePath)) {
              const relativePath = path.relative(safePath, currentPath);
              currentDepth = (relativePath.split(path.sep).length - 1) + 1;
            }
            
            // Get permission string
            const octalPerm = `(0${(stat.mode & 0o777).toString(8)})`;
            
            // Build tree characters
            let indent = '├── ';
            if (currentDepth === depth && depth !== -1) {
              indent = '└── ';
            } else {
              const resultsLength = results.length;
              const isLastEntry = resultsLength === entries.filter((e, i) => e.name === entry.name).length - 1;
              
              if (!isLastEntry) {
                indent += `${'    '.repeat(currentDepth)}├── `;
              } else {
                indent += `${'    '.repeat(currentDepth)}└── `;
              }
            }
            
            const result = indent + 
                          `[${octalPerm}] ${entry.isDirectory() ? '📁' : '📄'} ${entry.name} (${stat.size} bytes)`;
            
            results.push(result);
            
            // Recurse into directories
            if (entry.isDirectory()) {
              const subResults = await listRecursive(fullPath, currentDepth + 1);
              results.push(...subResults.map(r => '    '.repeat(currentDepth) + '│   ' + r));
            }
          } catch (e) {
            // Skip inaccessible files
          }
        }
        
        return results;
      }
      
      const treeOutput = await listRecursive(safePath);
      
      return { 
        content: [{ type: 'text', text: JSON.stringify(treeOutput, null, 2) }] 
      };
    } catch (err) {
      return { 
        content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], 
        isError: true 
      };
    }
  },
);

// 📦 Initialize and connect the server
const transport = new StdioServerTransport();

(async () => {
  await fileManager.connect(transport);
  console.error(`📦 MCP File Server started. Root directory: ${rootDir}`);
  console.error("Waiting for JSON-RPC requests over stdio...");
})();
