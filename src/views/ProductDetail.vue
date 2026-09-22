<template>
  <div class="detail container">
    <!-- 加载 / 错误 / 内容三态 -->
    <div v-if="loading" class="state">正在加载商品…</div>
    <div v-else-if="error" class="state err">{{ error }}</div>

    <template v-else-if="product">
      <!-- ===== 主信息区：左图右文 ===== -->
      <section class="main">
        <!-- 图集轮播（无图时占位） -->
        <div class="gallery">
          <template v-if="galleryList.length">
            <el-carousel
              :autoplay="false"
              indicator-position="outside"
              height="420px"
              arrow="always"
            >
              <el-carousel-item v-for="(url, i) in galleryList" :key="i">
                <img :src="url" :alt="`商品图 ${i + 1}`" class="gallery-img" />
              </el-carousel-item>
            </el-carousel>
          </template>
          <div v-else class="gallery-empty">
            <span>暂无图片</span>
          </div>
        </div>

        <!-- 右侧信息 -->
        <div class="info">
          <h1 class="name">{{ product.name }}</h1>
          <p v-if="product.subtitle" class="subtitle">{{ product.subtitle }}</p>

          <p v-if="product.categoryId" class="category">
            分类：{{ categoryName(product.categoryId) || `#${product.categoryId}` }}
          </p>

          <div class="price-block">
            <span class="price">¥{{ formatPrice(product.price) }}</span>
            <span v-if="product.originalPrice" class="orig">
              ¥{{ formatPrice(product.originalPrice) }}
            </span>
          </div>

          <ul class="meta">
            <li>库存 <strong>{{ product.stock }}</strong></li>
            <li>已售 <strong>{{ product.sales }}</strong></li>
          </ul>

          <!-- 购物车已接通后端；订单后端尚未实现，仍按文档要求置灰，不假装能下单 -->
          <div class="actions">
            <button
              class="btn ghost"
              :disabled="adding || !canBuy"
              :title="canBuy ? '' : '该商品暂不可购买'"
              @click="handleAddToCart"
            >
              {{ adding ? '加入中…' : '加入购物车' }}
            </button>
            <button class="btn solid" disabled title="订单功能开发中">立即购买</button>
            <p v-if="!canBuy" class="dev-tip">该商品已下架或库存不足，无法加入购物车</p>
            <p v-else class="dev-tip">订单功能开发中</p>
          </div>
        </div>
      </section>

      <!-- ===== 详情区 ===== -->
      <section class="desc-section">
        <h2 class="section-title">商品详情</h2>
        <!-- 纯文本详情；保留换行 -->
        <p class="desc">{{ product.description || '暂无详情' }}</p>
      </section>

      <router-link to="/" class="back">← 返回商品列表</router-link>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPublicProduct } from '../api/product'
import { addToCart } from '../api/cart'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { categoryName } from '../constants/category'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const loading = ref(false)
const error = ref('')
const product = ref(null)
const adding = ref(false)

/** 可购买 = 商品存在且还有库存。下架商品本就被公开接口过滤掉了，这里主要挡零库存 */
const canBuy = computed(() => !!product.value && (product.value.stock ?? 0) > 0)

/**
 * 加入购物车。
 *
 * 两步都是「体验层」的提前拦截，真正的判定仍在后端：
 *  ① 未登录 → 先跳登录页并记住当前地址，登录后回到本页（否则用户会"迷失"）；
 *  ② 数量固定 +1，想改数量去购物车页 —— 详情页做步进器徒增状态，收益不大。
 */
const handleAddToCart = async () => {
  if (!product.value || adding.value) return

  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录后再加入购物车')
    router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }

  adding.value = true
  try {
    const cart = await addToCart(product.value.id, 1)
    // 写接口直接返回整车，顺手把头部角标同步掉，省一次 /cart/count
    cartStore.setCount(cart?.totalCount)
    ElMessage.success('已加入购物车')
  } catch (e) {
    ElMessage.error(e.message || '加入购物车失败')
  } finally {
    adding.value = false
  }
}

