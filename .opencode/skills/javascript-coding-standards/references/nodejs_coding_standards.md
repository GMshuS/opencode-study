# Node.js 编码规范

## 1. 基本风格
- 使用2空格缩进
- 字符串使用单引号（'）
- 始终使用分号

## 2. 模块规范
- 使用`const`声明常量
- 使用`require()`导入模块
- 模块导出使用`module.exports`

## 3. 异步处理
- 优先使用async/await
- 回调函数遵循Error-first约定
- 避免回调地狱（Callback Hell）

## 4. 错误处理
- 使用try/catch处理同步错误
- 异步错误使用`.catch()`或Error-first回调
- 始终处理Promise拒绝

## 5. 性能优化
- 避免阻塞操作
- 使用Stream处理大文件
- 合理使用缓存

## 6. 安全实践
- 验证所有用户输入
- 避免`eval()`和动态代码执行
- 使用HTTPS协议

## 7. 目录结构
- `src/` 存放源代码
- `test/` 存放测试代码
- `config/` 存放配置文件
- `docs/` 存放文档
- `public/` 存放静态资源
- 根目录放置 `package.json` 和 `README.md`