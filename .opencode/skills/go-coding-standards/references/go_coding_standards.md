# Go 语言编码规范

## 目录
- [项目结构规范](#项目结构规范)
- [代码格式化](#代码格式化)
- [命名规范](#命名规范)
- [注释规范](#注释规范)
- [变量和常量](#变量和常量)
- [控制结构](#控制结构)
- [函数设计](#函数设计)
- [错误处理](#错误处理)
- [包管理](#包管理)
- [并发编程](#并发编程)
- [性能优化](#性能优化)
- [测试规范](#测试规范)
- [工具使用](#工具使用)

---

## 项目结构规范

注意：**存量项目已经有项目结构时无需遵守此规范，按照已有项目结构组织代码**

### 目录组织

```
EasyStrategyGo/
├── App/                    # 应用程序目录
│   ├── B2BDispatcher/     # 具体应用模块
│   │   ├── Config/        # 配置模块
│   │   ├── Dispatcher/    # 调度/路由模块
│   │   └── main.go        # 程序入口
├── internal/              # 内部共享包（私有包）
│   ├── B2BBridge/        # B2B 桥接模块
│   ├── BizCommon/        # 业务公共模块
│   └── DSBridge/         # DS 桥接模块
├── pkg/                  # 公共工具包（可复用）
│   ├── DBBridge/        # 数据库桥接
│   ├── Golog/           # 日志工具
│   └── Utils/           # 通用工具
└── clib/                # C 语言库文件
```

### 包命名规范
- **App 层**: 使用小写包名，如 `package config`, `package dispatcher`
- **internal 层**: 包名与目录名一致，如 `package b2bbridge`
- **pkg 层**: 包名简洁明了，如 `package golog`, `package dbbridge`

---

## 代码格式化

### 基本要求
- 始终使用 `go fmt` 格式化代码
- 使用 Tab 缩进，而非空格
- 行长建议不超过 120 字符
- 文件末尾保留一个换行符

### 示例
```go
// 正确
func calculate(a, b int) int {
	result := a + b
	return result
}

// 错误 - 不必要的空格
func calculate(a, b int) int {
    result := a + b  // 使用空格而非 Tab
    return result
}
```

---

## 命名规范

### 基本原则
- 使用有意义的名称，避免单字母变量（循环计数器除外）
- 遵循 Go 的可见性规则：大写开头 = 导出，小写开头 = 私有
- 包名使用小写，避免下划线和驼峰
- 接口命名：单个方法用 `-er` 后缀（如 `Reader`），多方法用 `Interface` 后缀

### 命名约定
| 类型 | 规范 | 示例 |
|------|------|------|
| 包名 | 小写，简短 | `encoding/json` |
| 变量 | 驼峰式 | `userName`, `count` |
| 常量 | 驼峰式 | `MaxRetries`, `defaultTimeout` |
| 函数/方法 | 驼峰式 | `CalculateSum`, `parseInput` |
| 类型/结构 | 驼峰式 | `UserConfig`, `httpRequest` |
| 接口 | `-er` 或 `-or` 后缀 | `Reader`, `Writer`, `Stringer` |
| 错误变量 | 以 `Err` 前缀 | `ErrNotFound`, `ErrInvalidInput` |

### 示例
```go
// 正确
package httpclient

var (
    ErrTimeout     = errors.New("connection timeout")
    DefaultRetries = 3
)

type Config struct {
    Host    string
    Timeout time.Duration
}

// 错误 - 包名大写
package HTTPClient  // 应为 httpclient
```

---

## 注释规范

### 包注释
- 每个包必须有包注释
- 位于 `package` 声明之前
- 描述包的用途和主要内容

```go
// Package config 提供配置文件读取和解析功能
package config
```

### 函数/方法注释
- 每个导出的函数/方法必须有注释
- 以函数名开头，说明功能和参数
- 简洁明了，避免冗余

```go
// ParseConfig 读取并解析配置文件，返回 Config 实例
// 如果文件不存在或格式错误，返回相应的 error
func ParseConfig(path string) (*Config, error) {
    // ...
}
```

### 行内注释
- 解释"为什么"而非"是什么"
- 使用 `//` 加空格
- 复杂逻辑必须添加说明

---

## 变量和常量

### 变量声明
- 优先使用短变量声明 `:=`
- 多个同类型变量可分组声明
- 避免不必要的零值初始化

```go
// 正确
var (
    count     int
    name      string
    isActive  bool
)

// 正确 - 短声明
result := calculate()

// 错误 - 不必要的显式初始化
var result int = 0  // 应为 result := 0 或直接 var result int
```

### 常量声明
- 相关常量使用 `iota` 分组
- 明确类型避免隐式转换问题

```go
// 正确
type Status int

const (
    StatusPending Status = iota
    StatusActive
    StatusInactive
)

// 错误 - 魔术数字
if status == 0 {  // 应使用 StatusPending
    // ...
}
```

---

## 控制结构

### if 语句
- 条件表达式不加括号
- 简短的条件变量可在 if 中声明
- 避免不必要的 else

```go
// 正确
if err := parse(data); err != nil {
    return err
}

// 正确 - 提前返回
if !isValid {
    return ErrInvalid
}
process()

// 避免 - 不必要的 else
if isValid {
    process()
} else {
    return ErrInvalid
}
```

### for 循环
- 使用 `:=` 声明循环变量
- 范围遍历使用 `range`

```go
// 正确
for i := 0; i < len(items); i++ {
    // ...
}

for _, item := range items {
    // ...
}

// 正确 - 同时获取索引和值
for i, item := range items {
    // ...
}
```

### switch 语句
- 默认带有 break 行为
- 使用 `fallthrough` 显式穿透

```go
// 正确
switch status {
case "active":
    handleActive()
case "inactive":
    handleInactive()
default:
    handleUnknown()
}
```

### select 语句
- 用于 channel 操作
- `default` 用于非阻塞操作

```go
// 正确
select {
case msg := <-ch:
    handle(msg)
case <-ctx.Done():
    return ctx.Err()
case <-time.After(timeout):
    return ErrTimeout
}
```

---

## 函数设计

### 函数签名
- 参数数量适中（建议不超过 5 个）
- 多参数同类型可合并声明
- 返回错误应作为最后一个返回值

```go
// 正确
func NewClient(host string, port int, timeout time.Duration) (*Client, error) {
    // ...
}

// 避免 - 参数过多
func NewClient(host string, port int, timeout time.Duration, retries int, 
               debug bool, logger *log.Logger) (*Client, error) {
    // 应使用配置结构体
}
```

### 返回值
- 错误优先返回
- 明确命名返回值（仅在必要时）
- 避免裸返回（`return` 不带值）

```go
// 正确
func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// 正确 - 命名返回值（复杂情况）
func ParseRequest(data []byte) (req *Request, err error) {
    if len(data) == 0 {
        return nil, errors.New("empty data")
    }
    req = &Request{}
    // ... 解析逻辑
    return req, nil
}
```

### 函数长度
- 单一职责原则
- 建议不超过 50 行
- 过长函数应拆分

---

## 错误处理

### 基本原则
- 错误是值，应显式处理
- 不要忽略错误（使用 `_` 需谨慎）
- 错误信息应清晰且有上下文

```go
// 正确
result, err := parse(data)
if err != nil {
    return fmt.Errorf("parse failed: %w", err)
}

// 错误 - 忽略错误
result, _ := parse(data)  // 除非确定不需要错误

// 错误 - 无上下文
if err != nil {
    return err  // 应添加上下文
}
```

### 错误包装
- 使用 `fmt.Errorf` + `%w` 包装错误
- 使用 `errors.Is` 和 `errors.As` 检查错误

```go
// 正确
if err != nil {
    return fmt.Errorf("database query failed: %w", err)
}

// 检查错误
if errors.Is(err, ErrNotFound) {
    // 处理特定错误
}

// 提取错误类型
var dbErr *DatabaseError
if errors.As(err, &dbErr) {
    // 使用 dbErr
}
```

### 自定义错误
- 实现 `error` 接口
- 提供错误类型判断能力

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on %s: %s", e.Field, e.Message)
}
```

---

## 包管理

### 导入规范
- 标准库优先
- 第三方库次之
- 本地包最后
- 使用 `go mod` 管理依赖

```go
// 正确
import (
    // 标准库
    "context"
    "fmt"
    "time"
    
    // 第三方
    "github.com/gin-gonic/gin"
    
    // 本地包
    "myapp/config"
    "myapp/utils"
)
```

### 循环导入
- 避免包之间的循环依赖
- 使用接口解耦

---

## 并发编程

### Goroutine
- 明确 goroutine 的生命周期
- 避免 goroutine 泄漏
- 使用 `context` 控制取消

```go
// 正确 - 使用 context 控制
func Process(ctx context.Context, data []Item) error {
    for _, item := range data {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            go processItem(ctx, item)
        }
    }
    return nil
}

// 错误 - goroutine 泄漏
func Process(data []Item) {
    for _, item := range data {
        go func(i Item) {
            // 没有取消机制
            processItem(i)
        }(item)
    }
}
```

### Channel
- 明确 channel 的所有者
- 由发送方关闭 channel
- 使用缓冲 channel 需谨慎

```go
// 正确
func Worker(ctx context.Context, jobs <-chan Job, results chan<- Result) {
    for {
        select {
        case job, ok := <-jobs:
            if !ok {
                return
            }
            results <- process(job)
        case <-ctx.Done():
            return
        }
    }
}
```

### WaitGroup
- 使用 `defer wg.Done()`
- `Add` 在 goroutine 启动前调用

```go
// 正确
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func(i Item) {
        defer wg.Done()
        process(i)
    }(item)
}
wg.Wait()
```

### Mutex
- 使用指针接收者
-  defer 解锁
- 优先使用 channel

```go
// 正确
type Counter struct {
    mu    sync.Mutex
    value int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}
```

---

## 性能优化

### 切片
- 预分配容量（已知大小时）
- 使用 `copy` 而非逐个赋值

```go
// 正确
result := make([]int, 0, len(input))
for _, v := range input {
    result = append(result, v*2)
}

// 错误 - 无预分配
var result []int
for _, v := range input {
    result = append(result, v*2)  // 多次扩容
}
```

### 字符串拼接
- 使用 `strings.Builder`
- 避免 `+` 拼接大量字符串

```go
// 正确
var sb strings.Builder
for _, s := range parts {
    sb.WriteString(s)
}
result := sb.String()

// 避免 - 低效拼接
result := ""
for _, s := range parts {
    result += s  // 每次创建新字符串
}
```

### Map
- 预分配容量（已知大小时）
- 注意并发访问

```go
// 正确 - 预分配
m := make(map[string]int, expectedSize)

// 正确 - 并发安全
type SafeMap struct {
    mu   sync.RWMutex
    data map[string]int
}
```

---

## 测试规范

### 测试文件
- 与被测文件同名 + `_test.go` 后缀
- 测试函数以 `Test` 开头
- 表驱动测试优先

```go
// 正确
func TestCalculate(t *testing.T) {
    tests := []struct {
        name     string
        input    int
        expected int
    }{
        {"positive", 5, 10},
        {"negative", -3, -6},
        {"zero", 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := calculate(tt.input)
            if result != tt.expected {
                t.Errorf("got %d, want %d", result, tt.expected)
            }
        })
    }
}
```

### 基准测试
- 使用 `testing.B`
- 调用 `b.ReportAllocs()`

```go
func BenchmarkCalculate(b *testing.B) {
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        calculate(i)
    }
}
```

---

## 工具使用

### 内置工具
| 工具 | 用途 | 命令 |
|------|------|------|
| `go fmt` | 格式化代码 | `go fmt ./...` |
| `go vet` | 静态检查 | `go vet ./...` |
| `go test` | 运行测试 | `go test ./...` |
| `go mod tidy` | 整理依赖 | `go mod tidy` |

### 推荐工具
- `staticcheck` - 高级静态分析
- `golangci-lint` - 集成 lint 工具
- `gofumpt` - 更严格的格式化

### 建议配置
```yaml
# .golangci.yml 示例
linters:
  enable:
    - gofmt
    - govet
    - staticcheck
    - gosimple
    - ineffassign
    - unused
```

---

## 安全最佳实践

### 输入验证
- 始终验证外部输入
- 使用白名单而非黑名单

### SQL 注入防护
- 使用参数化查询
- 避免字符串拼接 SQL

```go
// 正确
rows, err := db.Query("SELECT * FROM users WHERE id = ?", userID)

// 错误
query := fmt.Sprintf("SELECT * FROM users WHERE id = %d", userID)
rows, err := db.Query(query)
```

### 敏感信息
- 不在代码中硬编码密钥
- 使用环境变量或配置管理
