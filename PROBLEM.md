# PROBLEM.md

find_function 只看类型(`undefined` 能过)、predict 选项少可被暴力试、用户答案必须自己写 `forall`、出题人手写数据出错。

## 判题层

### ~~J1 infer_type 答案可以直接填 `CorrectSig`~~ *(已解决)*

~~答案被替换进 `type UserSig = {{USER_CODE}}`,而 `CorrectSig`、`check1`、`check2` 在同一个模块里。Haskell 顶层声明顺序无关,提交 `CorrectSig` 这个名字,`UserSig` 就等于标准答案,两个 check 恒成立。~~
> **解决记录**：在 `app/judge/dispatcher.py` 中，判题时对 `CorrectSig`、`TargetSig`、`check1`、`check2` 等内部标识符注入随机 token 后缀；直接提交内部名字会导致未定义报错，彻底杜绝作弊。

### ~~J2 判错详情可能泄漏正确类型~~ *(已解决)*

~~infer 判错时 `judge_detail` 是 GHC 原始输出,类型不匹配的报错通常带 Expected / Actual 的展开类型。~~
> **解决记录**：判错脱敏过滤：保留用户代码语法错误与 `Not in scope: type variable`，对断言类型不匹配的行统一转为无泄漏的通用提示，并隐藏 `Actual` 真实目标类型与 `Probable cause`。

### ~~J3 `_ensure_module_header` 会破坏文件头 pragma~~ *(已解决)*

~~`app/judge/ghc_runner.py` 只跳过空行和 `--` 注释。scaffold 以 `{-# LANGUAGE ... #-}` 开头时,`module Judge where` 会插在 pragma 前面,pragma 失效。现在 infer 不需要扩展所以没触发,以后需要扩展的题会静默出错。~~
> **解决记录**：已重构 `_ensure_module_header`，跳过开头连续的注释和 `{-# ... #-}` pragma 块后再插入 `module Judge where`。

### ~~J4 判题期间一直占着数据库连接,没有并发上限~~ *(已解决)*

~~`app/routers/submissions.py` 的 `submit` 是同步函数,session 贯穿整个请求。查完题目后事务已开,连接要到 `commit` 才归还,中间 GHC 最长跑 10 秒。连接池是 SQLAlchemy 默认值(5 加 10 溢出),十几个并发提交就会让其他接口排队。限流只按 IP,同时运行的 GHC 进程数没有上限,每个最多 512MB。~~
> **解决记录**：
> 1. 在 `app/config.py` 和 `app/judge/ghc_runner.py` 中引入 `max_concurrent_ghc`（默认 4）及全局 `BoundedSemaphore` 控制 GHC 并发数量；
> 2. `submissions.py` 在查完题目后立即回滚/释放连接，GHC 判题完毕后再写入提交，彻底消除长连接占用。

### ~~J5 编辑题目后历史提交不重判~~ *(已解决)*

~~改成删题目删除相应所有记录 不需要弄重判~~
> **解决记录**：在管理员删除题目 `DELETE /admin/problems/{slug}` 时，自动级联删除该题关联的所有提交记录 `Submission`，避免由于历史提交外键约束导致无法删除。

## 通用

### ~~G1 分页参数没有边界~~ *(已解决)*

~~`problems.py`、`submissions.py`、`admin.py` 里的 `page`、`page_size` 都没有范围限制。`page=0` 得到负 offset,Postgres 报错,接口返回 500。~~
> **解决记录**：所有分页端点均已引入 `Query(default=1, ge=1)` 与 `Query(ge=1, le=100/1000)` 显式校验。

## 前端与前后端契约

### F1 forall 提示缺失

`src/pages/Quiz.tsx` 的 infer 输入框前缀是 `f ::`,看起来是普通签名,而普通签名的隐式量化是自动的,用户习惯不写 `forall`。判错后只看到一段 GHC 报错,看不出原因。
建议(只改前端):infer 题目区加一行固定说明,placeholder 给 `forall a. a -> a`;判错且 `judge_detail` 含 `Not in scope: type variable` 时,在原文下追加"类型变量需要显式 forall"。

