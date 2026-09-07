# C/C++ 编码规范


## 1. 目录结构

| 目录 | 用途 |
|------|------|
| `src/` | 核心源码（`.cpp` / `.cc` 与对应 `.h`），按业务模块划分子目录 |
| `include/` | 对外暴露的公共头文件；外部模块只依赖此目录，不得引用 `src/` 内部实现 |
| `thirdpart/` | 第三方库头文件与预编译二进制，与自身代码物理隔离 |
| `docs/` | 设计文档、API 文档（Doxygen 生成）、架构图、编译运行指南 |
| `tests/` | 单元与集成测试，与业务代码分离 |
| `build/` | 构建临时文件与产物输出，必须加入 `.gitignore` |

## 2. 命名（下表为唯一标准）

| 类型 | 规则 | 示例 |
|------|------|------|
| 类 | PascalCase，加 `C` 前缀 | `CNetworkManager` |
| 接口类 | PascalCase，加 `I` 前缀（或 `Interface` 后缀） | `ISerializable` |
| 结构体 | PascalCase，加 `T` 前缀 | `TNetworkConfig` |
| 函数 / 方法 | PascalCase，动宾结构（动词在前、名词在后） | `GetUserInfo` |
| 布尔返回值函数 | `Is` / `Has` / `Can` 前缀 | `IsValid` |
| 局部变量 | camelCase | `retryCount` |
| 成员变量 | `m_` 前缀 + camelCase | `m_retryCount` |
| 常量 / 宏 | 全大写 + 下划线 | `MAX_BUFFER_SIZE` |

- 标识符必须准确表达业务含义，**禁止拼音与无意义缩写**
- 常量优先 `const` / `constexpr`，**C++ 中避免使用宏定义常量**

## 3. 注释与文档

- 注释解释**「为什么这么做」**而非复述代码逻辑；统一 **Doxygen 风格**
- 文件头注释含 `@file` / `@brief` / `@author` / `@date`
- 类注释含 `@brief`；有线程安全等约束时必须加 `@note`
- 公开函数注释必须含 `@brief` / `@param`（标注 `[in]` / `[out]`）/ `@return`
- 行内注释仅用于复杂逻辑与非直觉操作；`TODO` 必须带责任人

```cpp
/**
 * @brief 用户数据管理器，负责处理用户的增删改查。
 * @note 该类不是线程安全的，多线程环境下需外部加锁。
 */
class CUserDataManager
{
public:
    /**
     * @brief 解析请求参数
     * @param strUrl     [out] URL 输出
     * @param strReqJson [out] JSON 请求数据输出
     * @param userObj    [in]  用户对象
     * @return true 成功，false 失败
     */
    bool ParseReqParam(string& strUrl, string& strReqJson, const CDispatchUser& userObj);
};

// TODO: 张三@company.com - 当前哈希算法性能较差，后续需替换为 SHA-256
```

## 4. 头文件包含顺序

```cpp
#include "data_processor.h"      // 1. 本类 / 本模块对应头文件

#include <iostream>              // 2. C/C++ 标准库
#include <string>
#include <vector>

#include <boost/asio.hpp>        // 3. 第三方 / 系统级库
#include <sys/types.h>

#include "network/socket.h"      // 4. 项目内部头文件
#include "utils/logger.h"
```

- **分组之间必须空行**
- 头文件**必须**使用 `#pragma once`
- 头文件**严禁** `using namespace xxx;`，必须显式书写命名空间（如 `std::string`）

## 5. 接口与变量暴露

遵循**最小权限原则**，默认 `private`，按需逐级放开：

```cpp
class CDatabaseConnection
{
private:
    std::string m_connectionString;   // 成员变量一律私有
    void InternalValidate();          // 内部辅助函数私有

protected:
    virtual void OnConnect();         // 仅在确实需要子类扩展时使用

public:
    bool Connect();                   // 仅对外暴露必要的接口
};
```

- 成员变量与内部辅助函数**默认 `private`**，**禁止直接暴露数据成员**
- `protected` 仅在确实需要子类扩展时使用，禁止滥用
- `public` 只保留对外必要的接口，禁止暴露内部实现逻辑

## 6. 代码格式

1. **大括号 Allman 风格**：`{` 与 `}` 均独立成行
2. **空格**：关键字后加空格，运算符前后各加一个空格
3. **行长 ≤ 120 字符**，超长必须换行
4. **强制大括号**：`if` / `else` / `for` / `while` / `do...while` 即使只有单条语句也必须用 `{}`

```cpp
if (userCount > 0)
{
    for (size_t i = 0; i < userCount; ++i)
    {
        ProcessUser(users[i]);
    }
}
else
{
    LogWarning("No users found");
}
```

## 7. 内存与资源管理

**RAII**：严禁裸指针 `new` / `delete`，资源统一由智能指针与容器托管。

```cpp
// 正确：智能指针自动管理内存
auto buffer = std::make_unique<char[]>(MAX_BUFFER_SIZE);

// 禁止：手动管理内存，极易泄漏
char* buffer = new char[MAX_BUFFER_SIZE];
delete[] buffer;
```

**构造函数只做轻量级初始化**：复杂或可能失败的操作（I/O、资源申请）抽取到 `Init()`，禁止在构造函数中执行并抛异常。

```cpp
class CFileHandler
{
public:
    explicit CFileHandler(const std::string& path) : m_filePath(path) {}

    bool Init()   // I/O 放在这里，失败可安全返回 false
    {
        return OpenFile(m_filePath);
    }

private:
    std::string m_filePath;
};
```

**防御性编程与消除魔法数字**：指针解引用前必须判空；字面量必须提取为具名常量。

```cpp
constexpr size_t MAX_RETRY_COUNT = 3;

// 正确：具名常量 + 边界检查
if (retryCount < MAX_RETRY_COUNT && ptr != nullptr)
{
    SafeExecute(ptr);
}

// 禁止：魔法数字 + 盲目解引用
if (retryCount < 3)
{
    ptr->Execute();
}
```
