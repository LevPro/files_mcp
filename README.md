# MCP File Manager Server 📁

A secure Node.js-based Model Context Protocol (MCP) server that provides comprehensive file system operations to LLMs.

## 🔐 Security Features

- All file operations are restricted to a configurable root directory (`MCP_ROOT_DIR`)
- Path traversal attacks are prevented via validation on all input paths
- Read-only by default unless explicitly granted write permissions
- All path inputs are validated against the root directory before execution

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build TypeScript code:**
   ```bash
   npm run build
   ```

3. **Start development mode (hot reload):**
   ```bash
   npm run dev
   # MCP File Server started. Root directory: ./
   ```

4. **Start production with root directory restriction:**
   ```bash
   export MCP_ROOT_DIR=/your/safe/directory
   npm start
   ```

## 🧪 Testing Your Server

```bash
# Create test files first
mkdir -p /tmp/mcp-test && cd /tmp/mcp-test
touch test.txt, file1.js, subdir/another.txt

# Run server and send JSON-RPC requests:
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"test.txt"}}}

# Check stdout for responses
```

## 📊 Available Tools Summary

| Tool | Description | Security Note |
|------|-------------|---------------|
| `read_directory` | List files in directory | Restricted to root |
| `read_file` | Read file content as text | Restricted to root |
| `write_file` | Create/overwrite files | Requires write permissions |
| `create` | Create file or directory | Creates inside root only |
| `delete` | Delete files/directories | Recursive option for folders |
| `move` | Move/rename files/directories | Both source & dest checked |
| `copy` | Copy files/directories | Recursively copies dirs |
| `get_file_stats` | File metadata (size, time) | Read-only check |
| `tree` | Directory tree view | Depth-limited output |
| `search_files` | Find matching file patterns | Glob pattern search |
| `change_permissions` | Set file permissions (octal) | Requires root on some systems |
| `change_owner` | Change UID/GID owner | Unix-only feature |
| `view_permissions` (file.ts) | Single file/dir permissions with UID/GID | `{ "path": "/test.txt", "modeOctal": "0644", ... }` |
| `view_permissions` (fs.ts) | Detailed symbolic + octal permissions | `{ "symbolic": "-rw-r--r--", "octal": "644", ... }` |
| `list_permissions_recursive` (fs.ts) | Tree view of all file/directory permissions | `[0755] 📁 my-dir [0644] 📄 test.txt` |

## 📦 Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
COPY package*.json ./
RUN npm install && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["npm", "start"]
```

Run with volume mapping to restrict access:
```bash
docker run -e MCP_ROOT_DIR=/data/mcp-app -v $(pwd):/data/mcp-app my-mcp-server-image
```

## 🛡️ Security Checklist

- ✅ **Path Traversal Prevention:** All paths validated against `MCP_ROOT_DIR`
- ✅ **Directory Isolation:** Default root is current working directory, overridable via env var
- ✅ **Error Handling:** Errors caught and returned gracefully via JSON-RPC error format
- ⚠️ **Permissions:** Run server as non-root user in production environments

## 🔧 Configuration

Set `MCP_ROOT_DIR` environment variable to restrict operations:
```bash
export MCP_ROOT_DIR=/app/files
npm start
```

Here's the updated **README.md** with complete instructions on how to configure your MCP File Manager server in VS Code and other LLM clients via JSON config:

---

## 📝 Updated README.md Documentation

```markdown
# MCP File Manager Server 📁

A secure Node.js-based Model Context Protocol (MCP) server that provides comprehensive file system operations to LLMs.

---

## 🔐 Security Features

- All file operations are restricted to a configurable root directory (`MCP_ROOT_DIR`)
- Path traversal attacks are prevented via validation on all input paths
- Read-only by default unless explicitly granted write permissions
- All path inputs are validated against the root directory before execution

---

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build TypeScript code:**
   ```bash
   npm run build
   ```

3. **Start development mode (hot reload):**
   ```bash
   npm run dev
   # MCP File Server started. Root directory: ./
   ```

4. **Start production with root directory restriction:**
   ```bash
   export MCP_ROOT_DIR=/your/safe/directory
   npm start
   ```

---

## 🧪 Testing Your Server

```bash
# Create test files first
mkdir -p /tmp/mcp-test && cd /tmp/mcp-test
touch test.txt, file1.js, subdir/another.txt

# Run server and send JSON-RPC requests:
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"test.txt"}}}

# Check stdout for responses
```

## 🔌 Adding to MCP Servers (JSON Config)

Configure your LLM client (VS Code, Cursor, etc.) to use this server. Add the following to your **settings.json** file:

### VS Code / Cursor MCP Configuration

#### 1. Open `settings.json` in your IDE
   - Press `Ctrl+,` → Search "Open Settings (JSON)" or go to File → Preferences → Settings → Open JSON

#### 2. Add Server Configuration
```json
{
  // ... other settings ...
  
  "mcpServers.file-manager": {
    "command": "npm",
    "args": ["start"],
    "cwd": "/absolute/path/to/mcp-file-manager",
    "env": {
      "MCP_ROOT_DIR": "/your/restricted/files/directory"
    }
  },
  
  // OR use direct node command (skip npm start)
  "mcpServers.file-manager-direct": {
    "command": "node",
    "args": ["dist/index.js"],
    "cwd": "/absolute/path/to/mcp-file-manager",
    "env": {
      "MCP_ROOT_DIR": "/your/restricted/files/directory"
    }
  },
  
  // Alternative: Using TypeScript directly (dev mode)
  "mcpServers.file-manager-dev": {
    "command": "npx",
    "args": ["ts-node", "src/index.ts"],
    "cwd": "/absolute/path/to/mcp-file-manager",
    "env": {
      "MCP_ROOT_DIR": "/your/restricted/files/directory"
    }
  }
}
```

#### 3. Common Configuration Examples

##### Example 1: VS Code with npm start (Recommended)
```json
{
  "mcpServers.file-manager": {
    "command": "npm",
    "args": ["start"],
    "cwd": "/path/to/mcp-file-manager",
    "env": {
      "MCP_ROOT_DIR": "~/projects/files"
    }
  }
}
```

##### Example 2: Cursor IDE with direct node execution
```json
{
  "mcpServers.file-manager": {
    "command": "node",
    "args": ["dist/index.js"],
    "cwd": "/absolute/path/to/mcp-file-manager"
  }
}
```

##### Example 3: Development with TypeScript (no build needed)
```json
{
  "mcpServers.file-manager": {
    "command": "npx",
    "args": ["ts-node", "src/index.ts"],
    "cwd": "/absolute/path/to/mcp-file-manager"
  }
}
```

##### Example 4: With additional environment variables
```json
{
  "mcpServers.file-manager": {
    "command": "npm",
    "args": ["start"],
    "cwd": "/path/to/mcp-file-manager",
    "env": {
      "MCP_ROOT_DIR": "~/projects/files",
      "NODE_ENV": "production",
      "LOG_LEVEL": "info"
    }
  }
}
```