### ~~F2 `remark` 在题目页不显示~~ *(已解决)*

~~`ProblemDetailResponse` 返回 `remark`,`Quiz.tsx` 没有渲染它。同时 `remark` 在公开接口里原样返回。~~
> **解决记录**：已在 `Quiz.tsx` 页面顶部渲染 `category` 标签以及带高亮强调样式的 `💡 Note:` Remark 提示框。

### ~~F3 输入框前缀写死在前端~~ *(已解决)*

~~`Quiz.tsx` 的 `prefixOf` 里 infer 是 `f ::`,find 是 `target =`,没有和 scaffold 绑定。scaffold 里的函数名一换,界面和判题拼法就对不上,没有任何报错。~~
> **解决记录**：前后端解耦。前端支持占位符 `{{INFER_TYPE_NAME}}` 与 `{{FIND_FUNCTION_NAME}}` 动态替换，并在 Profile 中支持用户自定义偏好函数名。

### ~~F4 admin 写接口返回类型对不上~~ *(已解决)*

~~后端 `create_problem`、`update_problem` 返回 `ProblemDetailResponse`(有 `display`,没有 `judge_config`),前端 `adminCreateProblem`、`adminUpdateProblem`、`adminPublishToggle` 标的是 `ProblemAdminDetail`(有 `judge_config`)。弹窗现在不用返回值所以没出事,读 `res.judge_config` 会得到 `undefined`。~~
> **解决记录**：后端 `POST /admin/problems` 和 `PUT /admin/problems/{slug}` 已统一返回 `ProblemAdminDetail`，包含完整的 `judge_config`。

### ~~F5 `remark` 清不掉~~ *(已解决)*

~~前端 `remark: cur.remark || undefined`,清空后字段被丢掉;后端 `update_problem` 用 `is not None` 判断。改成空永远保存不了。~~
> **解决记录**：前端表单清空 remark 时显式传递 `null`；后端基于 Pydantic 的 `model_fields_set` 精确区分未传与显式置空，支持清空 remark。

### ~~F6 admin 表单可能看不到 422 的字段错误~~ *(已解决)*

~~后端有 slug 正则、title 长度、difficulty 范围。FastAPI 默认 422 的 `detail` 是数组,`adminFetch` 只在 `detail` 是字符串时使用它,否则显示 `HTTP 422 /admin/problems`。`app/errors.py` 没读,可能已经转换过,需要看实际返回。~~
> **解决记录**：后端全局捕获 `RequestValidationError`，将 Pydantic 错误数组格式化为人类可读的字符串 `field: error_msg`，前端弹窗可以直接完整看到具体的校验错误。

### ~~F7 题目页换题可能不刷新~~ *(已解决)*

~~`Quiz.tsx` 的 `load(slug)` 只在组件创建时调用一次,不是响应式的。`@solidjs/router` 在路由 pattern 不变、只有参数变化时通常复用组件,所以 prev / next 之后页面可能不换题。需要实测。~~
> **解决记录**：已在 `Quiz.tsx` 中使用 Solid 的 `createEffect` 响应式监听 `params.id`，换题时即刻触发 `load(slug)` 重新拉取渲染。

### F8 小问题

- 提交失败时显示 `String(err)`,带 `ApiError:` 前缀,应使用 `err.message`。
<!-- - 键盘选项快捷键只覆盖 A 到 D。 -->
- prev / next 的列表来自公开接口(只含已发布题目),admin 预览草稿时进度文字为空,prev / next 不可用。

## 没读的文件

`app/errors.py`、`app/dtos/error.py`、`app/auth/dependencies.py`、`app/services/*`、`app/models/{submission,user,ban,progress}.py`、`app/main.py`、`app/db.py`、`src/types/api-types.ts`、其他前端页面。涉及它们的结论(J4 的连接占用、J5 对榜单的影响、F6)需要复审者确认。
