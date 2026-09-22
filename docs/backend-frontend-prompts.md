# 商城后端接口交接 · 前端生成提示词

> 面向对象：前端同学（或 AI 代码生成器）。
> 后端工程：`mall-server`（Spring Boot 3.3.5 / JDK 21 / 单体，后续拆微服务）。
> 前端工程：`shopping-mall-frontend`（Vue 3 + Vite + Pinia + vue-router，**目前无 UI 组件库**）。
> 本文档 = ①接口总清单（人读） + ②逐页生成提示词（AI 读）。

---

## 如何使用本文件

1. **第 1 章「通用约定」必须整段带上**——它是所有提示词的系统上下文，缺了 AI 会瞎猜（比如把 `Result` 当裸对象、把 403 当 HTTP 403）。
2. 第 3 章每节是一段**可直接粘贴**的提示词，配合第 1 章一起发给 AI。
3. 一次只喂一个页面，别把十个页面塞进一个提示词——上下文太长反而会漏接口。
4. 建议先让 AI 产出 `src/api/*.js`（第 4 章有基准），再产出页面组件。

---

## 1. 通用约定（所有提示词共用，务必带上）

### 1.1 技术栈与既有约定

| 项 | 约定 |
|---|---|
| 框架 | Vue 3 `<script setup>` + Vite + Pinia + vue-router 4 |
| UI 组件库 | **当前未引入**。生成页面时默认按 **Element Plus** 写（表格/表单/弹窗/消息提示），如有其他偏好请替换 |
| 请求封装 | 已有 `src/api/request.js`（axios 实例），**新接口一律复用它，不要 new axios** |
| baseURL | `/api`，由 `vite.config.js` 代理到 `http://localhost:8080` 并**去掉 `/api` 前缀** |
| 登录态 | `localStorage.token`；`request.js` 请求拦截器自动加 `Authorization: Bearer <token>` |
| 状态管理 | `src/stores/user.js`（Pinia）：`token / userInfo / roles / hasRole(code) / login / logout / refreshUserInfo` |

### 1.2 响应结构（最重要，AI 最容易错）

后端**所有**接口统一返回：

```json
{ "code": 200, "message": "success", "data": {} }
```

- **`code === 200` 才算成功**，其余都是失败。
- `request.js` 的响应拦截器**已经把 `data` 解包并 return**，所以业务代码里 `const list = await listRoles()` 直接就是数组，**不要再写 `res.data`**。
- **关键陷阱**：业务失败（参数错误 400 / 权限不足 403）后端**仍以 HTTP 200 返回**，靠 body 里的 `code` 区分。`request.js` 会主动 `reject`，所以调用方只用 `try/catch`。
- **只有 401 是真实 HTTP 状态码**（由 `JwtInterceptor` 直接写出），此时 `request.js` 会自动清 token 并跳 `/login`，业务代码**不用处理**。

| code | 含义 | 前端表现 |
|---|---|---|
| 200 | 成功 | 正常渲染 |
| 400 | 参数校验失败（`message` 是具体字段提示） | 表单下方/消息条展示 `message` |
| 401 | 未登录 / 令牌失效 | **拦截器已处理**：清凭证跳登录 |
| 403 | 权限不足（缺某权限码） | 提示 `message`，**不要跳登录**（他是登录状态的） |
| 404 | 资源不存在 **或无权访问该资源**（防探测） | 展示「不存在或无权限」，勿暴露"存在但没权限" |
| 500 | 系统异常 | 通用错误提示 |

### 1.3 分页结构（所有 `page` 接口一致）

```json
{ "total": 37, "pages": 4, "current": 1, "size": 10, "records": [ ... ] }
```

请求参数固定为 query：`pageNum`(默认1) `pageSize`(默认10)，外加各接口自己的过滤参数。

### 1.4 鉴权与权限模型（前端要理解的三件事）

1. **登录入口只有一条**：`POST /user/login`，返回的 `token` 里带着该账号的**全部角色**（`userInfo.roles: string[]`，如 `["ADMIN","SELLER"]`）。不存在"卖家登录接口""管理员登录接口"，**不要按入口去裁剪角色**。
2. **前端权限控制只做按钮显隐**（体验层），真拦截在后端。所以：能做的是「没权限就别显示删除按钮」，**做不到**的是「不想被删就不给按钮」。
3. **权限码 ≠ 角色**。角色是 `ADMIN/SELLER/USER` 这类粗粒度分组；细粒度权限码是 `role:delete`、`shop:audit` 这种 `资源:动作`。
   - 当前前端 `stores/user.js` 只有 `hasRole()`。若要按权限码控制按钮，需要后端在 `/user/info` 里补 `permissions: string[]`（**当前没有，先按角色控制**）。

