# Python 编码规范

## 目录
- [项目结构规范](#项目结构规范)
- [代码格式化](#代码格式化)
- [命名规范](#命名规范)
- [注释规范](#注释规范)
- [变量和常量](#变量和常量)
- [控制结构](#控制结构)
- [函数设计](#函数设计)
- [错误处理](#错误处理)
- [模块和包管理](#模块和包管理)
- [面向对象编程](#面向对象编程)
- [性能优化](#性能优化)
- [测试规范](#测试规范)
- [工具使用](#工具使用)

---

## 项目结构规范

注意：**存量项目既有项目结构时无需遵守此规范，按照已有项目结构组织代码**

### 目录组织

```
my_project/
├── src/                    # 源代码目录
│   ├── __init__.py
│   ├── main.py            # 程序入口
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑
│   └── utils/             # 工具函数
├── tests/                 # 测试目录
│   ├── __init__.py
│   ├── test_models/
│   └── test_services/
├── docs/                  # 文档目录
├── requirements.txt       # 依赖文件
├── setup.py              # 包配置
└── README.md             # 项目说明
```

### 包命名规范
- **包名**: 使用小写，简短，如 `models`, `services`
- **模块名**: 使用小写，下划线分隔，如 `user_service.py`
- **每个包必须有 `__init__.py`** 文件

---

## 代码格式化

### 基本要求
- 遵循 PEP 8 规范
- 使用 4 个空格缩进，禁止使用 Tab
- 行长建议不超过 79 字符（代码）或 72 字符（注释）
- 文件末尾保留一个换行符
- 使用空行分隔函数和类定义（顶级定义之间两行，类内方法之间一行）

### 示例
```python
# 正确
def calculate(a: int, b: int) -> int:
    result = a + b
    return result

# 错误 - 使用 Tab 缩进
def calculate(a, b):
	result = a + b  # 使用了 Tab
	return result
```

---

## 命名规范

### 基本原则
- 使用有意义的名称，避免单字母变量（循环计数器除外）
- 遵循 Python 的命名约定
- 避免使用保留字和内置函数名

### 命名约定
| 类型 | 规范 | 示例 |
|------|------|------|
| 模块/包 | 小写，下划线分隔 | `user_service`, `data_utils` |
| 变量 | 小写，下划线分隔 | `user_name`, `count` |
| 常量 | 大写，下划线分隔 | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| 函数/方法 | 小写，下划线分隔 | `calculate_sum`, `parse_input` |
| 类名 | 大驼峰（PascalCase） | `UserConfig`, `HttpRequest` |
| 异常类 | 大驼峰，Error 后缀 | `ValidationError`, `ConnectionError` |
| 私有变量/方法 | 前导下划线 | `_internal_var`, `_helper_method` |
| 类型别名 | 大驼峰 | `UserId`, `CallbackType` |

### 示例
```python
# 正确
MAX_CONNECTIONS = 100
DEFAULT_TIMEOUT = 30

class UserService:
    def __init__(self, db_connection: DatabaseConnection):
        self._db = db_connection
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        pass

# 错误 - 命名不规范
maxConnections = 100  # 应为 MAX_CONNECTIONS
def getUserById():    # 应为 get_user_by_id
    pass
```

---

## 注释规范

### 模块注释
- 每个模块文件开头应有文档字符串
- 描述模块的用途和主要内容

```python
"""
用户服务模块。

提供用户相关的业务逻辑操作，包括用户创建、查询、更新和删除。
"""
```

### 函数/方法注释
- 使用 docstring 格式
- 说明功能、参数和返回值
- 使用 Google、NumPy 或 Sphinx 风格

```python
def parse_config(path: str) -> Config:
    """读取并解析配置文件，返回 Config 实例。
    
    Args:
        path: 配置文件路径
        
    Returns:
        Config 实例
        
    Raises:
        FileNotFoundError: 如果文件不存在
        ValueError: 如果文件格式错误
    """
    pass
```

### 类注释
- 类定义后立即添加 docstring
- 描述类的职责和使用方式

```python
class UserService:
    """用户服务类。
    
    提供用户相关的业务逻辑操作，包括用户创建、查询、更新和删除。
    
    Attributes:
        db: 数据库连接实例
    """
    pass
```

### 行内注释
- 解释"为什么"而非"是什么"
- 使用 `# ` 加空格
- 与代码至少一个空格分隔
- 复杂逻辑必须添加说明

```python
# 正确
x = x + 1  # 补偿边界情况

# 错误
x = x + 1  # x 加 1
```

---

## 变量和常量

### 变量声明
- 使用类型注解（推荐）
- 避免不必要的 None 初始化
- 使用有意义的默认值

```python
# 正确
count: int = 0
name: str = ""
is_active: bool = False

# 正确 - 类型注解
users: list[User] = []
config: dict[str, Any] = {}

# 避免 - 不必要的显式初始化
result = None  # 除非确实需要
result = calculate()  # 直接赋值更好
```

### 常量声明
- 模块级别定义
- 使用大写和下划线
- 明确用途

```python
# 正确
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30.0
STATUS_CODES = {
    "success": 200,
    "error": 500,
}

# 错误 - 魔术数字
if status == 200:  # 应使用 STATUS_CODES["success"]
    pass
```

---

## 控制结构

### if 语句
- 条件表达式不加括号（除非必要）
- 使用 truthiness 检查
- 避免与 True/False/None 直接比较（除非必要）

```python
# 正确
if items:
    process(items)

if not is_valid:
    return error

if name is None:
    return default_name

# 错误
if len(items) > 0:  # 应为 if items:
    pass

if is_valid == True:  # 应为 if is_valid:
    pass
```

### for 循环
- 优先使用 enumerate 获取索引
- 使用列表推导式（简单情况）
- 使用生成器（大数据集）

```python
# 正确
for i, item in enumerate(items):
    print(f"{i}: {item}")

# 列表推导式
squares = [x**2 for x in range(10)]

# 生成器表达式
squares_gen = (x**2 for x in range(1000000))

# 错误 - 使用索引访问
for i in range(len(items)):
    print(f"{i}: {items[i]}")
```

### while 循环
- 确保有退出条件
- 使用 break/continue 谨慎

```python
# 正确
while not done:
    result = process_next()
    if result is None:
        break
```

### try/except 语句
- 捕获具体异常，避免裸 except
- 异常范围尽量小

```python
# 正确
try:
    result = parse(data)
except ValueError as e:
    logger.error(f"Parse failed: {e}")
    return default
except FileNotFoundError:
    logger.error("File not found")
    raise

# 错误 - 捕获所有异常
try:
    result = parse(data)
except:  # 太宽泛
    pass
```

---

## 函数设计

### 函数签名
- 参数数量适中（建议不超过 5 个）
- 使用类型注解
- 使用默认参数（谨慎处理可变默认值）

```python
# 正确
def create_client(
    host: str,
    port: int = 8080,
    timeout: float = 30.0,
    retries: int = 3,
) -> Client:
    pass

# 错误 - 可变默认值
def add_item(item: str, items: list = []):  # 应为 items: list | None = None
    items.append(item)
    return items
```

### 返回值
- 明确返回类型
- 使用 Optional 表示可能返回 None
- 使用元组返回多个值

```python
# 正确
def divide(a: float, b: float) -> tuple[float, str | None]:
    if b == 0:
        return 0.0, "Division by zero"
    return a / b, None

# 正确 - Optional
def find_user(user_id: int) -> Optional[User]:
    pass
```

### 函数长度
- 单一职责原则
- 建议不超过 50 行
- 过长函数应拆分

---

## 错误处理

### 基本原则
- 使用异常而非返回码
- 异常信息应清晰且有上下文
- 使用异常链保留原始异常

```python
# 正确
try:
    result = parse(data)
except ValueError as e:
    raise ParseError(f"Failed to parse data: {e}") from e

# 错误 - 忽略异常
try:
    result = parse(data)
except:
    pass
```

### 自定义异常
- 继承 Exception 或更具体的异常类
- 提供有意义的错误信息

```python
class ValidationError(Exception):
    """验证错误异常。"""
    
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"Validation error on {field}: {message}")
```

### 异常层次结构
- 创建基类异常
- 具体异常继承基类

```python
class AppError(Exception):
    """应用基础异常。"""
    pass

class UserNotFoundError(AppError):
    """用户未找到异常。"""
    pass

class InvalidUserError(AppError):
    """无效用户异常。"""
    pass
```

---

## 模块和包管理

### 导入规范
- 标准库优先
- 第三方库次之
- 本地包最后
- 每组之间空一行

```python
# 正确
import os
import sys
from typing import Optional

import requests
from flask import Flask

from .models import User
from .services import user_service

# 错误 - 导入顺序混乱
from .models import User
import os
import requests
```

### 避免循环导入
- 使用局部导入解耦
- 重构代码结构

### `__init__.py` 使用
- 可以暴露公共 API
- 避免在 `__init__.py` 中写业务逻辑

```python
# __init__.py
"""用户服务包。"""

from .user_service import UserService
from .user_model import User

__all__ = ["UserService", "User"]
```

---

## 面向对象编程

### 类设计
- 单一职责原则
- 使用属性装饰器管理访问
- 优先组合而非继承

```python
# 正确
class UserService:
    def __init__(self, db: DatabaseConnection):
        self._db = db
    
    @property
    def db(self) -> DatabaseConnection:
        return self._db
    
    def create_user(self, name: str) -> User:
        pass

# 错误 - 过度继承
class AdminUserService(UserService, AuthService, LogService):
    pass
```

### 魔术方法
- 实现常用的魔术方法
- `__str__` 和 `__repr__` 至少实现一个

```python
class User:
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name
    
    def __repr__(self):
        return f"User(id={self.id}, name='{self.name}')"
    
    def __str__(self):
        return self.name
```

### 数据类
- 使用 dataclass 简化数据类
- 使用 frozen 实现不可变

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class UserConfig:
    host: str
    port: int
    timeout: float = 30.0
```

---

## 性能优化

### 列表/字典推导式
- 优先使用推导式
- 复杂逻辑使用生成器

```python
# 正确
squares = [x**2 for x in range(10)]
user_map = {u.id: u for u in users}

# 大数据集使用生成器
squares_gen = (x**2 for x in range(1000000))
```

### 字符串拼接
- 使用 f-string（Python 3.6+）
- 使用 join 拼接大量字符串

```python
# 正确
name = "World"
message = f"Hello, {name}!"

# 大量字符串拼接
parts = ["hello", "world", "python"]
result = " ".join(parts)

# 避免 - 低效拼接
result = ""
for part in parts:
    result += part + " "
```

### 缓存
- 使用 functools.lru_cache 或 functools.cache

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

---

## 测试规范

### 测试文件
- 与被测模块对应
- 测试文件以 `test_` 开头
- 测试函数以 `test_` 开头

```python
# test_user_service.py
import pytest
from src.services.user_service import UserService

def test_create_user():
    service = UserService()
    user = service.create_user("John")
    assert user.name == "John"
    assert user.id is not None
```

### 使用 pytest fixture
- 使用 fixture 管理测试数据
- 使用 parametrize 参数化测试

```python
import pytest

@pytest.fixture
def user_service():
    return UserService()

@pytest.mark.parametrize("name,expected", [
    ("John", "John"),
    ("Jane", "Jane"),
])
def test_create_user(user_service, name, expected):
    user = user_service.create_user(name)
    assert user.name == expected
```

### 测试覆盖率
- 使用 pytest-cov 检查覆盖率
- 目标覆盖率 80%+

---

## 工具使用

### 格式化工具
| 工具 | 用途 | 命令 |
|------|------|------|
| `black` | 代码格式化 | `black .` |
| `isort` | 导入排序 | `isort .` |
| `autopep8` | PEP 8 自动修复 | `autopep8 --in-place .` |

### Lint 工具
| 工具 | 用途 | 命令 |
|------|------|------|
| `flake8` | 代码风格检查 | `flake8 .` |
| `pylint` | 代码质量检查 | `pylint .` |
| `mypy` | 类型检查 | `mypy .` |

### 测试工具
| 工具 | 用途 | 命令 |
|------|------|------|
| `pytest` | 测试框架 | `pytest` |
| `pytest-cov` | 覆盖率检查 | `pytest --cov=src` |

### 建议配置

```toml
# pyproject.toml 示例
[tool.black]
line-length = 88
target-version = ['py39']

[tool.isort]
profile = "black"
line_length = 88

[tool.mypy]
python_version = "3.9"
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
```

---

## 安全最佳实践

### 输入验证
- 始终验证外部输入
- 使用白名单而非黑名单
- 使用 pydantic 进行数据验证

```python
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    age: int = Field(..., ge=0, le=150)
```

### SQL 注入防护
- 使用 ORM 或参数化查询
- 避免字符串拼接 SQL

```python
# 正确 - 使用 ORM
user = session.query(User).filter(User.id == user_id).first()

# 正确 - 参数化查询
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# 错误
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)
```

### 敏感信息
- 不在代码中硬编码密钥
- 使用环境变量或配置管理
- 使用 python-dotenv 管理环境变量

```python
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
```
