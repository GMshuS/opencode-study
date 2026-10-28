import { Plugin } from '@opencode/plugin'
import { appendFileSync } from 'fs'
import path from 'path'

/**
 * OpenCode V2 插件：钩子 + 事件审计日志
 *
 * V1 里所有东西都是从一个函数返回的对象上的字符串 key：
 *   export const MyPlugin = async (ctx) => ({ 'tool.execute.before': ..., event: ... })
 *
 * V2 把这些拆到了各自的 domain 上，并且必须用 Plugin.define 声明 id：
 *   - 'permission.ask'      → ctx.permission.hook('evaluate', ...)
 *   - 'shell.env'           → ctx.shell.hook('create.before', ...)
 *   - 'tool.execute.before' → ctx.tool.hook('execute.before', ...)
 *   - 'tool.execute.after'  → ctx.tool.hook('execute.after', ...)
 *   - event（全局事件流）    → ctx.event.subscribe()，用 AbortController 清理
 *
 * 另一个重要变化：V1 的事件字段在 event.properties 上，V2 在 event.data 上。
 */

// 单条日志里最多保留多少字符，避免把 base64 之类的大字段写进日志
const MAX_VALUE_LENGTH = 600

function preview(value: unknown): string {
  if (value === undefined || value === null) return String(value)
  let text: string
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value)
  } catch {
    text = String(value)
  }
  if (!text) return ''
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}...` : text
}

export default Plugin.define({
  id: 'my-plugin',
  async setup(ctx) {
    // 日志写到插件实例所在目录，而不是依赖进程 cwd
    const logPath = path.join(ctx.location.directory, 'opencode-events.log')
    const fileLog = (message: string) => {
      try {
        appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`)
      } catch {
        // 日志失败不影响主流程
      }
    }

    console.log(`✅ [INIT] Plugin loaded for project ${ctx.location.project.id} at ${ctx.location.directory}`)
    fileLog(`[INIT] Plugin loaded for project ${ctx.location.project.id} at ${ctx.location.directory}`)

    // ═══════════════════════════════════════════════════════════════════════
    // 1. permission.hook('evaluate') — 权限决策审计（V1: 'permission.ask'）
    // ═══════════════════════════════════════════════════════════════════════
    // V1 的 output.status 是只读的；V2 用可变的 event.effect（allow / ask / deny）
    await ctx.permission.hook('evaluate', (event) => {
      fileLog(`[permission.evaluate] input: action=${event.action} resources=${preview(event.resources)} session=${event.sessionID} agent=${event.agent ?? ''} metadata=${preview(event.metadata)}`)
      fileLog(`[permission.evaluate] output: effect=${event.effect} message=${event.message ?? ''}`)
    })

    // ═══════════════════════════════════════════════════════════════════════
    // 2. shell.hook('create.before') — 环境变量注入点（V1: 'shell.env'）
    // ═══════════════════════════════════════════════════════════════════════
    // V2 只有一个可变事件对象，env 直接挂在它上面
    await ctx.shell.hook('create.before', (event) => {
      fileLog(`[shell.create.before] input: command=${event.command} cwd=${event.cwd} shell=${event.shell} timeout=${event.timeout}`)
      fileLog(`[shell.create.before] output: env=${preview(event.env)}`)
    })

    // ═══════════════════════════════════════════════════════════════════════
    // 3. tool.hook('execute.before') — 工具执行前拦截（V1: 'tool.execute.before'）
    // ═══════════════════════════════════════════════════════════════════════
    // V1 的 input/output 两个参数合并成了一个事件：event.input 可改写，
    // 想阻止执行就抛错（V2 没有 output.abort 这种标记）
    await ctx.tool.hook('execute.before', (event) => {
      fileLog(`[tool.execute.before] input: tool=${event.tool} session=${event.sessionID} call=${event.id} message=${event.messageID}`)
      fileLog(`[tool.execute.before] output: tool=${event.tool} input=${preview(event.input)}`)
    })

    // ═══════════════════════════════════════════════════════════════════════
    // 4. tool.hook('execute.after') — 工具执行后处理（V1: 'tool.execute.after'）
    // ═══════════════════════════════════════════════════════════════════════
    await ctx.tool.hook('execute.after', (event) => {
      if (event.status === 'completed') {
        fileLog(`[tool.execute.after] status=completed tool=${event.tool} session=${event.sessionID} call=${event.id} content=${preview(event.result.content)} metadata=${preview(event.result.metadata)}`)
      } else {
        fileLog(`[tool.execute.after] status=error tool=${event.tool} session=${event.sessionID} call=${event.id} error=${event.error.message}`)
      }
    })

    // ═══════════════════════════════════════════════════════════════════════
    // 5. 全局事件流（V1: 返回的 event 钩子）→ ctx.event.subscribe()
    // ═══════════════════════════════════════════════════════════════════════
    // 订阅是异步迭代器，必须用 AbortController 在插件卸载时断开；
    // setup 返回的函数就是 V1 的 dispose 钩子。
    const controller = new AbortController()

    const handleEvent = (type: string, data: Record<string, any>) => {
      switch (type) {
        // ── 命令事件 ──────────────────────────────
        case 'tui.command.execute': {
          fileLog(`[tui.command.execute] command=${data.command}`)
          break
        }

        // ── 文件事件（V1: file.edited / file.watcher.updated）──
        case 'filesystem.changed': {
          fileLog(`[filesystem.changed] event=${data.event} file=${data.file}`)
          break
        }

        // ── 安装事件 ──────────────────────────────
        case 'installation.updated': {
          fileLog(`[installation.updated] version=${data.version}`)
          break
        }
        case 'installation.update-available': {
          fileLog(`[installation.update-available] version=${data.version}`)
          break
        }

        // ── 消息事件（V1 的 message.part.updated 在 V2 拆成了流式细粒度事件）──
        case 'session.text.delta': {
          fileLog(`[session.text.delta] session=${data.sessionID} message=${data.assistantMessageID} ordinal=${data.ordinal} delta=${preview(data.delta)}`)
          break
        }
        case 'session.reasoning.delta': {
          fileLog(`[session.reasoning.delta] session=${data.sessionID} message=${data.assistantMessageID} ordinal=${data.ordinal} delta=${preview(data.delta)}`)
          break
        }
        case 'session.tool.input.delta': {
          fileLog(`[session.tool.input.delta] session=${data.sessionID} message=${data.assistantMessageID} call=${data.id} delta=${preview(data.delta)}`)
          break
        }
        case 'session.tool.called': {
          fileLog(`[session.tool.called] session=${data.sessionID} call=${data.id} executed=${data.executed} input=${preview(data.input)}`)
          break
        }
        case 'session.tool.progress': {
          fileLog(`[session.tool.progress] session=${data.sessionID} call=${data.id} metadata=${preview(data.metadata)}`)
          break
        }
        case 'session.tool.success': {
          fileLog(`[session.tool.success] session=${data.sessionID} call=${data.id} executed=${data.executed} content=${preview(data.content)}`)
          break
        }
        case 'session.tool.failed': {
          fileLog(`[session.tool.failed] session=${data.sessionID} call=${data.id} executed=${data.executed} error=${preview(data.error)}`)
          break
        }
        case 'session.step.started': {
          fileLog(`[session.step.started] session=${data.sessionID} message=${data.assistantMessageID} ${preview(data)}`)
          break
        }
        case 'session.step.ended': {
          fileLog(`[session.step.ended] session=${data.sessionID} message=${data.assistantMessageID} ${preview(data)}`)
          break
        }
        case 'session.step.failed': {
          fileLog(`[session.step.failed] session=${data.sessionID} message=${data.assistantMessageID} error=${preview(data.error)}`)
          break
        }
        case 'session.retry.scheduled': {
          fileLog(`[session.retry.scheduled] session=${data.sessionID} attempt=${data.attempt} at=${data.at} error=${preview(data.error)}`)
          break
        }

        // ── 权限事件（V1: permission.updated / permission.replied）──
        case 'permission.asked': {
          fileLog(`[permission.asked] id=${data.id} action=${data.action} resources=${preview(data.resources)} session=${data.sessionID} message=${data.message ?? ''}`)
          break
        }
        case 'permission.replied': {
          fileLog(`[permission.replied] id=${data.requestID} reply=${preview(data.reply)} session=${data.sessionID}`)
          break
        }

        // ── 会话事件 ──────────────────────────────
        case 'session.created': {
          fileLog(`[session.created] id=${data.sessionID} title="${data.title ?? ''}" project=${data.projectID} agent=${data.agent ?? ''} model=${preview(data.model)} version=${data.version}`)
          break
        }
        case 'session.renamed': {
          fileLog(`[session.renamed] id=${data.sessionID} title="${data.title ?? ''}"`)
          break
        }
        case 'session.moved': {
          fileLog(`[session.moved] id=${data.sessionID} ${preview(data)}`)
          break
        }
        case 'session.deleted': {
          fileLog(`[session.deleted] id=${data.sessionID}`)
          break
        }
        case 'session.execution.started': {
          fileLog(`[session.execution.started] session=${data.sessionID}`)
          break
        }
        case 'session.execution.succeeded': {
          fileLog(`[session.execution.succeeded] session=${data.sessionID}`)
          break
        }
        case 'session.execution.failed': {
          fileLog(`[session.execution.failed] session=${data.sessionID} error=${preview(data.error)}`)
          break
        }
        case 'session.execution.interrupted': {
          fileLog(`[session.execution.interrupted] session=${data.sessionID} reason=${data.reason}`)
          break
        }
        case 'session.idle': {
          fileLog(`[session.idle] session=${data.sessionID}`)
          break
        }
        case 'session.status': {
          fileLog(`[session.status] session=${data.sessionID} status=${preview(data.status)}`)
          break
        }
        case 'session.compaction.started': {
          fileLog(`[session.compaction.started] session=${data.sessionID} reason=${data.reason}`)
          break
        }
        case 'session.compaction.ended': {
          fileLog(`[session.compaction.ended] session=${data.sessionID} reason=${data.reason} text=${preview(data.text)} tokens=${preview(data.tokens)}`)
          break
        }
        case 'session.compaction.failed': {
          fileLog(`[session.compaction.failed] session=${data.sessionID} reason=${data.reason} error=${preview(data.error)}`)
          break
        }
        case 'session.usage.updated': {
          fileLog(`[session.usage.updated] session=${data.sessionID} cost=${preview(data.cost)} tokens=${preview(data.tokens)}`)
          break
        }

        // ── TUI 事件 ──────────────────────────────
        case 'tui.prompt.append': {
          fileLog(`[tui.prompt.append] Prompt append: "${preview(data.text)}"`)
          break
        }
        case 'tui.toast.show': {
          fileLog(`[tui.toast.show] Toast [${data.variant}]: ${data.title ? `[${data.title}] ` : ''}${data.message} duration=${data.duration ?? 0}ms`)
          break
        }
        case 'tui.session.select': {
          fileLog(`[tui.session.select] session=${data.sessionID}`)
          break
        }

        // ── 兜底：记录所有其余事件，方便继续补充 ──
        default: {
          fileLog(`[OTHER] ${type} ${preview(data)}`)
          break
        }
      }
    }

    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          const data = ((event as { data?: Record<string, any> }).data ?? {}) as Record<string, any>
          handleEvent(event.type as string, data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          fileLog(`[event] subscription error: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    })()

    // V1 的 dispose 钩子 → setup 返回的清理函数
    return () => controller.abort()
  },
})