### 1.5 枚举字典（前后端约定，不要各页面自己写死文案）

| 枚举 | 值 | 含义 |
|---|---|---|
| 通用状态 | 0 / 1 | 禁用 / 正常 |
| 店铺状态 `shop.status` | 0 / 1 / 2 / 3 | 待审核 / 正常 / 已驳回 / 已冻结 |
| 商品状态 `product.status` | 0 / 1 | 下架 / 上架 |
| 权限类型 `permission.type` | 1 / 2 / 3 | 菜单 / 按钮 / 接口 |
| 角色 `builtIn` | 0 / 1 | 自定义 / 内置（内置角色禁删禁改 code） |

> 店铺状态**后端已给 `statusText` 中文**（`ShopVO.statusText`），前端**直接用**，不要再 switch 一份。

### 1.6 硬性规则（踩过坑，AI 生成时务必遵守）

1. **不要传 `userId` / `sellerId` 作为参数**。卖家侧接口（`/seller/**`）的服务端从令牌取当前用户，**没有**这类参数；你传了也不会被使用。想查"我的"就用 `/mine`、`/seller/product/page`。
2. **「分配角色」「分配权限」是全量覆盖语义**：提交的数组就是最终结果，传 `[]` = 清空。所以**必须先读后写**（先 `GET` 回显，用户改完再 `PUT` 全量）。
3. **上下架 / 启停用的 `status` 走 query 参数，不是 JSON body**：`PUT /admin/user/1/status?status=0`。
4. **图片字段分两层**：提交时传 **objectKey**（`coverKey` / `logoKey` / `images: []`），展示时用后端返回的 **完整 URL**（`coverUrl` / `logoUrl` / `imageUrls`）。**不要把 URL 存下来再提交回去**。
5. **AI 对话必须回传 `conversationId`**，否则每轮开新会话（表现为"模型失忆"，不报错）。

---

## 2. 接口总清单

> 路径均为**去掉 `/api` 前缀**的后端真实路径。权限码列为 `@RequiresPermission` 值，"仅登录"表示只校验令牌不校验权限，"免登录"表示在放行清单内。

### 2.1 认证 / 用户（前端已覆盖）

| 方法 | 路径 | 权限 | 请求 | 响应 |
|---|---|---|---|---|
| POST | `/user/login` | 免登录 | `{username, password}` | `{token, userInfo}` |
| POST | `/user/register` | 免登录 | `{username, password, phone?, email?, nickname?}` | `Long` 用户ID |
| GET | `/user/info` | 仅登录 | — | `UserVO` |
| GET | `/auth/sources` | 免登录 | — | `string[]` 如 `["wechat"]` |
| GET | `/auth/{source}/authorize-url` | 免登录 | query `state?` | `string` 授权URL |
| POST | `/auth/{source}/login` | 免登录 | `{code, state?}` | `{token, userInfo}` |

### 2.2 角色管理 `/admin/role` 🆕

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/admin/role/list` | `role:list` | — | `RoleVO[]`（**轻量，无权限明细**） |
| GET | `/admin/role/{id}` | `role:detail` | — | `RoleVO`（**含 `permissionIds[]` + `permissions[]`**） |
| POST | `/admin/role` | `role:create` | `RoleDTO` | `Long` 新角色ID |
| PUT | `/admin/role/{id}` | `role:update` | `RoleUpdateDTO`（**无 code**） | `null` |
| DELETE | `/admin/role/{id}` | `role:delete` | — | `null` |
| PUT | `/admin/role/{id}/permissions` | `role:permission` | `{permissionIds: Long[]}` | `null` |

### 2.3 权限字典 `/admin/permission` 🆕

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/admin/permission/list` | `permission:list` | — | `PermissionVO[]` |

> **只有 GET，没有增删改**——这是刻意的：权限码与代码强耦合，只随 SQL 脚本发布。**前端不要做"新建权限"入口。**

