<template>
  <div class="cart container">
    <!-- 加载 / 错误 / 空车 / 列表 四态 -->
    <div v-if="loading" class="state">正在加载购物车…</div>
    <div v-else-if="error" class="state err">{{ error }}</div>

    <div v-else-if="!items.length" class="empty">
      <svg viewBox="0 0 24 24" width="56" height="56" aria-hidden="true">
        <path
          d="M5 7h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 7Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <path
          d="M8.5 9.5V6.5a3.5 3.5 0 0 1 7 0v3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
      <p class="empty-text">购物车还是空的</p>
      <router-link to="/" class="go">去逛逛 →</router-link>
    </div>

    <template v-else>
      <div class="head">
        <h1 class="title">我的购物车</h1>
        <button type="button" class="link-btn" @click="handleClear">清空购物车</button>
      </div>

      <!-- 失效商品提示：只在列表里打标记，绝不自动删除（静默消失比报错更让人困惑） -->
      <p v-if="cart.invalidCount" class="invalid-hint">
        有 {{ cart.invalidCount }} 件商品已失效，不会被计入合计金额
      </p>

      <ul class="list">
        <li
          v-for="item in items"
          :key="item.productId"
          class="row"
          :class="{ invalid: !item.available }"
        >
          <!-- 失效行强制显示为未勾选且不可点：后端 setAllSelected 会把它们也置为选中，
               这里不为所动，因为"能不能买"才是用户真正在意的勾选语义 -->
          <el-checkbox
            class="pick"
            :model-value="item.available && !!item.selected"
            :disabled="!item.available || busy"
            @change="(v) => handleSelect(item, v)"
          />

          <router-link :to="`/products/${item.productId}`" class="thumb">
            <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.name" />
            <span v-else class="thumb-empty">无图</span>
          </router-link>

          <div class="main">
            <router-link :to="`/products/${item.productId}`" class="name">
              {{ item.name || '商品 #' + item.productId }}
            </router-link>
            <p v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</p>
            <p v-if="item.invalidReason" class="tag" :class="{ danger: !item.available }">
              {{ item.invalidReason }}
            </p>
          </div>

          <div class="unit">¥{{ money(item.price) }}</div>

          <div class="qty">
            <button
              type="button"
              :disabled="busy || !item.available || item.quantity <= 1"
              @click="handleQuantity(item, item.quantity - 1)"
            >
              −
            </button>
            <input
              :value="item.quantity"
              type="number"
              min="1"
              max="200"
              :disabled="busy || !item.available"
              @change="(e) => handleQuantity(item, clamp(e.target.value))"
            />
            <button
              type="button"
              :disabled="busy || !item.available || item.quantity >= MAX_QTY"
              @click="handleQuantity(item, item.quantity + 1)"
            >
              +
            </button>
          </div>

          <div class="subtotal">¥{{ money(item.subtotal) }}</div>

          <button type="button" class="remove" :disabled="busy" @click="handleRemove(item)">
            删除
          </button>
        </li>
      </ul>

      <!-- 结算条 -->
      <div class="bar">
        <el-checkbox
          :model-value="!!cart.allSelected"
          :disabled="busy || !hasAvailable"
          @change="handleSelectAll"
        >
          全选
        </el-checkbox>

        <button type="button" class="link-btn" :disabled="busy || !selectedIds.length" @click="handleRemoveSelected">
          删除选中
        </button>

        <div class="summary">
          <span class="count">
            已选 <strong>{{ cart.selectedCount || 0 }}</strong> 种 · 共
            <strong>{{ cart.totalQuantity || 0 }}</strong> 件
          </span>
          <span class="amount">
            合计 <em>¥{{ money(cart.selectedAmount) }}</em>
          </span>
          <button type="button" class="checkout" disabled title="订单功能开发中">
            去结算
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  clearCart,
  getCart,
  removeCartItem,
  removeCartItems,
  setCartSelected,
  updateCartQuantity
} from '../api/cart'
import { useCartStore } from '../stores/cart'

const MAX_QTY = 200

const cartStore = useCartStore()

const loading = ref(false)
const error = ref('')
/** 整车视图：items 与所有合计都由它驱动，前端不再自己算一遍 */
const cart = ref({})
/** 单飞锁：数量连点、删除连点都会各发一次请求，加锁可避免响应乱序覆盖 */
const busy = ref(false)

const items = computed(() => cart.value.items || [])
const hasAvailable = computed(() => items.value.some((i) => i.available))
const selectedIds = computed(() =>
  items.value.filter((i) => i.available && i.selected).map((i) => i.productId)
)

const money = (v) => (v == null ? '0.00' : Number(v).toFixed(2))
const clamp = (v) => {
  const n = parseInt(v, 10)
  if (Number.isNaN(n)) return 1
  return Math.min(MAX_QTY, Math.max(1, n))
}

/**
 * 所有写操作的统一收口。
 *
 * 后端每个写接口都返回**整车 CartVO**，所以这里直接整份替换，
 * 不需要「改完再 GET 一次」。替换而非局部改，也顺带修掉了
 * 「前端自己算合计」和「服务端算的合计」不一致的隐患。
 */
