# Python 编码规范

> 适用：所有 Python 代码生成与审查。每条规则均为可执行判定，Review 时逐条核对。
> 已删除 PEP 8 复述、跨章重复与无效示例，保留并强化项目级约束。

## 1. 项目基线（动手前先确认）

- **行宽 88**（black 默认值），全项目统一，不再讨论
- **目标 Python 版本**：以项目已有配置为唯一真相源，优先级 `pyproject.toml` > `setup.py` > CI 配置；无任何声明时按 **3.10+** 处理
  - 3.10+：`str | None`、`list[User]`、`dict[str, Any]`
  - 需兼容 3.9 及以下：`Optional[str]`、`List[User]`、`Dict[str, Any]`
  - **同一项目内禁止混用**上述两种写法
- 缩进 / 空行 / 引号以 `black` + `isort` 输出为准，不做人工争论
- 存量项目已有目录结构时沿用其结构，不套本文档默认布局

## 2. 命名（下表为唯一标准）

| 类型 | 规则 | 示例 |
|------|------|------|
| 模块 / 包 | 小写 + 下划线，简短 | `user_service`、`data_utils` |
| 变量 / 函数 / 方法 | 小写 + 下划线 | `user_name`、`get_user_by_id` |
| 常量 | 大写 + 下划线，模块级 | `MAX_RETRIES`、`DEFAULT_TIMEOUT` |
| 类 / 异常 | 大驼峰；异常以 `Error` 结尾 | `UserConfig`、`ValidationError` |
| 私有成员 | 前导下划线 | `_db`、`_helper` |
| 类型别名 | 大驼峰 | `UserId`、`CallbackType` |

- 名称必须有意义，**禁止拼音与无意义缩写**（用 `count` 而非 `cnt`）
- 禁止用内置名 / 保留字做标识符（`id`、`type`、`list` 需加后缀消歧）
- 布尔变量用 `is_` / `has_` / `can_` 前缀

## 3. 类型注解与变量

- 公开函数的**参数与返回值必须有完整类型注解**；无返回值标 `-> None`
- 变量声明优先带注解：`count: int = 0`、`users: list[User] = []`
- 常量集中模块级定义，**禁止魔术数字**（`if status == 200` → `STATUS_CODES["success"]`）
- 避免无意义的 `None` 预初始化，直接赋值

## 4. 函数与类

**函数**

- 参数建议 ≤ 5 个，超出时用 dataclass 或配置对象封装
- 单一职责，函数体建议 ≤ 50 行，超长必须拆分
- 多返回值用 `tuple` 或 dataclass，不用裸字典
- 可能为 `None` 的返回值必须显式标注（`User | None`）
- **禁止可变默认值**（共享状态陷阱）：

```python
# 禁止
def add_item(item: str, items: list = []) -> list: ...

# 正确
def add_item(item: str, items: list[str] | None = None) -> list[str]:
    items = [] if items is None else items
```

**类**

- 优先组合而非继承，父类不超过 2 个
- 对外只读成员用 `@property` 暴露，内部存 `_` 前缀私有属性
- 数据类优先 `@dataclass(frozen=True)`；所有字段必须标注类型
- `__repr__` 必须实现（日志与调试依赖），`__str__` 可选

## 5. 错误与异常

- 用异常而非返回码表达错误
- **禁止裸 `except:` 与 `except Exception: pass`**；必须捕获具体异常类型，范围尽量小
- try 块只包裹可能抛异常的代码
- 重新抛出时保留原始异常链：`raise ParseError(f"...{e}") from e`
- 预期内的失败分支不要用异常做控制流
- 自定义异常继承统一的业务基类 `AppError(Exception)`，命名以 `Error` 结尾

## 6. 注释与文档字符串

- **注释必须使用中文**，中英文字符及标点之间**保留一个空格**（与 Go 规范一致）
- docstring **统一 Google 风格**，模块 / 类 / 公开函数必写
- 行内注释解释「为什么」而非「做什么」，复杂逻辑必加
- 函数 docstring 必须含 `Args:` / `Returns:` / `Raises:`；类 docstring 说明职责并列出 `Attributes:`

```python
def parse_config(path: str) -> Config:
    """读取并解析配置文件。

    Args:
        path: 配置文件路径。

    Returns:
        Config 实例。

    Raises:
        FileNotFoundError: 文件不存在。
        ValueError: 文件格式错误。
    """
```

## 7. 导入与包

- 导入顺序：标准库 → 第三方 → 本地，三组之间**空一行**，组内按字母序
- 禁止 `from xxx import *`
- 循环导入用局部导入或重构模块解决，禁止用延迟 `import` 掩盖结构问题
- `__init__.py` 只负责暴露公共 API 并声明 `__all__`，**禁止写业务逻辑**

## 8. 测试

- 框架 pytest；文件名 `test_*.py`，测试函数 `test_*`
- 测试数据用 fixture 管理，多组数据用 `@pytest.mark.parametrize`
- 覆盖率目标 **≥ 80%**（`pytest --cov`）
- 单个用例只验证一个行为，`assert` 失败信息需说明含义

## 9. 安全底线

- 外部输入必须校验，优先 pydantic 模型约束（`Field(min_length=...)`、`EmailStr`）
- SQL 必须走 ORM 或参数化占位符，**禁止 f-string 拼接 SQL**
- 禁止硬编码密钥 / 口令，统一走环境变量或配置中心
- 日志输出前对密码、密钥、身份证等敏感字段脱敏

## Review Checklist

生成或审查 Python 代码时逐条自检：

- [ ] 已确认目标 Python 版本，注解风格未混用（`X | None` vs `Optional[X]`）
- [ ] 公开函数参数与返回值均有完整类型注解
- [ ] 无魔术数字，常量为模块级 `UPPER_SNAKE`
- [ ] 无可变默认值陷阱（`items: list = []`）
- [ ] 函数 ≤ 5 参数、≤ 50 行，职责单一
- [ ] 无裸 `except:` / `except Exception: pass`；异常链用 `raise ... from e`
- [ ] 注释为中文，中英文之间保留空格
- [ ] docstring 为 Google 风格，`Args` / `Returns` / `Raises` 齐全
- [ ] 命名无拼音 / 无意义缩写，符合第 2 节表格
- [ ] 导入分三组且空行分隔；`__init__.py` 无业务逻辑
- [ ] 类实现了 `__repr__`；不可变数据类用 `@dataclass(frozen=True)`
- [ ] SQL 全部参数化，外部输入均已校验
- [ ] 无硬编码密钥，日志敏感字段已脱敏
- [ ] 已执行 `black` + `isort` + `flake8` + `mypy`，无告警