### 2.4 用户管理 `/admin/user`（前端部分覆盖）

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/admin/user/page` | `user:list` | query `pageNum,pageSize,keyword?,status?` | `PageVO<UserVO>` |
| GET | `/admin/user/{id}` | `user:detail` | — | `UserVO` |
| PUT | `/admin/user/{id}` | `user:update` | `{nickname?,email?,phone?,avatar?}` | `null` |
| PUT | `/admin/user/{id}/status` | `user:status` | **query** `status`(0/1) | `null` |
| PUT | `/admin/user/{id}/password` | `user:password` | `{newPassword}` (6-32) | `null` |
| DELETE | `/admin/user/{id}` | `user:delete` | — | `null` |
| GET | `/admin/user/{id}/roles` | `user:detail` | — | `Long[]` 已绑角色ID |
| PUT | `/admin/user/{id}/roles` | `role:assign` | `{roleIds: Long[]}` | `null` |

### 2.5 店铺 · 卖家端 `/seller/shop` 🆕

| 方法 | 路径 | 权限 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/seller/shop/mine` | **仅登录** | — | `ShopVO`；**无店铺 → 404** |
| POST | `/seller/shop/apply` | **仅登录** | `ShopDTO` | `Long` 店铺ID |
| PUT | `/seller/shop/mine` | `seller:shop` | `ShopDTO` | `null` |

> `/mine` 与 `/apply` **只要求登录**——因为还没通过审核的人根本没有 SELLER 角色。前端据此设计：404 → 展示"申请入驻"表单。

### 2.6 店铺 · 管理端 `/admin/shop` 🆕

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/admin/shop/page` | `shop:list` | query `pageNum,pageSize,keyword?,status?` | `PageVO<ShopVO>` |
| GET | `/admin/shop/{id}` | `shop:detail` | — | `ShopVO` |
| PUT | `/admin/shop/{id}` | `shop:update` | `ShopDTO` | `null` |
| PUT | `/admin/shop/{id}/audit` | `shop:audit` | `{status:1\|2\|3, rejectReason?}` | `null` |

> **没有 `POST /admin/shop`**：平台不能凭空给人开店，只能审核/维护。

### 2.7 商品 · 卖家端 `/seller/product` 🆕

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/seller/product/page` | `seller:product:list` | query `pageNum,pageSize,keyword?,status?` | `PageVO<ProductVO>` |
| GET | `/seller/product/{id}` | `seller:product:detail` | — | `ProductVO`；非本人 → 404 |
| POST | `/seller/product` | `seller:product:create` | `ProductDTO` | `Long` |
| PUT | `/seller/product/{id}` | `seller:product:update` | `ProductDTO` | `null` |
| PUT | `/seller/product/{id}/status` | `seller:product:status` | **query** `status`(0/1) | `null` |
| DELETE | `/seller/product/{id}` | `seller:product:delete` | — | `null` |

### 2.8 商品 · 管理端 `/admin/product` 🆕

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/admin/product/page` | `product:list` | query `pageNum,pageSize,keyword?,status?,categoryId?` | `PageVO<ProductVO>` |
| GET | `/admin/product/{id}` | `product:detail` | — | `ProductVO` |
| POST | `/admin/product` | `product:create` | `ProductDTO` | `Long` |
| PUT | `/admin/product/{id}` | `product:update` | `ProductDTO` | `null` |
| PUT | `/admin/product/{id}/status` | `product:status` | **query** `status` | `null` |
| DELETE | `/admin/product/{id}` | `product:delete` | — | `null` |

### 2.9 商品 · 前台 `/product`（免登录）

| 方法 | 路径 | 权限 | 请求 | 响应 |
|---|---|---|---|---|
| GET | `/product/page` | **免登录** | query `pageNum,pageSize,keyword?,categoryId?` | `PageVO<ProductVO>`（**只返回上架**） |
| GET | `/product/{id}` | **免登录** | — | `ProductVO` |

### 2.10 文件 `/file` 🆕

| 方法 | 路径 | 权限码 | 请求 | 响应 |
|---|---|---|---|---|
| POST | `/file/upload` | `file:upload` | `multipart/form-data`：`file`(图片≤5MB) + `category`(默认 `common`) | `{objectKey, url}` |

> `category` 建议取值：`product`（商品图）/ `avatar`（头像）/ `shop`（店铺Logo）。它只是对象存储的一级目录。

### 2.11 AI 对话 `/ai`（前端已覆盖，需升级）

| 方法 | 路径 | 权限 | 请求 | 响应 |
|---|---|---|---|---|
| POST | `/ai/chat` | **仅登录** | `{conversationId?, message}` | `ChatVO` |

```json
// ChatVO
{ "conversationId": "1f2e...", "reply": "……", "promptTokens": 312,
  "completionTokens": 88, "totalTokens": 400, "costMs": 4210 }
