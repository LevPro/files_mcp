import 'ts-node/register';
import fileManager from './tools/file.js'; // All tools are registered here
// import fsTools from './tools/fs.js';     // Optional: If you want to split imports
console.log('🔧 MCP File Manager initialized successfully');
console.log(`📂 Root directory: ${process.env.MCP_ROOT_DIR || process.cwd()}`);

export { fileManager };