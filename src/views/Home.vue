<template>
  <div class="home container">
    <!-- ===== Hero 横幅 ===== -->
    <section class="hero">
      <div class="hero-copy">
        <p class="hero-tagline">NEW SEASON · 新季甄选</p>
        <h1 class="hero-title">
          少即是多<br />
          <span class="hero-accent">好物，刚刚好</span>
        </h1>
        <p class="hero-desc">精选设计好物，为日常生活做减法</p>
        <button type="button" class="hero-cta" @click="scrollToProducts">
          开始浏览
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <!-- SVG 插画：极简几何购物场景 -->
      <svg class="hero-art" viewBox="0 0 420 320" aria-hidden="true">
        <defs>
          <linearGradient id="blob-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#eef2ff" />
            <stop offset="1" stop-color="#e0e7ff" />
          </linearGradient>
        </defs>

        <!-- 背景几何 -->
        <circle cx="210" cy="168" r="138" fill="url(#blob-g)" />
        <circle cx="62" cy="58" r="22" fill="#e0e7ff" opacity=".8" />
        <rect x="352" y="222" width="48" height="48" rx="12" fill="#eef2ff" />

        <!-- 主购物袋：细线条风格 -->
        <g>
          <path
            d="M150 118h120l-11 128a14 14 0 0 1-14 12h-70a14 14 0 0 1-14-12l-11-128Z"
            fill="#fff"
            stroke="#16181d"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <path d="M178 118V96a32 32 0 0 1 64 0v22" fill="none" stroke="#16181d" stroke-width="3" stroke-linecap="round" />
          <path d="M150 118h120" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" />
          <circle cx="196" cy="176" r="5" fill="#16181d" />
          <circle cx="224" cy="176" r="5" fill="#16181d" />
          <path d="M196 176c0 8 6 13 14 13s14-5 14-13" fill="none" stroke="#16181d" stroke-width="3" stroke-linecap="round" />
          <!-- 袋口靛蓝色块点缀 -->
          <path d="M160 134h100" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" opacity=".55" />
        </g>

        <!-- 漂浮卡片：新品 -->
        <g transform="rotate(-7 84 150)">
          <rect x="38" y="118" width="92" height="60" rx="14" fill="#fff" stroke="#d8dce3" />
          <text x="84" y="150" text-anchor="middle" font-size="15" font-weight="600" fill="#16181d">新品</text>
          <text x="84" y="166" text-anchor="middle" font-size="11" fill="#7a8090">每周上新</text>
        </g>

        <!-- 漂浮卡片：配送 -->
        <g transform="rotate(6 348 108)">
          <rect x="300" y="72" width="96" height="62" rx="14" fill="#fff" stroke="#d8dce3" />
          <path d="M314 94h34l8 10v14h-42V94Z" fill="none" stroke="#16181d" stroke-width="2.4" stroke-linejoin="round" />
          <circle cx="326" cy="122" r="3.6" fill="#16181d" />
          <circle cx="344" cy="122" r="3.6" fill="#16181d" />
          <text x="366" y="102" font-size="12" font-weight="600" fill="#16181d">次日达</text>
          <text x="366" y="118" font-size="11" fill="#7a8090">免费配送</text>
        </g>

        <!-- 星星点缀（靛蓝） -->
        <path d="M330 40l4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#c7d2fe" />
        <path d="M112 246l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="#e0e7ff" />
      </svg>
    </section>

    <!-- ===== 服务保障条 ===== -->
    <section class="services">
      <div v-for="s in services" :key="s.title" class="service-item">
        <span class="service-icon" v-html="s.icon"></span>
        <div>
          <p class="service-title">{{ s.title }}</p>
          <p class="service-sub">{{ s.sub }}</p>
        </div>
      </div>
    </section>

    <!-- ===== 分类导航（点击筛选商品） ===== -->
    <section class="section">
      <h2 class="section-title">商品分类</h2>
      <div class="category-grid">
        <a
          v-for="c in categories"
          :key="c.id"
          href="javascript:void(0)"
          class="category-card"
          :class="{ active: filter.categoryId === c.id }"
          @click="toggleCategory(c.id)"
        >
          <span class="category-icon" v-html="c.icon"></span>
          <span class="category-name">{{ c.name }}</span>
        </a>
      </div>
    </section>

    <!-- ===== 商品列表（真实接口，免登录） ===== -->
    <section ref="productsSectionRef" class="section">
      <div class="section-head">
        <h2 class="section-title">
          {{ filter.categoryId ? currentCategoryName : '全部商品' }}
        </h2>
        <div class="search-inline">
          <input
            v-model.trim="filter.keyword"
            type="search"
            placeholder="搜索商品名 / 卖点"
            @keyup.enter="handleSearch"
          />
          <button type="button" @click="handleSearch">搜索</button>
        </div>
      </div>

      <div v-if="filter.categoryId" class="filter-tip">
        正在筛选「{{ currentCategoryName }}」
        <button type="button" class="clear-filter" @click="toggleCategory(null)">清除筛选 ×</button>
      </div>

      <!-- 加载 / 空 / 列表三态 -->
      <div v-if="loading" class="grid-state">正在加载商品…</div>
      <div v-else-if="!products.length" class="grid-state">
        没有符合条件的商品，换个关键词试试
      </div>
      <div v-else class="product-grid">
        <article
          v-for="p in products"
          :key="p.id"
          class="product-card"
          @click="goDetail(p)"
        >
          <div class="product-thumb">
            <!-- 真实封面；无封面用占位 SVG -->
            <img v-if="p.coverUrl" :src="p.coverUrl" :alt="p.name" loading="lazy" />
            <svg v-else viewBox="0 0 200 150" aria-hidden="true">
              <rect width="200" height="150" fill="#f1f2f6" />
              <circle cx="100" cy="72" r="34" fill="#e2e5ee" />
              <path
                d="M82 66h36l-5 34a8 8 0 0 1-8 7h-10a8 8 0 0 1-8-7l-5-34Z"
                fill="#fff"
                stroke="#16181d"
                stroke-width="2.4"
                stroke-linejoin="round"
              />
              <path d="M92 66v-6a8 8 0 0 1 16 0v6" fill="none" stroke="#16181d" stroke-width="2.4" stroke-linecap="round" />
            </svg>
            <span v-if="p.sales >= 0" class="product-tag">已售 {{ p.sales }}</span>
          </div>
          <div class="product-info">
            <p class="product-name">{{ p.name }}</p>
            <p v-if="p.subtitle" class="product-subtitle">{{ p.subtitle }}</p>
            <div class="product-bottom">
              <p class="product-price">
                ¥{{ formatPrice(p.price) }}
                <span v-if="p.originalPrice" class="product-orig">¥{{ formatPrice(p.originalPrice) }}</span>
              </p>
            </div>
          </div>
        </article>
      </div>

      <!-- 分页（轻量手写，与全站风格一致） -->
      <div v-if="total > filter.pageSize" class="pager">
        <button :disabled="filter.pageNum <= 1" @click="goPage(filter.pageNum - 1)">上一页</button>
        <span class="pager-info">第 {{ filter.pageNum }} / {{ totalPages }} 页 · 共 {{ total }} 件</span>
        <button :disabled="filter.pageNum >= totalPages" @click="goPage(filter.pageNum + 1)">下一页</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pagePublicProducts } from '../api/product'