```

> ⚠️ `conversationId` **首轮不传、响应回传、后续轮次原样带回**。前端必须把它存起来（建议按会话存 localStorage 或 Pinia）。`message` ≤ 2000 字。

---

## 3. 逐页面生成提示词（可直接粘贴给 AI）

> 每段提示词**都要**配合第 1 章一起发。已按依赖顺序排列，建议从上往下做。

### 3.1 角色管理页 `/admin/roles`

```text
你在 Vue 3 + Vite + Element Plus 项目里新增一个「角色管理」页面。

【路由】/admin/roles，name=AdminRoles，meta: { requiresAuth: true, requiresRole: 'ADMIN' }，组件 src/views/admin/RoleManage.vue。

【要用到的接口】全部走 src/api/request.js（已封装，成功时直接返回 data）：
- GET  /admin/role/list            → RoleVO[]（轻量：id, code, name, description, builtIn, sort, status；无权限明细）
- GET  /admin/role/{id}            → RoleVO（含 permissionIds: number[], permissions: string[]）
- POST /admin/role                 body {code, name, description, status, sort} → 新角色 id
- PUT  /admin/role/{id}            body {name, description, status, sort}（注意：无 code）→ null
- DELETE /admin/role/{id}          → null
把这些封装进 src/api/role.js。

【页面结构】
1. 顶部「新增角色」按钮。
2. el-table 列：id、code、name、description、builtIn（0=自定义/1=内置，用 el-tag 区分）、sort、status（0禁用/1正常，用 el-switch 或 el-tag）、操作列。
3. 操作列：编辑、分配权限、删除。

【交互与规则（务必遵守）】
- 内置角色 builtIn===1：删除按钮**禁用**（disabled + tooltip「内置角色不可删除」），编辑时 code 字段**只读**。
- 新增表单字段：code（必填，正则 ^[A-Z][A-Z0-9_]{1,31}$，提示"大写字母开头，仅大写字母/数字/下划线，2-32位"）、name（必填，≤64）、description（≤255）、status（单选 0/1，必填）、sort（≥0）。
- 编辑表单**不含 code**（后端契约里就没有该字段，提交多余字段无效）。编辑前先 GET /admin/role/{id} 回显。
- 删除前 el-popconfirm 二次确认；删除失败时把后端返回的 message 原样提示（例如"内置角色不可删除""角色仍被用户持有"）。
- 失败处理：接口失败会抛异常，catch 后把 error.message 用 ElMessage.error 显示即可（后端业务错误 message 已是中文）。

【验收】
- 打开页面能列出全部角色；
- 新增/编辑/删除后表格自动刷新；
- 内置角色看不到可点的删除按钮。
```

### 3.2 权限分配弹窗（角色 → 权限勾选）

```text
在上一步的角色管理页里，实现「分配权限」弹窗（组件 src/components/PermissionAssignDialog.vue，或直接在 RoleManage.vue 内）。

【接口】
- GET /admin/permission/list → PermissionVO[]：{ id, code, name, type(1菜单/2按钮/3接口), sort, status }
- GET /admin/role/{id}       → 含 permissionIds: number[]（用于回显已勾选）
- PUT /admin/role/{id}/permissions  body { permissionIds: number[] }  → null

【结构】
1. el-dialog 打开时：并行拉「权限字典全量」+「该角色详情」，用 permissionIds 初始化勾选。
2. 权限按 type 分组展示（菜单/按钮/接口），或者更推荐：**按 code 的冒号前段分组**（如 user:*, role:*, shop:*, product:*, seller:*, file:*），每组一个 el-card，组内多选。分组信息从 code 前缀推导，无需额外接口。
3. 提交按钮调用 PUT。

【关键语义（必须实现正确）】
- 该接口是**全量覆盖**：提交的 permissionIds 就是最终结果，传 [] 表示清空该角色所有权限。
  所以流程必须是「先 GET 回显 → 用户勾选 → 全量 PUT」，不要试图做增量 add/remove 接口（后端没有）。
- 后端会拒绝移除 `role:permission` 这个权限点（它是"改角色权限的唯一入口"，移除会导致自锁）。
  前端在勾选面板里把 code==='role:permission' 的项设为**不可取消**（disabled），并在下方加一行说明。

【验收】
- 弹窗能正确回显该角色已勾选的权限；
- 全选/全不选/部分勾选提交后，重开弹窗结果一致；
- 取消勾选 role:permission 被阻止。
```

### 3.3 用户管理页增强 `/admin/users`（在既有 UserManage.vue 上改）

```text
改造现有 src/views/admin/UserManage.vue，补上「角色分配」。

