import { Plugin, tool } from '@opencode-ai/plugin'

export default (async (ctx) => {
  return {
    tool: {
        // test：向 小明 打招呼
        hello: tool({
            description: 'Say hello to someone',
            args: {
            name: tool.schema.string().describe('Name to greet'),
            },
            async execute({ name }) {
            return `Hello, ${name}!`
            },
        }),
    },
  }
}) satisfies Plugin