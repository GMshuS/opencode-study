要使用vision tool需要在opencode.json中配置支持视觉模型的环境变量，如下：
{
  "$schema": "https://opencode.ai/config.json",
  // 环境变量（vision 等工具使用）
  "env": {
    "VISION_API_URL": "https://opencode.ai/zen/v1",
    "VISION_MODEL": "mimo-v2.5-free",
    "VISION_API_KEY": "你的API KEY"
  }
}