const run = async (action, successMsg) => {
  if (busy.value) return
  busy.value = true
  try {
    const result = await action()
    if (result) {
      cart.value = result
      cartStore.setCount(result.totalCount)
    }
    if (successMsg) ElMessage.success(successMsg)
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
    // 失败后重新拉一次，确保界面回到服务端真实状态（例如库存已被别人买空）
    await load()
  } finally {
    busy.value = false
  }
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const data = await getCart()
    cart.value = data || {}
    cartStore.setCount(data?.totalCount)
  } catch (e) {
    // 401 由 request.js 拦截器统一跳登录，这里只在页面上留个说明
    error.value = e.message || '购物车加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------- 勾选 ---------- */

const handleSelect = (item, checked) =>
  run(() => setCartSelected([item.productId], !!checked))

const handleSelectAll = (checked) => {
  // 传空数组 = 整车。后端 allSelected 只由「可购买且已勾选」推出，失效商品不参与
  run(() => setCartSelected([], !!checked))
}

/* ---------- 数量 ---------- */

const handleQuantity = (item, quantity) => {
  if (quantity === item.quantity) return
  run(() => updateCartQuantity(item.productId, quantity))
}

/* ---------- 删除 ---------- */

const handleRemove = (item) =>
  run(() => removeCartItem(item.productId), '已移除')

/**
 * 删除选中：一次请求删完。
 *
 * 早先后端只有「删单个」和「清空」，这里只能循环调用 —— N 件商品就是 N 次往返，
 * 且每次都会重复「删字段 + 版本 +1 + 置脏标记」。现已补上 `DELETE /cart/items/batch`。
 */
const handleRemoveSelected = async () => {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(`确定从购物车移除选中的 ${ids.length} 件商品吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消'
    })
  } catch {
    return // 用户取消
  }
  await run(() => removeCartItems(ids), '已移除选中商品')
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确定清空购物车吗？此操作不可撤销。', '清空确认', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await run(async () => {
    await clearCart()
    return getCart() // 清空接口只返回 null，补一次查询拿回空车视图
  }, '购物车已清空')
}
</script>

<style scoped>
.container {
  width: var(--container);
  max-width: 100%;
  margin: 0 auto;
  padding: 0 32px;
}

.state {
  padding: 100px 0;
  text-align: center;
  font-size: 14px;
  color: var(--ink-500);
}

.state.err {
  color: var(--danger);
}

/* ---------- 空车 ---------- */
.empty {
  display: grid;
  justify-items: center;
  gap: 14px;
  padding: 96px 0;
  color: var(--ink-300);
}

.empty-text {
  font-size: 15px;
  color: var(--ink-500);
}

.go {
  height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 26px;
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 13px;
  transition: background 0.2s;
}

.go:hover {
  background: var(--brand-600);
}

/* ---------- 头部 ---------- */
.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 18px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
}

.link-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: var(--ink-500);
  cursor: pointer;
  transition: color 0.2s;
}

.link-btn:hover:not(:disabled) {
  color: var(--danger);
}

.link-btn:disabled {
  color: var(--ink-300);
  cursor: not-allowed;
}

.invalid-hint {
  margin-bottom: 12px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  background: #fff7ed;
  color: #b45309;
  font-size: 13px;
}

/* ---------- 列表 ---------- */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: 32px 88px minmax(0, 1fr) 100px 132px 110px 56px;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
}

.row.invalid {
  background: var(--canvas);
}

.thumb {
  width: 88px;
  height: 88px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--canvas);
  display: block;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-empty {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 12px;
  color: var(--ink-300);
}

.main {
  min-width: 0;
}

.name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name:hover {
  color: var(--brand-600);
}

.subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  margin-top: 6px;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  font-size: 11px;
}

.tag.danger {
  background: #fef2f2;
  color: var(--danger);
}

.unit {
  font-size: 14px;
  color: var(--ink-700);
  font-variant-numeric: tabular-nums;
}

/* 数量步进器 */
.qty {
  display: flex;
  align-items: center;
  height: 32px;
  border: 1px solid var(--ink-300);
  border-radius: 8px;
  overflow: hidden;
}

.qty button {
  width: 30px;
  height: 100%;
  border: none;
  background: #fff;
  color: var(--ink-700);
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s;
}

.qty button:hover:not(:disabled) {
  background: var(--canvas);
}

.qty button:disabled {
  color: var(--ink-300);
  cursor: not-allowed;
}

.qty input {
  width: 58px;
  height: 100%;
  border: none;
  border-left: 1px solid var(--ink-300);
  border-right: 1px solid var(--ink-300);
  outline: none;
  text-align: center;
  font-size: 14px;
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}

.qty input::-webkit-outer-spin-button,
.qty input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.subtotal {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink-900);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.remove {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--ink-500);
  cursor: pointer;
  transition: color 0.2s;
}

.remove:hover:not(:disabled) {
  color: var(--danger);
}

.remove:disabled {
  color: var(--ink-300);
  cursor: not-allowed;
}

/* ---------- 结算条 ---------- */
.bar {
  position: sticky;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 16px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}

.summary {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-left: auto;
  font-size: 13px;
  color: var(--ink-500);
}

.summary strong {
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}

.amount em {
  font-style: normal;
  font-size: 20px;
  font-weight: 700;
  color: var(--danger);
  font-variant-numeric: tabular-nums;
}

.checkout {
  height: 40px;
  padding: 0 34px;
  border: 1px solid var(--ink-300);
  border-radius: 999px;
  background: var(--ink-300);
  color: #fff;
  font-size: 14px;
  cursor: not-allowed;
}

@media (max-width: 1080px) {
  .row {
    grid-template-columns: 28px 72px minmax(0, 1fr) 116px 96px 48px;
  }

  .unit {
    display: none;
  }

  .thumb {
    width: 72px;
    height: 72px;
  }
}
</style>
