# MonadBeat 题目规范与设计指南 (Problem Specification & Authoring Guide)

本文档面向 MonadBeat 出题人与维护者，详细说明题目类型规范、判题机制原理、脚手架模板结构以及 JSON 配置格式。

---

## 题目基础元数据 (Problem Metadata)

在数据库 `problem` 表及后台管理中，一道题目的基础属性包含：

| 字段 | 类型 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `title` | `str` | 题目名称，简明表达题目考察意图 | `"Identify the type of Map.filterWithKey"` |
| `slug` | `str` | 唯一 URL 标识符（连字符全小写命名） | `"map-filterwithkey"` |
| `difficulty` | `int` | 难度等级（1 到 5 级） | `2` |
| `problem_type` | `enum` | 题型：`infer_type` \| `find_function` \| `predict_behavior` | `"infer_type"` |
| `category` | `list[str]` | 分类标签数组 | `["Data.Map", "higher-order"]` |
| `remark` | `str \| null` | 题目光标提示/注解说明（可为空） | `"注意 key 和 value 在回调中的顺序"` |
| `is_published` | `bool` | 是否公开发布（草稿为 `false`） | `true` |
| `judge_config` | `JSON` | 对应题型的核心判题与展示配置 | *(见下节详细定义)* |

---

## 题型详解与脚手架模板 (Templates & Scaffolds)

### 推导类型签名 (`infer_type`)

#### 核心准则

1. **显式量化**：Standalone 类型签名中，凡是泛型类型变量在用户填写的答案中**必须使用显式 `forall`**（例如 `forall a. [a] -> Int`），不可使用隐式推断变量，否则 GHC 会报 `Not in scope: type variable`。
2. **唯一主类型**：给出的展示代码必须能推导出唯一的主类型（Principal Type），不能产生歧义或让类型别名脱节。
3. **等价断言而非字符匹配**：判题通过 GHC 类型系统进行双向子类型推导（`id` 恒等绑定），杜绝字符串字面量比对。
4. **防作弊机制**：判题引擎会对 `CorrectSig`、`TargetSig`、`check1`、`check2` 注入随机 Token 后缀，用户提交自身名字直接报未定义。

#### 脚手架结构 (`scaffold`)

```haskell
__EXTENSIONS_AND_IMPORTS__

type UserSig = {{USER_CODE}}

type CorrectSig = __CORRECT_SIGNATURE__

check1 :: CorrectSig -> UserSig
check1 f = f

check2 :: UserSig -> CorrectSig
check2 f = f

ref :: CorrectSig
ref = __FUNCTION_IMPLMENTATION__
```

#### JSON 配置示例

```json
{
  "problem_type": "infer_type",
  "display_snippet": "Map.filterWithKey",
  "scaffold": "import qualified Data.Map as Map\ntype CorrectSig = forall k a. (k -> a -> Bool) -> Map.Map k a -> Map.Map k a\ntype UserSig = {{USER_CODE}}\ncheck1 :: CorrectSig -> UserSig\ncheck1 = id\ncheck2 :: UserSig -> CorrectSig\ncheck2 = id"
}
```

---

### 实现满足签名的函数 (`find_function`)

1. **杜绝底值作弊**：判题引擎硬性正则过滤 `undefined` 和 `error`，禁止使用底值或崩溃占位。
2. **约束严密**：目标类型签名必须完全收敛，禁止留下能被平凡恒等函数（如 `id`、`const`）侥幸混过的漏洞。若类型较为泛型，可通过额外的断言检查特定测试用例。
3. **防自身引用**：判题引擎会对 `target` 注入随机 Token 后缀。

#### 脚手架结构 (`scaffold`)

```haskell
__EXTENSIONS_AND_IMPORTS__

target :: __TARGET_SIGNATURE__
target = {{USER_CODE}}
```

#### JSON 配置示例

```json
{
  "problem_type": "find_function",
  "display_snippet": "[Int] -> [Int]",
  "scaffold": "import Data.List (sortOn)\nimport Data.Ord (Down(..))\ntarget :: [Int] -> [Int]\ntarget = {{USER_CODE}}"
}
```

---

### 预测代码行为 (`predict_behavior`)

1. **考察点典型**：重点考察惰性求值（Laziness）、弱首范式（WHNF）、短路、求值时机（`seq` / `$!`）、无限列表截断（`take`）、模式匹配与异常抛出时机。
2. **选项设计**：
   - 必须提供 3 到 7 个选项（推荐 4 项，对应 A/B/C/D）；
   - 选项应覆盖具体运算结果、抛出异常（Exception）、编译错误（Compile Error）、无限循环等高迷惑性分支；
   - `correct_index` 为正确项在原始 `options` 列表中的下标索引（`0-indexed`）。
3. **防暴力枚举机制**：
   - 前端在每轮加载或答错后会自动打乱（Shuffle）选项展示，并做下标映射；
   - 后端对答错连续递增惩罚冷却：第 1 次答错冷却 5 秒，第 2 次冷却 15 秒，第 3 次及以上冷却 30 秒。

#### JSON 配置示例

```json
{
  "problem_type": "predict_behavior",
  "display_code": "xs = 1 : 2 : error \"boom\" : []\nresult = take 2 xs",
  "options": [
    "throw exception \"boom\"",
    "return [1, 2] normally",
    "compile error",
    "infinite loop"
  ],
  "correct_index": 1
}
```

## 难度定义

难度按“一个懂 Haskell 基础的人解出这道题要多久、要用到多少概念”来分，不看代码长度。表达式写得短也可以很难，`(.) . (.)` 就是例子。

### 通用标尺

