# MCP Server Capability — spec delta for `upgrade-to-v2.1`

## ADDED Requirements

### Requirement: SDK 1.x Compatibility

The server SHALL run on `@modelcontextprotocol/sdk` >= 1.32 and < 2.

#### Scenario: Server starts on SDK 1.x

- **WHEN** the package is installed with `@modelcontextprotocol/sdk@^1.32.2`
- **THEN** `node dist/server.js` starts and completes the MCP `initialize` handshake over stdio

#### Scenario: Request schemas resolve from the server entrypoint

- **WHEN** the server module is imported
- **THEN** `ListToolsRequestSchema`, `CallToolRequestSchema`, `ListResourcesRequestSchema`, `ReadResourceRequestSchema`, `ListPromptsRequestSchema`, `GetPromptRequestSchema` are imported from `@modelcontextprotocol/sdk/server/index.js` and are zod schemas

### Requirement: ESM Module Semantics

The package SHALL declare `"type": "module"` and emit/run ESM; runtime path resolution SHALL NOT depend on `__dirname`.

#### Scenario: Compiled output executes as ESM

- **WHEN** `npm run build` completes and `node dist/server.js` runs
- **THEN** no `Cannot use import statement outside a module` or `__dirname is not defined` error occurs

#### Scenario: Packaged asset directories resolve

- **WHEN** a resource URI under `tdd://best-practices/` or a prompt template is requested
- **THEN** the handler resolves `best-practices/` and `templates/` directories relative to the compiled module using `import.meta.url`, and the files are found

## MODIFIED Requirements

### Requirement: Node Engine Floor

The package SHALL declare `engines.node >= 20`.

#### Scenario: engines field

- **WHEN** `package.json` is inspected
- **THEN** `engines.node` is `">=20.0.0"`

### Requirement: Version Consistency

`package.json` version, in-code `SERVER_INFO.version`, and documented version SHALL be identical.

#### Scenario: Version numbers agree

- **WHEN** the three locations are compared after release prep
- **THEN** all equal `2.1.0`

## REMOVED Requirements

- Root-level standalone workaround scripts (`mcp-server.js`, `simple-server.js`, `start-server.js`, `stdio-server.js`, `test-server.js`, `test-mcp.sh`) are no longer part of the delivery; the sole entrypoint is `dist/server.js` (bin: `tdd-mcp-server`).