/** 图集：优先 imageUrls，无则退化到 coverUrl 单图 */
const galleryList = computed(() => {
  if (!product.value) return []
  if (product.value.imageUrls?.length) return product.value.imageUrls
  if (product.value.coverUrl) return [product.value.coverUrl]
  return []
})

/* 路由参数变化时重拉（同组件复用于 /products/1 → /products/2） */
const load = async () => {
  const id = Number(route.params.id)
  if (!id || Number.isNaN(id)) {
    error.value = '商品不存在或无权限访问'
    product.value = null
    return
  }

  loading.value = true
  error.value = ''
  try {
    product.value = await getPublicProduct(id)
  } catch (e) {
    // 404：不存在或无权访问（防探测），统一口径
    product.value = null
    error.value = '商品不存在或无权限访问'
    void e
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.id, load)

/* 金额字符串直出，不做浮点运算 */
const formatPrice = (v) => (v == null ? '—' : String(v))
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

/* ===== 主区 ===== */
.main {
  display: flex;
  gap: 40px;
  padding: 32px;
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-lg);
}

.gallery {
  flex: 0 0 440px;
  max-width: 100%;
}

.gallery-img {
  width: 100%;
  height: 420px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.gallery-empty {
  display: grid;
  place-items: center;
  height: 420px;
  border: 1px dashed var(--ink-300);
  border-radius: var(--radius-sm);
  color: var(--ink-500);
  background: var(--canvas);
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 26px;
  font-weight: 700;
  color: var(--ink-900);
  line-height: 1.4;
}

.subtitle {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ink-500);
}

.category {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-300);
}

.price-block {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 22px;
  padding: 16px 20px;
  background: var(--canvas);
  border-radius: var(--radius-sm);
}

.price {
  font-size: 30px;
  font-weight: 700;
  color: var(--ink-900);
}

.orig {
  font-size: 15px;
  color: var(--ink-300);
  text-decoration: line-through;
}

.meta {
  display: flex;
  gap: 28px;
  margin-top: 20px;
  font-size: 13px;
  color: var(--ink-500);
}

.meta strong {
  color: var(--ink-900);
  font-variant-numeric: tabular-nums;
}

.actions {
  margin-top: auto;
  padding-top: 28px;
}

.btn {
  height: 46px;
  padding: 0 34px;
  border-radius: 999px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

/* 加入购物车：可用时是描边主按钮，hover 反色 */
.btn.ghost {
  border: 1px solid var(--ink-900);
  background: #fff;
  color: var(--ink-900);
}

.btn.ghost:hover:not(:disabled) {
  background: var(--ink-900);
  color: #fff;
}

/* 通用置灰态（零库存 / 请求中） */
.btn:disabled,
.btn.ghost:disabled {
  border-color: var(--ink-300);
  background: #fff;
  color: var(--ink-300);
  cursor: not-allowed;
}

/* 立即购买：订单后端未实现，刻意保持置灰不可点 —— 不做假按钮 */
.btn.solid {
  margin-left: 12px;
  border: 1px solid var(--ink-300);
  background: var(--ink-300);
  color: #fff;
  cursor: not-allowed;
}

.dev-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--ink-300);
}

/* ===== 详情区 ===== */
.desc-section {
  margin-top: 28px;
  padding: 28px 32px;
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-lg);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink-900);
  margin-bottom: 16px;
}

.desc {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink-700);
  white-space: pre-wrap;
  word-break: break-word;
}

.back {
  display: inline-block;
  margin-top: 24px;
  font-size: 13px;
  color: var(--ink-500);
}

.back:hover {
  color: var(--ink-900);
}

@media (max-width: 900px) {
  .main {
    flex-direction: column;
  }

  .gallery {
    flex: none;
  }
}
</style>
