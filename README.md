# shopping-mall-frontend

商城项目的前端工程。**Vue 3 + Vite + Pinia + Element Plus**，与后端 `mall-server`（Spring Boot 3.3.5 / JDK 21）配套使用。

界面风格为**极简北欧风**：大量留白、墨色系 + 靛蓝点缀、无渐变无阴影堆砌（刻意区别于淘宝式大促视觉）。管理后台用 Element Plus，前台页面手写 CSS，两者风格通过一套全局变量统一。

> 🔗 **相关仓库**：后端 [`BIGYYBUG/shop-mall`](https://github.com/BIGYYBUG/shop-mall)（工程目录 `mall-server`，README 在其中）；前端即本仓库 `BIGYYBUG/shop-mall-frontedn`。
> ⚠️ 本仓库名 `shop-mall-frontedn` 疑似拼写错误（应为 `frontend`），链接以实际地址为准。

---

## 1. 技术栈

| 项 | 选型 | 备注 |
|---|---|---|
| 框架 | Vue 3（`<script setup>`） | 组合式 API |
| 构建 | Vite 5 | 端口 5173 |
| 状态 | Pinia | `stores/user.js` |
| 路由 | vue-router 4 | history 模式 |
| UI | Element Plus（全量引入 + zh-cn） | 仅管理/卖家端；前台手写 |
| 请求 | axios 封装 `src/api/request.js` | 统一解包 `Result.data` |

> 目录 `src/api/` 下所有接口**必须复用 `request.js`**，不要单独 `new axios`——token 注入、业务码判定、401 跳转都收敛在那里。

## 2. 启动

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
npm run preview  # 预览构建产物
```

**前置条件**：后端 `mall-server` 已在 `localhost:8080` 启动，否则除首页静态区块外的数据全部为空。

### 代理规则（`vite.config.js`）

| 前缀 | 转发目标 | 说明 |
|---|---|---|
| `/api/**` | `http://localhost:8080` | **去掉 `/api` 前缀**（后端路径本身没有它） |
| `/uploads/**` | `http://localhost:8080` | **不能去前缀**；后端本地存储返回相对路径 `/uploads/xxx.jpg` |

第二条容易被忽略：漏了它，图片请求会落到 SPA 兜底返回 `index.html`，`<img>` 收到 `text/html` 变成破图，且响应码是 200 而非 404，排查成本极高。

## 3. 目录结构

```
src/
├─ api/            接口层，一个业务域一个文件
│  ├─ request.js     ★ axios 实例与拦截器（统一错误处理入口）
│  ├─ user.js       登录 / 注册 / 用户信息
│  ├─ social.js     第三方（微信）登录
│  ├─ admin.js      管理端用户
│  ├─ role.js       角色 + 权限字典
│  ├─ shop.js       管理端店铺（审核）
│  ├─ sellerShop.js 卖家端我的店铺
│  ├─ adminProduct.js / sellerProduct.js / product.js   商品（三个入口）
│  ├─ file.js       图片上传
│  └─ ai.js         AI 对话（多轮会话）
├─ components/
│  ├─ AiPet.vue              悬浮桌宠 AI 助手（全局，见 §6）
│  ├─ ImageUploader.vue      通用图片上传（v-model 绑 objectKey）
│  └─ ProductFormDrawer.vue  商品表单抽屉（卖家端/管理端共用）
├─ constants/category.js     商品分类字典（后端暂无分类接口的兜底）
├─ stores/user.js            token / userInfo / roles / hasRole()
├─ views/
│  ├─ Home.vue               首页（商品列表，免登录）
│  ├─ Login.vue              登录
│  ├─ OauthCallback.vue      第三方登录回调
│  ├─ ProductDetail.vue      商品详情（免登录）
│  ├─ admin/                 UserManage / RoleManage / ShopManage / ProductManage
│  └─ seller/                MyShop / MyProducts
├─ assets/base.css           设计变量与全局基础样式
└─ router/index.js           路由 + 登录/角色守卫
```

## 4. 路由与权限

| 路由 | 页面 | 访问要求 |
|---|---|---|
| `/` | 首页 · 商品列表 | 免登录 |
| `/products/:id` | 商品详情 | 免登录 |
| `/login`、`/oauth/callback` | 登录、授权回调 | 免登录（隐藏公共布局） |
| `/seller/shop` | 我的店铺 | 登录（**刻意不设角色**，未入驻也要能申请） |
| `/seller/products` | 我的商品 | `SELLER` |
| `/admin/users`、`/admin/roles`、`/admin/shops`、`/admin/products` | 管理后台 | `ADMIN` |
| 其他 | — | 兜底重定向到 `/` |

> ⚠️ 路由守卫里的 `requiresAuth` / `requiresRole` 只是**体验层**拦截（挡住误点、控制菜单显隐），真正的权限判定永远在后端 `@RequiresPermission`。别把它当安全边界。

## 5. 接口约定（对接后端必读）

后端统一返回 `{ code, message, data }`，**`code === 200` 才算成功**。

- `request.js` 的响应拦截器**已解包并返回 `data`**，业务代码里 `const list = await listRoles()` 直接就是数组，**不要再写 `res.data`**。
- 业务失败（400 参数错误 / 403 权限不足）后端**仍以 HTTP 200 返回**，靠 `code` 区分，拦截器会 `reject`，调用方只用 `try/catch`。
- **只有 401 是真实 HTTP 状态码**（`JwtInterceptor` 直接写出），拦截器已处理：清凭证 + 跳登录页，业务代码不用管。
- 分页结构固定 `{ total, pages, current, size, records }`，请求参数 `pageNum` / `pageSize`。
- **错误提示的归属权在页面层**：`request.js` 只 `console.warn`，由各页面 catch 后自行提示（避免与页面自带 toast 双重弹窗）。

### 几条硬性规则（踩过坑）

1. **不要传 `userId` / `sellerId`**：卖家侧接口后端从令牌取当前用户，传了也没用。
2. **「分配角色」「分配权限」是全量覆盖**：提交的数组即最终结果，`[]` = 清空，所以必须**先读后写**。
3. **上下架 / 启停用的 `status` 走 query 参数**，不是 JSON body：`PUT /admin/user/1/status?status=0`。
4. **图片分两层**：提交传 `objectKey`（`coverKey` / `images`），展示用返回的完整 URL（`coverUrl` / `imageUrls`）。**不要把 URL 存下来再提交回去**。
5. **金额全程字符串**：`price` 是 BigDecimal 序列化结果，禁止浮点运算。
6. **AI 对话必须回传 `conversationId`**：首轮不带、响应回传、后续原样带回；丢了不是报错，是"模型失忆 + 悄悄多花钱"。

## 6. 特色模块

### 悬浮桌宠 AI 助手（`components/AiPet.vue`）

右下角常驻的 SVG 小机器人：会眨眼、天线灯呼吸、整体悬浮 bob；进站 1.5 秒弹打招呼气泡；点击展开 380px 聊天面板。原 `/ai` 整页已改为重定向到 `/`。

- 聊天记录持久化在 `localStorage.ai_pet_messages`（节流写盘，上限 100 条）
- 会话 ID 存在 `localStorage.ai_pet_conversation`
- **登出会清空本地会话**——`conversationId` 绑定上一个账号，换账号续写会串号
- 未登录时发送消息会引导登录（`/ai/chat` 后端要求仅登录）

### 通用图片上传（`components/ImageUploader.vue`）

```vue
<ImageUploader v-model="form.coverKey" category="product" :initial-urls="shop.logoUrl" />
```

- `v-model` 绑的是 **objectKey**（单图 `string` / 多图 `string[]`），预览用 url
- `initial-urls` 用于编辑回显（纯预览，不写入 modelValue）
- 多图支持 `limit` 上限、逐张删除、左右移排序
- 编辑时**未换图就不提交该字段**，避免空值把已有图片清掉

### 商品表单抽屉（`components/ProductFormDrawer.vue`）

卖家端与管理端共用，靠 `mode`（`seller` / `admin`）切换接口组。两处入口权限码不同，**不要合并**，也不要把 admin 接口误用到卖家页。

## 7. 设计系统

`src/assets/base.css` 集中定义全局变量，改主题只改这一个文件：

| 变量 | 值 | 用途 |
|---|---|---|
| `--brand-500` / `--brand-600` / `--brand-50` | `#4f46e5` / `#4338ca` / `#eef2ff` | 靛蓝点缀 |
| `--ink-900` ~ `--ink-300` | `#16181d` → `#d8dce3` | 墨色中性色 |
| `--radius-sm/md/lg` | 10 / 14 / 24px | 圆角 |
| `--container` | `100%` | **全屏流式布局** |

布局为全屏流式（不锁 1200px），网格用 `auto-fill` 自适应；聊天面板是唯一刻意限宽的（1000px 居中，保证气泡可读性）。

## 8. 已知缺口

| 项 | 说明 |
|---|---|
| 无 `permissions` 下发 | `/user/info` 只给 `roles`，无法按权限码控制按钮，当前按角色控制 |
| 无分类接口 | `categoryId` 是裸 ID，分类下拉用 `constants/category.js` 的常量兜底 |
| 购物车 / 订单 | 后端未实现，详情页按钮置灰并标注"功能开发中" |
| 商品 URL ↔ Key | 编辑回显后提交需转换，当前采用"未换图不提交"兜底 |
| 上传模式 | 当前是后端中转（浏览器→应用→OSS），生产改前端直传后 `api/file.js` 调用方式会变 |

## 9. 后端接口交接文档

`docs/backend-frontend-prompts.md`：接口总清单 + 逐页生成提示词 + 已知缺口。新增页面时先读它第 1 章（通用约定），能避开绝大多数对接错误。
