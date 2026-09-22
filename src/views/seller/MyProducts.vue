<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">我的商品</h1>
        <p class="page-desc">在售与库存管理 · 接口按当前登录卖家过滤，无需也不传卖家 ID</p>
      </div>
      <el-button type="primary" @click="openCreate">新增商品</el-button>
    </header>

    <!-- ---------------- 工具栏 ---------------- -->
    <section class="toolbar">
      <el-input
        v-model.trim="query.keyword"
        placeholder="搜索商品名"
        clearable
        style="width: 240px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px" @change="handleSearch">
        <el-option label="上架" :value="1" />
        <el-option label="下架" :value="0" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </section>

    <!-- ---------------- 表格 ---------------- -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="封面" width="90">
          <template #default="{ row }">
            <el-image
              v-if="row.coverUrl"
              :src="row.coverUrl"
              :preview-src-list="[row.coverUrl]"
              fit="cover"
              preview-teleported
              class="cover-img"
            />
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商品名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="subtitle" label="副标题" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.subtitle">{{ row.subtitle }}</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            {{ categoryName(row.categoryId) || `#${row.categoryId}` }}
          </template>
        </el-table-column>
        <el-table-column label="价格" width="130" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ formatPrice(row.price) }}</span>
            <span v-if="row.originalPrice" class="orig">¥{{ formatPrice(row.originalPrice) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" align="right" />
        <el-table-column prop="sales" label="销量" width="80" align="right" />
        <el-table-column label="上架" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="row._switching"
              @change="toggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-popconfirm title="确定删除该商品？删除后不可恢复。" @confirm="confirmDelete(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <span class="pager-info">共 {{ total }} 件 · 第 {{ query.pageNum }} / {{ totalPages }} 页</span>
        <el-pagination
          layout="prev, pager, next"
          :total="total"
          :page-size="query.pageSize"
          :current-page="query.pageNum"
          @current-change="goPage"
        />
      </div>
    </el-card>

    <!-- ---------------- 新增 / 编辑抽屉（卖家模式） ---------------- -->
    <ProductFormDrawer v-model="drawerVisible" :product="editingProduct" mode="seller" @saved="loadList" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { deleteMyProduct, pageMyProducts, updateMyProductStatus } from '../../api/sellerProduct'
import { categoryName } from '../../constants/category'
import ProductFormDrawer from '../../components/ProductFormDrawer.vue'

/* ---------- 列表 ---------- */
const loading = ref(false)
const list = ref([])
const total = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: null
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

const loadList = async () => {
  loading.value = true
  try {
    const data = await pageMyProducts({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status ?? undefined
    })
    list.value = (data.records || []).map((r) => ({ ...r, _switching: false }))
    total.value = data.total || 0
  } catch (e) {
    ElMessage.error(e.message || '加载商品列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadList)

const handleSearch = () => {
  query.pageNum = 1
  loadList()
}

const handleReset = () => {
  query.keyword = ''
  query.status = null
  query.pageNum = 1
  loadList()
}

const goPage = (page) => {
  query.pageNum = page
  loadList()
}

/* ---------- 金额展示：字符串直出，不做浮点运算 ---------- */
const formatPrice = (v) => (v == null ? '—' : String(v))

/* ---------- 上下架（status 走 query 参数） ---------- */
const toggleStatus = async (row) => {
  const next = row.status === 1 ? 0 : 1
  row._switching = true
  try {
    await updateMyProductStatus(row.id, next)
    row.status = next
    ElMessage.success(next === 1 ? '已上架' : '已下架')
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    row._switching = false
  }
}

/* ---------- 删除 ---------- */
const confirmDelete = async (row) => {
  try {
    await deleteMyProduct(row.id)
    ElMessage.success('已删除')
    if (list.value.length === 1 && query.pageNum > 1) query.pageNum -= 1
    loadList()
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

/* ---------- 抽屉 ---------- */
const drawerVisible = ref(false)
const editingProduct = ref(null)

const openCreate = () => {
  editingProduct.value = null
  drawerVisible.value = true
}

const openEdit = (row) => {
  editingProduct.value = row
  drawerVisible.value = true
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-900);
}

.page-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-500);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cover-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 1px solid var(--ink-300);
}

.muted {
  color: var(--ink-500);
}

.price {
  display: block;
  font-weight: 600;
  color: var(--ink-900);
}

.orig {
  display: block;
  font-size: 11px;
  color: var(--ink-300);
  text-decoration: line-through;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}

.pager-info {
  font-size: 13px;
  color: var(--ink-500);
}
</style>