【已存在】分页列表、启停用、重置密码、删除，接口在 src/api/admin.js。
【新增接口】
- GET  /admin/user/{id}/roles   → number[]  该用户已绑角色ID（回显）
- PUT  /admin/user/{id}/roles   body { roleIds: number[] } → null（全量覆盖，[]=清空）
- GET  /admin/role/list         → RoleVO[]（角色下拉数据源）

【改造点】
1. 操作列新增「分配角色」按钮 → 打开弹窗。
2. 弹窗内用 el-select multiple 或 el-checkbox-group，选项来自 listRoles()，用 value=role.id、label=`${role.code} - ${role.name}`。
3. 打开弹窗时并行拉「全部角色」和「该用户已绑角色ID」，用后者初始化选中值。
4. 提交调 PUT（全量）。提交前二次确认，因为这是提权操作。
5. 表格里新增一列角色，展示 userVO.roles（string[]，形如 ['ADMIN']），用 el-tag 渲染。

【注意】
- 分配角色需要权限码 role:assign（后端校验），前端按角色 ADMIN 显示按钮即可。
- 无法在界面上取消自己的 ADMIN 角色（后端会拒绝），失败时原样提示 message 即可。
```

### 3.4 店铺审核页 `/admin/shops`

```text
新增「店铺审核」管理页。

【路由】/admin/shops，name=AdminShops，meta { requiresAuth:true, requiresRole:'ADMIN' }，组件 src/views/admin/ShopManage.vue。api 放 src/api/shop.js。

【接口】
- GET /admin/shop/page?pageNum&pageSize&keyword&status  → PageVO<ShopVO>
- GET /admin/shop/{id}                                  → ShopVO
- PUT /admin/shop/{id}        body ShopDTO{name,logoKey,description,contactPhone} → null
- PUT /admin/shop/{id}/audit  body {status:1|2|3, rejectReason?} → null

【ShopVO 字段】id, userId, ownerUsername, name, logoUrl(完整URL), description, contactPhone, status(0待审/1正常/2驳回/3冻结), statusText(中文，直接用), rejectReason, createTime

【页面结构】
1. 顶部：关键词搜索（店铺名）、状态筛选 el-select（全部/待审核/正常/已驳回/已冻结）。默认默认无筛选。
2. el-table 列：id、logoUrl（el-image 100x100）、name、ownerUsername（店主登录名）、contactPhone、statusText（el-tag：0灰/1绿/2红/3橙）、createTime、操作列。
3. 操作列按 status 动态显示：
   - status===0（待审核）：[通过] [驳回]
   - status===1（正常）：[冻结]
   - status===2（已驳回）：[通过]  （允许改判）
   - status===3（已冻结）：[解冻]  → 即 status=1 通过
4. 「通过」直接 PUT audit {status:1}（可加二次确认）。
5. 「驳回」弹窗必填 rejectReason（≤255），提交 {status:2, rejectReason}。
6. 「冻结」二次确认后 PUT audit {status:3}，并提示"冻结将同时下架该店全部在售商品"。

【后端连带行为（无需前端处理，但提示文案要一致）】
审核动作在服务端是原子的：通过→授予店主 SELLER 角色；驳回/冻结→收回 SELLER 角色；冻结同时下架该店所有在售商品。

【验收】四种状态的按钮各不相同；驳回必须填原因；操作后列表刷新且状态文案来自 statusText。
```

### 3.5 卖家中心 · 我的店铺 `/seller/shop`

```text
新增「我的店铺」页（卖家/入驻申请页）。

【路由】/seller/shop，meta { requiresAuth:true }（**不设 requiresRole**，因为还没入驻的人也要能进来申请）。组件 src/views/seller/MyShop.vue。

【接口】
- GET  /seller/shop/mine   → ShopVO，**没有店铺时返回 404**
- POST /seller/shop/apply  body ShopDTO → 店铺id
- PUT  /seller/shop/mine   body ShopDTO → null   （需要 seller:shop 权限）

【ShopDTO】{ name(必填,≤64), logoKey(可空,≤512), description(≤512), contactPhone(可空, 正则 ^1[3-9]\d{9}$) }

