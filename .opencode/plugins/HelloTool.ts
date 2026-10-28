import { Plugin } from '@opencode/plugin'

/**
 * OpenCode V2 插件：注册一个自定义工具
 *
 * V1 的写法是 `export default async (ctx) => ({ tool: { hello: tool({...}) } })`，
 * V2 改为 `Plugin.define({ id, setup })`，工具通过 `ctx.tool.transform` 注册。
 * 与 V1 的差别：
 *   1. 每个插件必须有稳定的 `id`
 *   2. 参数 schema 使用 JSON Schema（V1 用的是 zod 风格的 `tool.schema`）
 *   3. execute 返回结构化的 `{ content }`（V1 直接返回字符串）
 */
export default Plugin.define({
  id: 'hello-tool',
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      // test：向 小明 打招呼
      editor.add({
        name: 'hello',
        description: 'Say hello to someone',
        input: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name to greet' },
          },
          required: ['name'],
          additionalProperties: false,
        },
        async execute(input) {
          const { name } = input as { name: string }
          return { content: `Hello, ${name}!` }
        },
      })
    })
  },
})
