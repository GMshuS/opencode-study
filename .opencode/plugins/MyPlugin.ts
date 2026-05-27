import { Plugin } from '@opencode-ai/plugin'
import { writeFileSync } from 'fs'

function fileLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  writeFileSync('./opencode-events.log', line, { flag: 'a' })
}

export default (async ({ project, directory }) => {
  fileLog(`[INIT] Plugin loaded for project ${project.id} at ${directory}`)

  return {
    event: async ({ event }) => {
      // 所有数据都在 event.properties 中，event.data 不存在
      const properties = event.properties as any

      switch (event.type) {

        // ═══════════════════════════════════════════
        // 命令事件
        // ═══════════════════════════════════════════
        case 'command.executed': {
          fileLog(`[command.executed] /${properties.name} ${properties.arguments || ''} (session=${properties.sessionID})`)
          break
        }

        // ═══════════════════════════════════════════
        // 文件事件
        // ═══════════════════════════════════════════
        case 'file.edited': {
          fileLog(`[file.edited] Edited: ${properties.file}`)
          break
        }
        case 'file.watcher.updated': {
          fileLog(`[file.watcher.updated] ${properties.event} on ${properties.file}`)
          break
        }

        // ═══════════════════════════════════════════
        // 安装事件
        // ═══════════════════════════════════════════
        case 'installation.updated': {
          fileLog(`[installation.updated] Updated to ${properties.version}`)
          break
        }

        // ═══════════════════════════════════════════
        // LSP 事件
        // ═══════════════════════════════════════════
        case 'lsp.client.diagnostics': {
          fileLog(`[lsp.client.diagnostics] Diagnostics from ${properties.serverID} for ${properties.path}`)
          break
        }
        case 'lsp.updated': {
          fileLog(`[lsp.updated] Updated`)
          break
        }

        // ═══════════════════════════════════════════
        // 消息事件（核心修正区）
        // ═══════════════════════════════════════════
        case 'message.updated': {
          const msg = properties.info
          if (!msg) {
            fileLog(`[message.updated] Updated (no info)`)
            break
          }
          // Message 是 UserMessage | AssistantMessage 联合类型
          // 没有 content 字段，只有 role/id/time 等元数据
          if (msg.role === 'user') {
            fileLog(`[message.updated] User ${msg.id} agent=${msg.agent} model=${msg.model?.providerID}/${msg.model?.modelID}`)
          } else {
            fileLog(`[message.updated] Assistant ${msg.id} model=${msg.modelID} tokens=${msg.tokens?.input || 0}/${msg.tokens?.output || 0}`)
          }
          break
        }
        case 'message.removed': {
          fileLog(`[message.removed] Removed ${properties.messageID} from ${properties.sessionID}`)
          break
        }
        case 'message.part.updated': {
          const part = properties.part
          const delta = properties.delta
          if (!part) {
            fileLog(`[message.part.updated] Updated (no part)`)
            break
          }
          // Part 是联合类型，根据 type 分发
          switch (part.type) {
            case 'text':
              fileLog(`[message.part.updated] text id=${part.id} msg=${part.messageID} len=${part.text?.length || 0} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'tool':
              fileLog(`[message.part.updated] tool id=${part.id} tool=${part.tool} status=${part.state?.status}`)
              break
            case 'reasoning':
              fileLog(`[message.part.updated] reasoning id=${part.id} len=${part.text?.length || 0}`)
              break
            case 'file':
              fileLog(`[message.part.updated] file id=${part.id} mime=${part.mime} name=${part.filename || 'unknown'}`)
              break
            case 'step-start':
              fileLog(`[message.part.updated] step-start id=${part.id}`)
              break
            case 'step-finish':
              fileLog(`[message.part.updated] step-finish id=${part.id} reason=${part.reason} cost=$${part.cost}`)
              break
            case 'snapshot':
              fileLog(`[message.part.updated] snapshot id=${part.id}`)
              break
            case 'patch':
              fileLog(`[message.part.updated] patch id=${part.id} files=${part.files?.length || 0}`)
              break
            case 'agent':
              fileLog(`[message.part.updated] agent id=${part.id} name=${part.name}`)
              break
            case 'retry':
              fileLog(`[message.part.updated] retry id=${part.id} attempt=${part.attempt}`)
              break
            case 'compaction':
              fileLog(`[message.part.updated] compaction id=${part.id} auto=${part.auto}`)
              break
            default:
              fileLog(`[message.part.updated] unknown type=${part.type} id=${part.id}`)
          }
          break
        }
        case 'message.part.removed': {
          fileLog(`[message.part.removed] Removed part ${properties.partID} from msg ${properties.messageID}`)
          break
        }
        case 'message.part.delta': {
          fileLog(`[message.part.delta] Delta for part ${properties.partID} in msg ${properties.messageID}`)
          break
        }

        // ═══════════════════════════════════════════
        // 权限事件
        // ═══════════════════════════════════════════
        case 'permission.updated': {
          fileLog(`[permission.updated] Updated ${properties.id} type=${properties.type} session=${properties.sessionID} title="${properties.title}"`)
          break
        }
        case 'permission.replied': {
          fileLog(`[permission.replied] Replied ${properties.permissionID} → ${properties.response} (session=${properties.sessionID})`)
          break
        }

        // ═══════════════════════════════════════════
        // 服务器事件
        // ═══════════════════════════════════════════
        case 'server.connected': {
          fileLog(`[server.connected] Connected`)
          break
        }

        // ═══════════════════════════════════════════
        // 会话事件（核心修正区）
        // ═══════════════════════════════════════════
        case 'session.created': {
          const s = properties.info
          fileLog(`[session.created] Created: ${s?.id || '?'} at ${s?.directory || '?'} title="${s?.title || ''}"`)
          break
        }
        case 'session.updated': {
          const s = properties.info
          fileLog(`[session.updated] Updated: ${s?.id || '?'} title="${s?.title || ''}"`)
          break
        }
        case 'session.deleted': {
          const s = properties.info
          fileLog(`[session.deleted] Deleted: ${s?.id || '?'}`)
          break
        }
        case 'session.compacted': {
          fileLog(`[session.compacted] Compacted: ${properties.sessionID}`)
          break
        }
        case 'session.idle': {
          // 只有 sessionID，没有 reason
          fileLog(`[session.idle] Idle: ${properties.sessionID}`)
          break
        }
        case 'session.error': {
          const err = properties.error
          let errStr = 'unknown'
          if (err) {
            errStr = `${err.name}: ${err.data?.message || JSON.stringify(err.data)}`
          }
          fileLog(`[session.error] Error in ${properties.sessionID || '?'}: ${errStr}`)
          break
        }
        case 'session.status': {
          const st = properties.status
          let detail = st.type
          if (st.type === 'retry') {
            detail += ` attempt=${st.attempt} next=${st.next}ms`
          }
          fileLog(`[session.status] Status: ${properties.sessionID} = ${detail}`)
          break
        }
        case 'session.diff': {
          fileLog(`[session.diff] Diff: ${properties.sessionID} files=${properties.diff?.length || 0}`)
          break
        }

        // ═══════════════════════════════════════════
        // 待办事项
        // ═══════════════════════════════════════════
        case 'todo.updated': {
          const todos = properties.todos || []
          const done = todos.filter((t: any) => t.status === 'completed').length
          fileLog(`[todo.updated] ${done}/${todos.length} (session=${properties.sessionID})`)
          break
        }

        // ═══════════════════════════════════════════
        // TUI 事件
        // ═══════════════════════════════════════════
        case 'tui.prompt.append': {
          fileLog(`[tui.prompt.append] Prompt append: "${properties.text?.substring(0, 40)}..."`)
          break
        }
        case 'tui.command.execute': {
          fileLog(`[tui.command.execute] Command: ${properties.command}`)
          break
        }
        case 'tui.toast.show': {
          fileLog(`[TUI] Toast [${properties.variant}]: ${properties.title ? `[${properties.title}] ` : ''}${properties.message}`)
          break
        }

        // ═══════════════════════════════════════════
        // 兜底
        // ═══════════════════════════════════════════
        default: {
          fileLog(`[OTHER] ${event.type}`)
          break
        }
      }
    },
  }
}) satisfies Plugin