【三种页面状态（由 /mine 的响应决定）】
1. 404（无店铺）→ 显示「申请入驻」表单（字段同上，含 Logo 上传）。提交 POST /apply。
2. 200 且 status===0（待审核）→ 只读展示店铺信息 + 醒目提示"审核中，请耐心等待"，隐藏编辑。
3. 200 且 status===1（正常）→ 展示店铺信息 + 「编辑资料」按钮（PUT /mine）。
4. 200 且 status===2（已驳回）→ 展示 **rejectReason**（红色告警框）+ 允许修改后重新提交（POST /apply 再次提交）。
5. 200 且 status===3（已冻结）→ 只读 + 提示"店铺已被冻结，请联系平台"，禁用编辑。

【要点】
- 调用 /mine 后如果 catch 到 404，不要当错误弹提示，而是切到「申请入驻」态。判断方式：error.message 里含"不存在"或后端返回 code=404（可按 message 兜底）。
- 表单**绝对不能有 status 字段**（后端契约里没有，店主不能自己把自己审核通过）。
- Logo 用上传组件（见 3.8），提交时传上传返回的 objectKey 到 logoKey；展示时用 ShopVO.logoUrl。

【验收】用「从未申请过的账号」打开显示申请表单；提交后刷新变"审核中"。
```

### 3.6 卖家中心 · 我的商品 `/seller/products`

```text
新增「我的商品」页。

【路由】/seller/products，meta { requiresAuth:true, requiresRole:'SELLER' }。组件 src/views/seller/MyProducts.vue。api 用 src/api/sellerProduct.js。

【接口】
- GET    /seller/product/page?pageNum&pageSize&keyword&status → PageVO<ProductVO>
- GET    /seller/product/{id}  → ProductVO（非本人的商品返回 404）
- POST   /seller/product       body ProductDTO → id
- PUT    /seller/product/{id}  body ProductDTO → null
- PUT    /seller/product/{id}/status?status=0|1 → null   （注意 status 走 query，不是 body）
- DELETE /seller/product/{id}  → null

【ProductDTO】{ name(必填≤128), subtitle(≤255), categoryId(number), price(必填,≥0,最多8位整数2位小数),
 originalPrice(≥0), stock(必填,≥0整数), coverKey(封面 objectKey), images(string[] objectKey), description, status(0下架/1上架，不传默认下架), sort }

【ProductVO 展示字段】id,name,subtitle,categoryId,sellerId,price,originalPrice,stock,sales,coverUrl,imageUrls,description,status,sort,createTime

【页面结构】
1. 顶部：关键词搜索、状态筛选（全部/上架/下架）、「新增商品」按钮。
2. el-table 列：coverUrl(el-image)、name、subtitle、price(¥)、stock、sales、status(el-switch 直接切换上下架)、操作列（编辑/删除）。
3. 新增/编辑用**抽屉或独立路由页**（字段多）：表单含名称、副标题、分类、价格、原价、库存、封面（单图上传）、图集（多图上传，最多建议 5 张）、详情（textarea）、排序。
4. 上下架：点 el-switch → 调 PUT status（query 传 status）→ 成功后刷新。
5. 删除：el-popconfirm 二次确认。

【关键：图片字段**
- 上传后拿到 {objectKey, url}。**表单里存 objectKey**（coverKey / images[]），**预览用 url**。
- 编辑回显时：ProductVO 给的是 coverUrl / imageUrls（完整 URL），提交时必须**换回 objectKey**。
  若后端未同时返回 key，则编辑未改动图片时不提交该字段，或按 url 反查（本项目 url 即 key 的拼接，可用 url 去掉域名前缀得到 key——实际请与后端确认）。
- 商品价格用 el-input-number 或精确到两位小数的输入，禁止用 float 做展示运算。