import { CATEGORY_OPTIONS, categoryName } from '../constants/category'

const route = useRoute()
const router = useRouter()

const services = [
  {
    title: '正品保障',
    sub: '品牌直供 · 品质甄选',
    icon: `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 3 5 5.8v5.4c0 4.4 3 8.2 7 9.8 4-1.6 7-5.4 7-9.8V5.8L12 3Z" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/><path d="m9 11.8 2.2 2.2L15.4 9.6" fill="none" stroke="#4f46e5" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  },
  {
    title: '免费配送',
    sub: '满 99 元 · 次日达',
    icon: `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 7h10v9H3V7Z" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/><path d="M13 10h4.2l2.8 3.4V16h-7v-6Z" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7.5" cy="18" r="1.8" fill="#16181d"/><circle cx="16.5" cy="18" r="1.8" fill="#16181d"/></svg>`
  },
  {
    title: '无忧退换',
    sub: '30 天内 · 免费退换',
    icon: `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4.5 9.5A8 8 0 0 1 19 8.2M19.5 14.5A8 8 0 0 1 5 15.8" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linecap="round"/><path d="M4 5v4.5h4.5M20 19v-4.5h-4.5" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  },
  {
    title: '贴心服务',
    sub: '7×24 小时在线客服',
    icon: `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12a7 7 0 0 1 14 0" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linecap="round"/><path d="M5 12h2.5v5H6a1.8 1.8 0 0 1-1.8-1.8V12H5Zm14 0h-2.5v5H18a1.8 1.8 0 0 0 1.8-1.8V12H19Z" fill="#4f46e5" opacity=".85"/><path d="M17 17v.8a2.4 2.4 0 0 1-2.4 2.4H12" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linecap="round"/></svg>`
  }
]

/* 分类卡片：常量 + 图标（点击即筛选） */
const CATEGORY_ICONS = [
  `<svg viewBox="0 0 24 24" width="30" height="30"><rect x="7" y="3" width="10" height="18" rx="2.4" fill="none" stroke="#16181d" stroke-width="1.7"/><path d="M10.5 18.6h3" stroke="#16181d" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="m9 4-5 3 2 4 2-1v10h8V10l2 1 2-4-5-3a3 3 0 0 1-6 0Z" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  `<svg viewBox="0 0 24 24" width="30" height="30"><rect x="8" y="9" width="8" height="12" rx="2" fill="none" stroke="#16181d" stroke-width="1.7"/><path d="M10 9V6.2a2 2 0 0 1 .6-1.4l1.4-1.4 1.4 1.4a2 2 0 0 1 .6 1.4V9" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 13.5h4" stroke="#4f46e5" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="m4 11 8-7 8 7" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 10v9.5h11V10" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/><path d="M10.5 19.5v-5h3v5" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 7c-4 0-7 2.6-7 6.2C5 17 8 20 12 20s7-3 7-6.8C19 9.6 16 7 12 7Z" fill="none" stroke="#16181d" stroke-width="1.7"/><path d="M12 7c0-2 1.2-3.4 3-4" fill="none" stroke="#4f46e5" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3.5 17.5 9 6l4 8 2.5-4.5 5 8H3.5Z" fill="none" stroke="#16181d" stroke-width="1.7" stroke-linejoin="round"/><circle cx="16" cy="5.6" r="1.6" fill="#4f46e5"/></svg>`
]

const categories = CATEGORY_OPTIONS.map((c, i) => ({ ...c, icon: CATEGORY_ICONS[i] }))

/* ---------- 商品列表（免登录接口） ---------- */
const loading = ref(false)
const products = ref([])
const total = ref(0)

const filter = reactive({
  pageNum: 1,
  pageSize: 12,
  keyword: '',
  categoryId: null
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filter.pageSize)))
const currentCategoryName = computed(() =>
  filter.categoryId ? categoryName(filter.categoryId) || '商品' : '全部商品'
)

