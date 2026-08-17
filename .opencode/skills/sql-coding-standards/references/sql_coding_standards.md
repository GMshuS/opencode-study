# SQL 脚本编码规范

> 通用规范，兼容 MySQL / PostgreSQL / Oracle / SQL Server 等主流数据库。

## 一、 文件组织
- DDL、DML、存储过程、初始化数据分目录存放，禁止混写；命名 `序号_类型_描述_版本.sql`。
- 脚本必须幂等（DDL 用 `IF (NOT) EXISTS`，DML 先查后插或 `MERGE`）；多表变更用事务包裹。
- 文件头必须包含变更说明、作者、日期、版本。

## 二、 命名规范
禁止拼音/无意义缩写，统一小写 `snake_case`，禁止驼峰、保留字。
- 约束前缀：主键 `pk_表名`、外键 `fk_表名_关联表`、唯一 `uk_表名_字段`、索引 `idx_表名_字段`、临时表 `tmp_`。
- 存储过程/函数动词开头：`sp_update_user_status`、`fn_get_user_balance`。

```sql
CREATE TABLE user_account (user_id BIGINT, user_name VARCHAR(64), created_time TIMESTAMP); -- 正确
CREATE TABLE UserAccount (UserID BIGINT, userName VARCHAR(64));                            -- 错误：驼峰
```

## 三、 注释规范
注释解释"为什么"而非"做什么"。
- 表与每个字段必须用 `COMMENT` 说明业务含义。
- 仅复杂逻辑、非直觉业务处加注释；禁止与 SQL 重复的废话注释。

```sql
CREATE TABLE order_info (
    order_id     BIGINT      COMMENT '订单唯一标识',
    order_no     VARCHAR(64) COMMENT '业务订单号',
    status       TINYINT     COMMENT '状态：0-待支付 1-已支付 2-已取消',
    created_time TIMESTAMP   COMMENT '创建时间'
) COMMENT '订单主表';
```

## 四、 书写格式
- 关键字大写、标识符小写；每行不超过 120 字符。
- 子句独立成行，条件换行缩进对齐；JOIN 独立一行，ON 紧随。
- 字符串单引号，日期 `YYYY-MM-DD HH:MM:SS`；常量放运算符右侧。

```sql
SELECT u.user_id, o.order_no, o.amount
FROM user_account u
INNER JOIN order_info o ON o.user_id = u.user_id
WHERE u.status = 1 AND o.created_time >= '2026-01-01 00:00:00'
ORDER BY o.created_time DESC;
-- 错误：select u.user_id,u.user_name from user_account u where u.status=1;  （小写/不换行）
```

## 五、 DDL 规范
- 主键用无业务含义的代理主键（自增/雪花），禁止用业务字段。
- 类型最小化：数字禁 VARCHAR；金额用 DECIMAL；时间用 DATE/TIMESTAMP 禁字符串；文本用 VARCHAR(n)，TEXT/BLOB 慎用。
- 除主键外尽量 NOT NULL 并显式 DEFAULT；公共字段 `id`、`created_time`、`updated_time`（必要时 `deleted_flag`）。
- 字符集统一（MySQL 用 utf8mb4）。

```sql
CREATE TABLE user_account (
    id           BIGINT        NOT NULL AUTO_INCREMENT COMMENT '主键',
    user_name    VARCHAR(64)   NOT NULL COMMENT '用户名',
    balance      DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '余额',
    created_time TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用户账户表';
-- 错误：balance FLOAT / created_time VARCHAR(20)  （精度丢失、时间用字符串）
```

## 六、 DML 规范
- 禁止 `SELECT *`，必须显式列名；INSERT 必须指定列。
- UPDATE/DELETE 必须带 WHERE，严禁无条件全表操作。
- 避免隐式类型转换；分页用 `LIMIT 偏移, 行数` 并配合 ORDER BY。
- 大批量 DML 分批提交（每批约 1000 条）；多表查询必须用表别名。

```sql
SELECT u.user_id, u.user_name FROM user_account u
WHERE u.status = 1 ORDER BY u.user_id LIMIT 20, 10;
INSERT INTO user_account (user_name, status, created_time) VALUES ('zhangsan', 1, NOW());
-- 错误：SELECT * / INSERT 省略列名 / UPDATE 无 WHERE
```

## 七、 索引与性能
- 为高频 WHERE/ORDER BY/JOIN 字段建索引，区分度要高；低区分度字段不单独建。
- 高频查询设计覆盖索引；复合索引满足最左前缀，区分度高的列放前面。
- 禁止索引列套函数/运算/隐式转换，禁止 `LIKE '%xx%'` 前缀通配。
- 复杂查询必须用 EXPLAIN 验证执行计划。

```sql
WHERE created_time >= '2026-01-01 00:00:00'  -- 正确
WHERE YEAR(created_time) = 2026              -- 错误：索引列套函数，失效
WHERE user_name LIKE '%zhang%'               -- 错误：前缀通配，无法用索引
```

## 八、 事务与锁
- 短事务、边界清晰；禁止事务内做远程调用、循环查询等耗时操作。
- 多表更新按固定顺序加锁，避免死锁。
- UPDATE/DELETE 必须带精确条件并命中索引，避免行锁升级为表锁。

```sql
BEGIN;
UPDATE account_info SET balance = balance - 100 WHERE account_id = 1001;
UPDATE order_info SET status = 1 WHERE order_id = 2001;
COMMIT;
-- 错误：事务内 SELECT 全表 + CALL 远程调用（长事务）
```

## 九、 安全规范
- 禁止字符串拼接 SQL，必须用参数化/预编译语句，杜绝 SQL 注入。
- 用户可控输入（排序、分页字段）必须白名单校验。
- 最小权限：应用账号仅授 SELECT/INSERT/UPDATE/DELETE，严禁 DROP/TRUNCATE/ALTER 及 root。
- 敏感数据禁明文存储、查询脱敏展示；业务数据逻辑删除；生产/测试脚本分离。

```sql
SELECT * FROM user_account WHERE user_name = ?;  -- 正确：预编译
-- 错误：拼接 "SELECT * FROM user_account WHERE user_name = '" + userName + "'"
```