| 难度 | 一个熟悉基础的人要花的时间 | 涉及的概念 |
| --- | --- | --- |
| 1 | 不到 1 分钟 | 单个函数，没有高阶 |
| 2 | 1 到 3 分钟 | 一层高阶，或者两个函数组合 |
| 3 | 3 到 10 分钟 | 多层高阶、`(.)` / `flip` 组合，或者有一个常见陷阱 |
| 4 | 10 到 30 分钟 | 带类型类约束、高阶类型（`f`、`t`），或者需要知道 WHNF、`seq` |
| 5 | 30 分钟以上 | 多个类型类叠加、continuation 风格、knot-tying |

难度应当跨题型可比。

### infer_type

| 难度 | 例子 | 答案 |
| --- | --- | --- |
| 1 | `f = not` | `Bool -> Bool` |
| 1 | `f = fst` | `forall a b. (a, b) -> a` |
| 2 | `f = flip map` | `forall a b. [a] -> (a -> b) -> [b]` |
| 3 | `f = map . filter` | `forall a. (a -> Bool) -> [[a]] -> [[a]]` |
| 3 | `f = foldr (.) id` | `forall a. [a -> a] -> a -> a` |
| 4 | `f = (.) . (.)` | `forall a b c d. (c -> d) -> (a -> b -> c) -> a -> b -> d` |
| 4 | `f = fmap . fmap` | `forall f g a b. (Functor f, Functor g) => (a -> b) -> f (g a) -> f (g b)` |
| 5 | `f = traverse . traverse` | `forall f t u a b. (Applicative f, Traversable t, Traversable u) => (a -> f b) -> t (u a) -> f (t (u b))` |

- 加分项：类型变量个数，有没有类型类约束，有没有高阶类型，是否有“直觉上会推错”的陷阱（`map . filter` 就是，我最早也写错了）。
- 带约束的签名，用户要在 `forall` 后面把约束一起写出来，写起来更累，所以带约束至少给到 4。
- 带约束的写法我没在 `check f = f` 这个判题方式下跑过，出这类题之前先本地验一次。

### find_function

这类题只看类型检查，虽然判题层硬性过滤了 `undefined` / `error`，但依然容易被 `id` / `const` 等平凡函数蒙混过关，所以难度反映的是“诚实地找出一个正确解要多久”。

| 难度 | 目标类型 | 一个解 |
| --- | --- | --- |
| 1 | `a -> a` | `id` |
| 1 | `a -> b -> a` | `const` |
| 2 | `(a -> b -> c) -> b -> a -> c` | `flip` |
| 2 | `(a -> b) -> (b -> c) -> a -> c` | `flip (.)` |
| 3 | `a -> (a -> r) -> r` | `flip id` |
| 3 | `(a -> Maybe b) -> [a] -> Maybe [b]` | `traverse`（需要 scaffold 里的类型签名对得上） |
| 4 | `Applicative f => f (a -> b) -> f a -> f b` | `(<*>)` |
| 5 | `((a -> r) -> r) -> (a -> (b -> r) -> r) -> (b -> r) -> r` | continuation 的 bind，要手写 lambda |

- 能直接想起一个库函数的，比必须手写 lambda 的容易。
- 需要 import 才能做出来的题，难度不要低于 2，而且 import 要写在 scaffold 里。

### predict_behavior

| 难度 | 代码 | 结果 |
| --- | --- | --- |
| 1 | `length [undefined, undefined]` | `2` |
| 1 | `fst (1, undefined)` | `1` |
| 2 | `take 3 (cycle [1,2])` | `[1,2,1]` |
| 3 | `let xs = 1 : map (*2) xs in take 4 xs` | `[1,2,4,8]` |
| 3 | `any even [1..]` | `True`（碰到 2 就停） |
| 4 | `foldl (\_ x -> x) 0 [undefined, 2]` | `2`（`foldl` 是惰性的，不会碰到 `undefined`） |
| 4 | `(\_ -> undefined) `seq` 1` | `1`（函数值已经是 WHNF） |
| 5 | `(\ ~(a, b) -> 1) undefined` 对比 `(\ (a, b) -> 1) undefined` | `1` 与异常 |
| 5 | `let (a, b) = (b + 1, 1) in a` | `2`（knot-tying） |

出这类题要避开三种内容：

1. 答案依赖优化级别或 GHC 版本的。
2. 依赖栈溢出阈值、RTS 参数的（比如“会不会爆栈”）。
3. 选项里要求写出具体报错文本的。

这些答案在你自己机器上和别人机器上可能不一样，而判题只看你写的 `correct_index`。

### 分布和排序

- 数量大致做成金字塔：难度 1、2、3、4、5 的比例约 2:3:3:2:1。5 级太多会劝退，太少又没有天花板。
- 题目页的顺序就是 `id` 升序，所以导入时按主题分组，组内由易到难，`prev` / `next` 才有学习曲线。
- 先让你那位朋友试做每一道，按他实际花的时间定难度，不要按自己的感觉定。两个人感觉差两级以上的题，多半是题干有歧义，先改题再定难度。
- 难度会决定得分。发布以后改难度，已经拿到的分数会跟着变（`services/leaderboard.py` 是实时通过 SQL 聚合计算，改难度后榜单即刻同步），所以难度尽量在发布前定好。

## 一个容易出错的地方

infer 的 `CorrectSig` 要自己手算，不要凭直觉写。给每道题的 scaffold 末尾加两行自检：

```haskell
ref :: CorrectSig
ref = map . filter
```

GHC 能通过，说明你写的类型确实是这个表达式的类型。这样难度 3 和 4 的题（最容易手滑）就不会把错的标准答案发布出去。
