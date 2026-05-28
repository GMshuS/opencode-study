import { Plugin } from '@opencode-ai/plugin'
import { writeFileSync } from 'fs'

function fileLog(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  writeFileSync('./opencode-events.log', line, { flag: 'a' })
}

export default (async ( ctx ) => {
  const { project, directory } = ctx

  fileLog(`[INIT] Plugin loaded for project ${project.id} at ${directory}`)

  return {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. permission.ask Hook — 权限自动管控
    // ═══════════════════════════════════════════════════════════════════════
    'permission.ask': async (input, output) => {
      // input 参数：权限请求信息
      const { type, pattern, metadata } = input

      // output 参数：status 字段，设置为 "allow" 或 "deny" 决定是否授予权限
      const { status } = output

      // 1.1 记录权限请求到审计日志
      fileLog(`[PERMISSION.ASK] input: type=${type} pattern=${pattern} metadata=${JSON.stringify(metadata)}`)
      
      // 1.2 根据权限类型和请求信息自动允许或拒绝权限请求
      fileLog(`[PERMISSION.ASK] output: status=${status}`)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 2. shell.env Hook — 环境变量注入
    // ═══════════════════════════════════════════════════════════════════════
    'shell.env': async (input, output) => {
      // input 参数：当前 shell 上下文
      const { cwd, sessionID, callID } = input
      
      // output 参数：env 对象，直接修改以注入环境变量
      const { env } = output

      // 2.1 根据 cwd/sessionID/callID 决定注入哪些环境变量
      fileLog(`[SHELL.ENV] input: cwd=${cwd} session=${sessionID} call=${callID}`)

      // 2.2 注入环境变量
      fileLog(`[SHELL.ENV] output: env=${JSON.stringify(env)}`)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 3. tool.execute.before Hook — 工具执行前拦截
    // ═══════════════════════════════════════════════════════════════════════
    'tool.execute.before': async (input, output) => {
      // input 参数：工具调用信息
      const { tool, sessionID, callID } = input
      // output 参数：可修改 args 或设置 abort 阻止执行
      const { args } = output

      // 3.1 记录工具调用信息到审计日志
      fileLog(`[tool.execute.before] input: tool=${tool} session=${sessionID} call=${callID}`)

      // 3.2 根据工具类型和调用上下文修改参数或阻止执行
      fileLog(`[tool.execute.before] output: tool=${tool} args=${JSON.stringify(args)}`)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 4. tool.execute.after Hook — 工具执行后处理
    // ═══════════════════════════════════════════════════════════════════════
    'tool.execute.after': async (input, output) => {
      // input 参数：工具调用信息（只读）
      const { tool, sessionID, callID, args } = input
      // output 参数：可修改结果
      const { title, output: toolOutput, metadata } = output

      fileLog(`[tool.execute.after] input: tool=${tool} session=${sessionID} call=${callID} args=${JSON.stringify(args)} metadata=${JSON.stringify(metadata)}`)

      // 6. 记录工具执行结果到审计日志
      fileLog(`[tool.execute.after] output: tool=${tool} outputLen=${toolOutput?.length || 0} title=${title}` + (metadata ? ` metadata=${JSON.stringify(metadata)}` : ''))
    },
    
    // ═══════════════════════════════════════════════════════════════════════
    // 5. event 事件监听器 — 全局事件监控（核心修正区）
    // ═══════════════════════════════════════════════════════════════════════
    event: async ({ event }) => {

      fileLog(`[event] type=${event.type}`)

      // 所有数据都在 event.properties 中，event.data 不存在
      const properties = event.properties as any

      switch (event.type) {

        // ═══════════════════════════════════════════
        // 命令事件
        // ═══════════════════════════════════════════
        case 'command.executed': {
          // command.executed 事件包含 name/arguments/sessionID/messageID，记录执行的命令和参数以便分析用户操作和系统响应
          fileLog(`[command.executed] /${properties.name} ${properties.arguments || ''} (session=${properties.sessionID})`)
          break
        }

        // ═══════════════════════════════════════════
        // 文件事件
        // ═══════════════════════════════════════════
        case 'file.edited': {
          // file.edited 事件包含 file/event/sessionID，记录文件编辑信息以便分析文件交互过程
          fileLog(`[file.edited] Edited: ${properties.file} (${properties.event}) in session ${properties.sessionID}`)
          break
        }
        case 'file.watcher.updated': {
          // file.watcher.updated 事件包含 file/event/sessionID，记录文件变更信息以便分析文件交互过程
          fileLog(`[file.watcher.updated] ${properties.event} on ${properties.file} in session ${properties.sessionID}`)
          break
        }

        // ═══════════════════════════════════════════
        // 安装事件
        // ═══════════════════════════════════════════
        case 'installation.updated': {
          // installation.updated 事件包含 version 字段，记录更新后的版本信息以便分析安装和更新过程
          fileLog(`[installation.updated] Updated to ${properties.version} in session ${properties.sessionID}`)
          break
        }

        // ═══════════════════════════════════════════
        // LSP 事件
        // ═══════════════════════════════════════════
        case 'lsp.client.diagnostics': {
          // lsp.client.diagnostics 事件包含 serverID/path/sessionID，记录诊断信息以便分析 LSP 交互过程和诊断结果
          fileLog(`[lsp.client.diagnostics] Diagnostics from ${properties.serverID} for ${properties.path} in session ${properties.sessionID}`)
          break
        }
        case 'lsp.updated': {
          // lsp.updated 事件包含 sessionID 和一个动态属性对象，记录更新的服务器信息和相关属性以便分析 LSP 交互过程
          fileLog(`[lsp.updated] Updated in session ${properties.sessionID} with properties ${JSON.stringify(properties)}`)
          break
        }

        // ═══════════════════════════════════════════
        // 消息事件（核心修正区）
        // ═══════════════════════════════════════════
        case 'message.updated': {
          const msg = properties.info
          if (!msg) {
            // message.updated 事件应该包含 info 字段，如果没有则记录异常情况以便分析和修正消息更新流程
            fileLog(`[message.updated] Updated (no info)`)
            break
          }
          // Message 是 UserMessage | AssistantMessage 联合类型
          // 没有 content 字段，只有 role/id/time 等元数据
          if (msg.role === 'user') {
            // user 消息的更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
            fileLog(`[message.updated] User ${msg.id} agent=${msg.agent} model=${msg.model?.providerID}/${msg.model?.modelID} in session ${properties.sessionID} summary=${msg.summary ? 'yes' : 'no'}`)
          } else {
            // assistant 消息的更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
            fileLog(`[message.updated] Assistant ${msg.id} model=${msg.modelID} tokens=${msg.tokens?.input || 0}/${msg.tokens?.output || 0} in session ${properties.sessionID} error=${msg.error ? `${msg.error.name}: ${JSON.stringify(msg.error.data)}` : 'no'} finish=${msg.finish || 'no'}`)
          }
          break
        }
        case 'message.removed': {
          // message.removed 事件包含 sessionID 和 messageID，记录被删除的消息信息以便分析消息更新过程
          fileLog(`[message.removed] Removed ${properties.messageID} from ${properties.sessionID}`)
          break
        }
        case 'message.part.updated': {
          const part = properties.part
          const delta = properties.delta
          if (!part) {
            // message.part.updated 事件应该包含 part 字段，如果没有则记录异常情况以便分析和修正消息更新流程
            fileLog(`[message.part.updated] Updated (no part)`)
            break
          }
          // Part 是联合类型，根据 type 分发
          switch (part.type) {
            case 'text':
              // text 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] text id=${part.id} msg=${part.messageID} len=${part.text?.length || 0} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'tool':
              // tool 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] tool id=${part.id} tool=${part.tool} status=${part.state?.status} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'reasoning':
              // reasoning 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] reasoning id=${part.id} len=${part.text?.length || 0} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'file':
              // file 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] file id=${part.id} mime=${part.mime} name=${part.filename || 'unknown'} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'step-start':
              // step-start 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] step-start id=${part.id} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'step-finish':
              // step-finish 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] step-finish id=${part.id} reason=${part.reason} cost=$${part.cost} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'snapshot':
              // snapshot 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] snapshot id=${part.id} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'patch':
              // patch 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] patch id=${part.id} files=${part.files?.length || 0} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'agent':
              // AgentPart 的 source 字段可能包含敏感信息，记录时需要注意脱敏处理
              fileLog(`[message.part.updated] agent id=${part.id} name=${part.name} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'retry':
              // retry 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] retry id=${part.id} attempt=${part.attempt} delta=${delta ? 'yes' : 'no'}`)
              break
            case 'compaction':
              // compaction 类型的部分更新事件是我们之前没有预料到的，记录相关信息以便分析和优化消息更新流程
              fileLog(`[message.part.updated] compaction id=${part.id} auto=${part.auto} delta=${delta ? 'yes' : 'no'}`)
              break
            default:
              // 兜底，记录未知类型的部分更新事件以便分析和修正
              fileLog(`[message.part.updated] unknown type=${part.type} id=${part.id} delta=${delta ? 'yes' : 'no'}  session=${properties.sessionID} message=${part.messageID}`)
          }
          break
        }
        case 'message.part.removed': {
          // message.part.removed 事件包含 sessionID/messageID/partID，记录被删除的部分信息以便分析消息更新过程
          fileLog(`[message.part.removed] Removed part ${properties.partID} from msg ${properties.messageID} in session ${properties.sessionID}`)
          break
        }
        case 'message.part.delta': {
          // message.part.delta 事件包含 sessionID/messageID/partID 和 delta 字段，记录增量内容和相关信息以便分析消息更新过程
          fileLog(`[message.part.delta] Delta for part ${properties.partID} in msg ${properties.messageID} session ${properties.sessionID}: ${properties.delta ? 'yes' : 'no'} delta=${properties.delta ? properties.delta.substring(0, 40) + '...' : 'no'}`)
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
          fileLog(`[server.connected] Connected to server at ${properties.directory}  session=${properties.sessionID} instance=${properties.instanceID} version=${properties.version} pid=${properties.pid} port=${properties.port} env=${JSON.stringify(properties.env)} metadata=${JSON.stringify(properties.metadata)}`)
          break
        }

        // ═══════════════════════════════════════════
        // 会话事件（核心修正区）
        // ═══════════════════════════════════════════
        case 'session.created': {
          const s = properties.info
          // session.created 事件可能没有 info，只有 sessionID，因此需要兼容性处理
          fileLog(`[session.created] Created: ${s?.id || '?'} at ${s?.directory || '?'} title="${s?.title || ''}" session=${properties.sessionID} version=${s?.version} time=${s ? new Date(s.time.created).toISOString() : '?'} summary=${s?.summary ? 'yes' : 'no'} `)
          break
        }
        case 'session.updated': {
          const s = properties.info
          // session.updated 事件可能没有 info，只有 sessionID，因此需要兼容性处理
          fileLog(`[session.updated] Updated: ${s?.id || '?'} title="${s?.title || ''}" session=${properties.sessionID} version=${s?.version} time=${s ? new Date(s.time.updated).toISOString() : '?'} summary=${s?.summary ? 'yes' : 'no'}`)
          break
        }
        case 'session.deleted': {
          const s = properties.info
          // session.deleted 事件可能没有 info，只有 sessionID，因此需要兼容性处理
          fileLog(`[session.deleted] Deleted: ${s?.id || '?'} session=${properties.sessionID} title="${s?.title || ''}" version=${s?.version} time=${s ? new Date(s.time.updated).toISOString() : '?'} summary=${s?.summary ? 'yes' : 'no'}`)
          break
        }
        case 'session.compacted': {
          // session.compacted 事件没有额外信息，只有 sessionID
          fileLog(`[session.compacted] Compacted: ${properties.sessionID}`)
          break
        }
        case 'session.idle': {
          // session.idle 事件没有额外信息，只有 sessionID
          fileLog(`[session.idle] Idle: ${properties.sessionID}`)
          break
        }
        case 'session.error': {
          const err = properties.error
          let errStr = 'unknown'
          if (err) {
            errStr = `${err.name}: ${err.data?.message || JSON.stringify(err.data)}`
          }
          // session.error 事件包含 sessionID 和 error 对象，记录错误信息以便排查问题
          fileLog(`[session.error] Error in ${properties.sessionID || '?'}: ${errStr}`)
          break
        }
        case 'session.status': {
          const st = properties.status
          let detail = st.type
          if (st.type === 'retry') {
            detail += ` attempt=${st.attempt} next=${st.next}ms`
          }
          // session.status 事件包含 sessionID 和 status 对象，记录当前状态和相关信息（如重试次数和下次重试时间）
          fileLog(`[session.status] Status: ${properties.sessionID} = ${detail} message=${st.message || ''}`)
          break
        }
        case 'session.diff': {
          // session.diff 事件包含 sessionID 和 diff 数组，记录变更的文件数量和详情
          fileLog(`[session.diff] Diff: ${properties.sessionID} files=${properties.diff?.length || 0} ${properties.diff ? JSON.stringify(properties.diff) : ''}`)
          break
        }

        // ═══════════════════════════════════════════
        // 待办事项
        // ═══════════════════════════════════════════
        case 'todo.updated': {
          const todos = properties.todos || []
          const done = todos.filter((t: any) => t.status === 'completed').length
          // todo.updated 事件包含 sessionID 和 todos 数组，记录完成情况和待办详情
          fileLog(`[todo.updated] ${done}/${todos.length} (session=${properties.sessionID}) todos=${JSON.stringify(todos)}`)
          break
        }

        // ═══════════════════════════════════════════
        // TUI 事件
        // ═══════════════════════════════════════════
        case 'tui.prompt.append': {
          // tui.prompt.append 事件包含 text 字段，记录追加的提示内容以便分析用户输入和系统响应
          fileLog(`[tui.prompt.append] Prompt append: "${properties.text?.substring(0, 40)}..." in session ${properties.sessionID}`)
          break
        }
        case 'tui.command.execute': {
          // tui.command.execute 事件包含 command 字段，记录执行的命令和参数以便分析用户操作和系统响应
          fileLog(`[tui.command.execute] Command: ${properties.command} in session ${properties.sessionID}`)
          break
        }
        case 'tui.toast.show': {
          // tui.toast.show 事件包含 title/message/variant/duration 等信息，记录通知内容和类型以便分析用户交互和系统反馈
          fileLog(`[TUI] Toast [${properties.variant}]: ${properties.title ? `[${properties.title}] ` : ''}${properties.message} (session=${properties.sessionID}) duration=${properties.duration || 0}ms`)
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
