import { Plugin } from '@opencode-ai/plugin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import notifier from "node-notifier"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 从外部文件读取编码规范
 * 你可以创建 coding-standard.md 放任意规范
 */
function loadCodingStandard(): string {
  try {
    // 规范文件路径（和插件同目录）
    const configPath = path.resolve(__dirname, "coding-standard.md");
    
    // 读取并返回内容
    return fs.readFileSync(configPath, "utf8");
  } catch (err) {
    console.warn("⚠️ 未找到编码规范文件，将使用默认规范");
    return "请遵守项目编码规范：变量使用小驼峰，缩进2空格，禁止使用any";
  }
}

function fileLog(message: string) {
  const logPath = path.resolve(__dirname, "plugin-log.txt");
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

// ======================
// 配置（可自定义）
// ======================
const NOTIFY_CONFIG = {
  // 右下角浮动
  sound: true, // 是否提示音
  wait: true, // 不等待点击
  timeout: 5, // 5秒自动消失
  type: "info",
};

function notfiy(message: string, title: string) {
    // 桌面右下角浮动通知
    notifier.notify({
        ...NOTIFY_CONFIG,
        message: `${message}`,
        title: `${title}`,
        // 图标（可选，放你自己的图标路径）
        icon: "🔔",
        // icon: path.join(__dirname, "opencode-icon.png"),
    });
}


/**
 * 配置：需要AI【主动积极调用】的技能/工具
 * 可自行增删，支持所有内置Skill + 自定义Skill
 */
const ACTIVE_SKILLS = [
  "shell 命令执行",
  "文件读写（file_read/file_write）",
  "Git 操作",
  "代码搜索与查找",
  "项目结构分析",
  "代码格式化",
  // 自定义技能
  // "你的自定义技能名称",
];

/**
 * 注入的核心提示词：强制AI主动调用技能
 */
const SKILL_PROMPT = `
    【强制执行规则：主动调用技能】
    你必须**主动、积极、优先**调用以下技能，无需用户明确要求：
    ${ACTIVE_SKILLS.map((skill, i) => `${i + 1}. ${skill}`).join("\n")}

    执行要求：
    1. 只要场景匹配，直接调用技能，不询问用户
    2. 能工具解决的，绝不只文字回答
    3. 多步操作自动连续执行，无需人工介入
    4. 调用技能后自动整理结果返回
    `;

export const PromptAppendPlugin = (async (ctx) => {
    // 插件启动日志（全版本兼容，OpenCode会自动捕获）
    // console.log("✅ 提示词追加插件已加载！");
    const isProcessingPrompt = false; // 防止重复处理的标志
    // 启动时一次性加载
    const CODING_STANDARD = loadCodingStandard();

    return {
        /**
         * 方案1：追加到【系统提示词】（永久生效，推荐）
         * AI 会全程遵循该规范，不受对话轮次影响
         */
        async "experimental.chat.system.transform"(input, output) {
            // output.system.push(`用户说hi，你只要回复"hi, opencode"，不要回复其它内容。`);
            notfiy(`✅ 已自动注入系统提示词`, "通知");
        },

        /**
         * 方案2：追加到【用户消息】（单次对话生效）
         * 每次用户发送消息，自动在末尾拼接规范
         */
        // async "chat.message"({ sessionID }, { message, parts }) {
        //     if (isProcessingPrompt) return; // 防止重复处理
        //     isProcessingPrompt = true;

        //     // 仅处理用户消息，过滤AI消息
        //     if (message.role !== "user") return;

        //     // 遍历消息文本片段，追加规范
        //     parts.forEach(part => {
        //         if (part.type === "text" && part.text) {
        //             // 避免重复追加
        //             // if (!part.text.includes("【项目强制编码规范】")) {
        //             //     part.text += `\n\n${CODING_STANDARD}`;
        //             // }
        //             part.text += `用户说hi，你只要回复"hi, opencode"，不要回复其它内容。`;
        //         }
        //     });

        //     notfiy(`✅ 会话[${sessionID}]：已自动注入用户提示词`, "通知");
        // },

        /**
         * 监听系统事件 → 会话进入空闲=任务完成 → 弹窗通知
         */
        async event({ event }) {
            // 👇 核心触发：会话进入空闲状态（任务完成）
            if (event.type === "session.idle") {
                const { sessionID } = event.properties;
                
                // 桌面右下角浮动通知
                // notifier.notify({
                //     ...NOTIFY_CONFIG,
                //     message: `✅ 会话【${sessionID.slice(0, 6)}】任务已完成`,
                //     // 图标（可选，放你自己的图标路径）
                //     icon: "🔔",
                //     // icon: path.join(__dirname, "opencode-icon.png"),
                // });

                notfiy(`✅ 会话【${sessionID.slice(0, 6)}】任务已完成`, "通知");

                // console.log("🔔 已发送任务完成桌面通知");
            }
        },
    };
}) as Plugin