【权限】所有 /seller/** 接口由后端从令牌取当前用户，**前端不要传 sellerId**。
```

### 3.7 管理端 · 商品管理 `/admin/products`

```text
新增「商品管理」管理页（全平台商品）。

【路由】/admin/products，meta { requiresAuth:true, requiresRole:'ADMIN' }。组件 src/views/admin/ProductManage.vue。

【接口】/admin/product 下的 page / {id} / POST / PUT / {id}/status / DELETE，
参数与卖家端一致，差异是：page 多了 categoryId 过滤参数；无数据归属限制（能管全平台）。
另可复用前台 GET /product/page 做只读校验。

【页面结构】与 3.6 高度相似，但：
- 表格多一列「来源」：sellerId===0 显示 el-tag「平台自营」，否则显示「卖家 #sellerId」。
- 状态筛选包含「全部/上架/下架」；额外有分类筛选 categoryId。
- 不显示"我的商品"，展示全部商品。
- 操作列：编辑（可改商品信息）、上下架、删除。

【与卖家端的关系（要在代码注释里体现，避免以后合并出 bug）】
同一件事有两个入口，权限码完全不同：
  /admin/product/{id}  + product:update         → 能改全平台任意商品
  /seller/product/{id} + seller:product:update  → 只能改自己的
两者**不要合并**，注意别把 ADMIN 页面的接口误用到卖家页。
```

### 3.8 图片上传组件（通用）🆕

```text
封装一个通用图片上传组件 src/components/ImageUploader.vue，供商品封面/图集、店铺Logo、用户头像复用。

【接口】POST /file/upload，multipart/form-data：
- file: File（图片，≤5MB）
- category: string（product / shop / avatar / common）
响应 data: { objectKey: string, url: string }

【组件 API（props/emits）】
- props: modelValue（string 单图，或 string[] 多图）、category、limit（默认 1）、maxSizeMB(默认5)
- emits: update:modelValue
- 单图模式：上传后显示 url 缩略图 + 删除按钮，v-model 绑的是 **objectKey**。
- 多图模式：v-model 绑 string[]（objectKey 数组），可拖拽排序、逐张删除。

【实现要点】
1. 手写 <input type="file"> 或 el-upload 的 http-request 自定义上传（务必走 request.js，自动带 Authorization 头）。
2. 前端先做一次校验：大小 ≤ maxSizeMB、类型 image/*（后端还会做魔数校验，前端这层只是省流量与体验）。
3. 上传成功后：把返回的 **objectKey** 写进 v-model，同时**本地记一份 objectKey → url 的映射**用于预览。
   这样父组件拿到的始终是 key，展示用 url，符合后端"提交传key、展示用url"的约定。
4. 上传失败：ElMessage.error(message)。
5. 支持进度条（el-upload 自带）。

【验收】在商品表单里能上传封面并预览，提交的 payload 里是 objectKey 而不是 URL。
```

### 3.9 前台 · 商品列表与详情（免登录）

```text
新增前台商品浏览页。

【路由】/ 商品列表（可改造现有 Home.vue）；/products/:id 商品详情。两个页面都**不需要登录**。

【接口（免登录，放行清单内，不要带 token 也能调）】
- GET /product/page?pageNum&pageSize&keyword&categoryId → PageVO<ProductVO>（只返回上架商品）
- GET /product/{id} → ProductVO

【列表页】
- 顶部搜索框（商品名/卖点模糊），分类筛选。
- 商品卡片网格（el-row/el-col 或 CSS grid）：coverUrl 图、name、subtitle、price（¥，突出）、originalPrice（划线，若存在）、sales。
- 分页 el-pagination，绑定 total/current/size，切页重新请求。

【详情页】
- 大图（imageUrls 轮播）+ 商品名/副标题/价格/原价/库存/销量。
- 详情描述（description）。
- 「加入购物车 / 立即购买」按钮**先置灰或提示"功能开发中"**——后端购物车与订单尚未实现，不要假装能下单。

【注意】
- price/originalPrice 是字符串形式的金额（BigDecimal 序列化），展示时格式化两位小数即可，**不要做浮点运算**。
- 这两个接口是免登录的，但 request.js 有 token 时会自动带上，无妨。
```

### 3.10 AI 助手升级（接多轮会话）

```text
改造现有 AI 助手（src/api/ai.js + src/components/AiPet.vue）。

【现状】ai.js 只有 chat(message)，每次调用开新会话。
【接口】POST /ai/chat  body { conversationId?, message }  → { conversationId, reply, promptTokens, completionTokens, totalTokens, costMs }

【改造点】
1. conversationId 是**有状态**的：
   - 首轮请求**不传** conversationId；
   - 拿到响应后，把 data.conversationId **保存下来**（Pinia store 或 localStorage）；
   - 之后每一轮都**原样带上**它。
2. 不带的后果不是报错，而是每轮开新会话 → 表现为"模型失忆"，并且悄悄多花钱。所以必须存。
3. 提供「新对话」按钮：清空本地 conversationId 与消息列表（后端是 append-only，无法删除单条）。
4. 请求超时必须单独覆盖为 60000ms（大模型逐 token 生成，全局 10s 会假超时：前端报网络异常、后端还在生成并计费）。
   ai.js 里已经是这个写法，沿用即可。
5. 展示 token 用量与耗时（ChatVO 里有），开发阶段让成本可见。
6. message 长度限制 2000 字，超长前端先拦截。

【验收】连续问两轮，第二轮能"记得"第一轮内容；点「新对话」后不再带着旧 conversationId。
```

---

## 4. 建议的 api 模块文件

> 现有 `src/api/` 已有 `request.js`、`user.js`、`admin.js`、`social.js`、`ai.js`。建议按下表补文件，一个业务域一个文件。

| 文件 | 内容 |
|---|---|
| `api/role.js` | 角色 CRUD + 分配权限 + 权限字典 list |
| `api/shop.js` | 管理端店铺 page/detail/update/audit |
| `api/sellerShop.js` | 卖家端 mine/apply/updateMine |
| `api/product.js` | 前台商品 page/detail |
| `api/adminProduct.js` | 管理端商品 CRUD |
| `api/sellerProduct.js` | 卖家端商品 CRUD |
| `api/file.js` | 上传 |

**示例（`api/role.js`）**：

```js
import request from './request'

/** 角色列表（轻量，无权限明细） */
export const listRoles = () => request({ url: '/admin/role/list', method: 'get' })