const loadProducts = async () => {
  loading.value = true
  try {
    const data = await pagePublicProducts({
      pageNum: filter.pageNum,
      pageSize: filter.pageSize,
      keyword: filter.keyword || undefined,
      categoryId: filter.categoryId ?? undefined
    })
    products.value = data.records || []
    total.value = data.total || 0
  } catch {
    // 免登录接口，失败静默降级：列表区显示空态即可，不打扰首页其他区块
    products.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 进站时消费全局搜索带来的关键词（如 /?keyword=耳机）
  const kw = String(route.query.keyword || '').trim()
  if (kw) filter.keyword = kw
  loadProducts()
})

/**
 * 全局搜索流转：头部搜索框 push /?keyword=xxx，这里监听变化发起真实搜索。
 * 已在首页再次搜索时 query 变化也会进来；清空关键词同样生效。
 */
watch(
  () => route.query.keyword,
  (kw) => {
    const next = String(kw || '').trim()
    if (next === filter.keyword) return
    filter.keyword = next
    filter.pageNum = 1
    loadProducts()
    // 搜索完成后滚动到商品区，让用户看到结果
    nextTick(() => {
      productsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }
)

/** Hero「开始浏览」：平滑滚动到商品列表区 */
const productsSectionRef = ref(null)
const scrollToProducts = () => {
  productsSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleSearch = () => {
  filter.pageNum = 1
  loadProducts()
}

const goPage = (page) => {
  filter.pageNum = page
  loadProducts()
}

/** 分类卡片点击：再次点击同分类 = 取消筛选 */
const toggleCategory = (id) => {
  filter.categoryId = filter.categoryId === id ? null : id
  filter.pageNum = 1
  loadProducts()
}

const goDetail = (p) => {
  router.push(`/products/${p.id}`)
}

/* 金额字符串直出，禁止浮点运算 */
const formatPrice = (v) => (v == null ? '—' : String(v))
</script>

<style scoped>
.container {
  width: var(--container);
  max-width: 100%;
  margin: 0 auto;
  padding: 0 32px;
}

/* ===== Hero ===== */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: 64px 72px;
  border-radius: var(--radius-lg);
  background: #fff;
  border: 1px solid var(--ink-300);
}

.hero-tagline {
  display: inline-block;
  padding: 6px 14px;
  border: 1px solid var(--ink-900);
  border-radius: 999px;
  color: var(--ink-900);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
}

.hero-title {
  margin-top: 22px;
  font-size: 42px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--ink-900);
}

.hero-accent {
  color: var(--brand-500);
}

.hero-desc {
  margin-top: 16px;
  font-size: 15px;
  color: var(--ink-500);
  letter-spacing: 1px;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  padding: 13px 34px;
  border: 1px solid var(--ink-900);
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.hero-cta:hover {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.hero-art {
  width: 400px;
  flex-shrink: 0;
}

/* ===== 服务保障条 ===== */
.services {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
  padding: 24px 32px;
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
}

.service-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.service-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  background: var(--canvas);
  border: 1px solid var(--ink-300);
}

.service-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-900);
}

