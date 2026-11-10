/**
 * SDK 1.x 兼容性测试
 *
 * 验证 request schemas 在 SDK 1.x 下的导入路径与形态：
 * - Server 类从 server/index.js 导出
 * - 请求 schemas 从 types.js 导出，且是 zod schema（带 .parse）
 * - 通过 server.setRequestHandler 注册后可被调用
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('SDK 1.x compatibility', () => {
  describe('request schemas', () => {
    const schemas = [
      ['CallToolRequestSchema', CallToolRequestSchema],
      ['ListToolsRequestSchema', ListToolsRequestSchema],
      ['ListResourcesRequestSchema', ListResourcesRequestSchema],
      ['ReadResourceRequestSchema', ReadResourceRequestSchema],
      ['ListPromptsRequestSchema', ListPromptsRequestSchema],
      ['GetPromptRequestSchema', GetPromptRequestSchema],
    ] as const;

    it.each(schemas)('%s should be a zod schema with .parse', (_name, schema) => {
      expect(schema).toBeDefined();
      expect(typeof (schema as any).parse).toBe('function');
      expect(typeof (schema as any).safeParse).toBe('function');
    });

    it('CallToolRequestSchema parses a valid tools/call request', () => {
      const parsed = CallToolRequestSchema.parse({
        method: 'tools/call',
        params: { name: 'tdd', arguments: { requirements: '测试' } },
      });
      expect(parsed.params.name).toBe('tdd');
    });

    it('ListToolsRequestSchema parses an empty tools/list request', () => {
      const parsed = ListToolsRequestSchema.parse({ method: 'tools/list', params: {} });
      expect(parsed.method).toBe('tools/list');
    });

    it('CallToolRequestSchema rejects a request without tool name', () => {
      expect(() =>
        CallToolRequestSchema.parse({ method: 'tools/call', params: {} }),
      ).toThrow();
    });
  });

  describe('Server low-level API', () => {
    it('constructs a Server and registers tool handlers without error', () => {
      const server = new Server(
        { name: 'test-server', version: '2.1.0' },
        { capabilities: { tools: {} } },
      );

      expect(() =>
        server.setRequestHandler(ListToolsRequestSchema, async () => ({
          tools: [],
        })),
      ).not.toThrow();

      expect(() =>
        server.setRequestHandler(CallToolRequestSchema, async () => ({
          content: [{ type: 'text' as const, text: 'ok' }],
        })),
      ).not.toThrow();
    });

    it('registers resources and prompts handlers without error', () => {
      const server = new Server(
        { name: 'test-server', version: '2.1.0' },
        { capabilities: { resources: {}, prompts: {} } },
      );

      expect(() =>
        server.setRequestHandler(ListResourcesRequestSchema, async () => ({
          resources: [],
        })),
      ).not.toThrow();
      expect(() =>
        server.setRequestHandler(ReadResourceRequestSchema, async () => ({
          contents: [],
        })),
      ).not.toThrow();
      expect(() =>
        server.setRequestHandler(ListPromptsRequestSchema, async () => ({
          prompts: [],
        })),
      ).not.toThrow();
      expect(() =>
        server.setRequestHandler(GetPromptRequestSchema, async () => ({
          messages: [],
        })),
      ).not.toThrow();
    });
  });

  describe('handler wiring (same module paths as src/server.ts)', () => {
    it('new-tools handler returns SDK-1.x-compliant CallToolResult', async () => {
      const { NewToolsHandler } = await import('../handlers/new-tools.js');
      const { I18nService } = await import('../i18n.js');

      const handler = new NewToolsHandler(I18nService.getInstance());
      const result = await handler.callTool({
        method: 'tools/call',
        params: { name: 'tdd', arguments: { requirements: '用户登录' } },
      });

      // SDK 1.x requires content array; isError must be boolean or absent
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
      expect(result.isError).toBeFalsy();
    });

    it('legacy handler returns SDK-1.x-compliant ListToolsResult with 15 tools', async () => {
      const { toolsHandler } = await import('../handlers/tools.js');
      const result = await toolsHandler.listTools({ method: 'tools/list', params: {} });

      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools).toHaveLength(15);
      for (const tool of result.tools) {
        expect(typeof tool.name).toBe('string');
        expect(tool.inputSchema.type).toBe('object');
      }
    });
  });
});