/** 角色详情（含 permissionIds / permissions，编辑回显用） */
export const getRoleDetail = (id) => request({ url: `/admin/role/${id}`, method: 'get' })

/** 新增角色 */
export const createRole = (data) => request({ url: '/admin/role', method: 'post', data })

/** 修改角色（注意：没有 code 字段） */
export const updateRole = (id, data) => request({ url: `/admin/role/${id}`, method: 'put', data })

/** 删除角色 */
export const deleteRole = (id) => request({ url: `/admin/role/${id}`, method: 'delete' })

/** 给角色分配权限（全量覆盖，[]=清空） */
export const assignRolePermissions = (id, permissionIds) =>
  request({ url: `/admin/role/${id}/permissions`, method: 'put', data: { permissionIds } })

/** 权限字典全量（只读，无增删改） */
export const listPermissions = () => request({ url: '/admin/permission/list', method: 'get' })
```

**示例（`api/file.js`）**：

```js
import request from './request'

/**
 * 上传图片。
 * @param {File} file
 * @param {string} category product | shop | avatar | common
 * @returns {Promise<{objectKey:string, url:string}>}
 */
export const uploadImage = (file, category = 'common') => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', category)
  return request({
    url: '/file/upload',
    method: 'post',
    data: fd,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000
  })
}
```

---

## 5. 前端路由补充清单（可直接抄进 `router/index.js`）

```js
// 管理端
{ path: '/admin/roles',    component: () => import('../views/admin/RoleManage.vue'),    meta: { requiresAuth: true, requiresRole: 'ADMIN' } },
{ path: '/admin/shops',    component: () => import('../views/admin/ShopManage.vue'),    meta: { requiresAuth: true, requiresRole: 'ADMIN' } },
{ path: '/admin/products', component: () => import('../views/admin/ProductManage.vue'), meta: { requiresAuth: true, requiresRole: 'ADMIN' } },
// 卖家端
{ path: '/seller/shop',     component: () => import('../views/seller/MyShop.vue'),      meta: { requiresAuth: true } },   // 不设 requiresRole
{ path: '/seller/products', component: () => import('../views/seller/MyProducts.vue'),  meta: { requiresAuth: true, requiresRole: 'SELLER' } },
// 前台
{ path: '/products/:id',   component: () => import('../views/ProductDetail.vue') },
```

> ⚠️ 路由守卫里 `requiresRole` 是**体验层**拦截（挡住误点），真拦截在后端。别把它当安全边界。

---

## 6. 已知缺口 / 待确认

| 项 | 说明 |
|---|---|
| 无 `permissions` 下发 | `/user/info` 只给 `roles`，前端**无法按权限码**控制按钮。要精确到"能不能删"，需后端补 `permissions: string[]`。当前按角色控制。 |
| 无分类接口 | `ProductDTO.categoryId` / `ProductVO.categoryId` 是裸 ID，**没有分类列表/树接口**。分类下拉暂时只能手填或用固定常量。 |
| 购物车 / 订单 | 后端**尚未实现**。前台"加入购物车/下单"按钮请置灰或提示"开发中"。 |
| 商品 URL↔Key | `ProductVO` 出参给的是 `coverUrl`/`imageUrls`（URL），入参要的是 `coverKey`/`images`（key）。编辑回显后提交需做转换，**具体转换规则请与后端对齐**。 |
| 上传模式 | 当前是「后端中转」（浏览器→应用→OSS）。生产会改「前端直传」，届时 `file.js` 的调用方式会变（改为先取签名再 PUT）。 |
| 权限字典只读 | 不要做"新增权限"界面——权限码与后端代码强耦合，只能随发布变更。 |