.service-sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-500);
}

/* ===== 通用 section ===== */
.section {
  margin-top: 48px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* 区内搜索框 */
.search-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-inline input {
  width: 240px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--ink-300);
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  color: var(--ink-900);
  outline: none;
  transition: border-color 0.2s;
}

.search-inline input:focus {
  border-color: var(--ink-900);
}

.search-inline button {
  height: 36px;
  padding: 0 18px;
  border: 1px solid var(--ink-900);
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.search-inline button:hover {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

/* 筛选提示条 */
.filter-tip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 13px;
}

.clear-filter {
  border: none;
  background: none;
  color: var(--brand-600);
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

/* 列表三态 */
.grid-state {
  margin-top: 24px;
  padding: 56px 0;
  text-align: center;
  font-size: 14px;
  color: var(--ink-500);
  background: #fff;
  border: 1px dashed var(--ink-300);
  border-radius: var(--radius-md);
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--ink-900);
}

.section-more {
  font-size: 13px;
  color: var(--ink-500);
  transition: color 0.2s;
}

.section-more:hover {
  color: var(--ink-900);
}

/* ===== 分类 ===== */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 26px 0 22px;
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
  transition: border-color 0.2s, transform 0.2s;
}

.category-card:hover {
  border-color: var(--ink-900);
  transform: translateY(-3px);
}

/* 选中态分类卡片 */
.category-card.active {
  border-color: var(--brand-500);
  background: var(--brand-50);
}

.category-icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--brand-50);
}

.category-name {
  font-size: 14px;
  color: var(--ink-700);
}

/* ===== 商品 ===== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.product-card {
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.product-card:hover {
  border-color: var(--ink-900);
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.product-thumb {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--canvas);
}

.product-thumb svg,
.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-thumb img {
  display: block;
}

.product-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--ink-900);
  color: #fff;
  font-size: 12px;
  letter-spacing: 1px;
}

.product-info {
  padding: 16px 18px 18px;
}

.product-name {
  font-size: 14px;
  color: var(--ink-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-bottom {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 12px;
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink-900);
}

.product-orig {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--ink-300);
  text-decoration: line-through;
}

/* 分页 */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 28px;
  font-size: 13px;
  color: var(--ink-500);
}

.pager button {
  height: 34px;
  padding: 0 18px;
  border: 1px solid var(--ink-300);
  border-radius: 999px;
  background: #fff;
  color: var(--ink-700);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.pager button:hover:not(:disabled) {
  border-color: var(--ink-900);
  color: var(--ink-900);
}

.pager button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding: 40px 24px;
  }

  .hero-art {
    width: 300px;
  }

  .services {
    grid-template-columns: repeat(2, 1fr);
  }

  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
