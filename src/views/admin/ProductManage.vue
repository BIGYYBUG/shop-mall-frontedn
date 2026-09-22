<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">商品管理</h1>
        <p class="page-desc">全平台商品 · 与卖家端是两个独立入口，权限码不同（见 api/adminProduct.js）</p>
      </div>
      <el-button type="primary" @click="openCreate">新增商品（平台自营）</el-button>
    </header>

    <!-- ---------------- 工具栏（比卖家端多分类筛选） ---------------- -->
    <section class="toolbar">
      <el-input
        v-model.trim="query.keyword"
        placeholder="搜索商品名"
        clearable
        style="width: 220px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 120px" @change="handleSearch">
        <el-option label="上架" :value="1" />
        <el-option label="下架" :value="0" />
      </el-select>
      <el-select v-model="query.categoryId" placeholder="全部分类" clearable style="width: 140px" @change="handleSearch">
        <el-option v-for="c in CATEGORY_OPTIONS" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </section>

    <!-- ---------------- 表格 ---------------- -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
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
        <el-table-column prop="name" label="商品名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            {{ categoryName(row.categoryId) || `#${row.categoryId}` }}
          </template>
        </el-table-column>
        <!-- 管理端特有：来源列 -->
        <el-table-column label="来源" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.sellerId === 0" type="info" effect="plain">平台自营</el-tag>
            <el-tag v-else type="warning" effect="plain">卖家 #{{ row.sellerId }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="110" align="right">
          <template #default="{ row }">
            <span class="price">¥{{ formatPrice(row.price) }}</span>
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

    <!-- ---------------- 新增 / 编辑抽屉（管理端模式，调 /admin/product） ---------------- -->
    <ProductFormDrawer v-model="drawerVisible" :product="editingProduct" mode="admin" @saved="loadList" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  deleteProduct,
  pageProducts,
  updateProductStatus
} from '../../api/adminProduct'
import { CATEGORY_OPTIONS, categoryName } from '../../constants/category'
import ProductFormDrawer from '../../components/ProductFormDrawer.vue'

/* ---------- 列表 ---------- */
const loading = ref(false)
const list = ref([])
const total = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: null,
  categoryId: null
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

const loadList = async () => {
  loading.value = true
  try {
    const data = await pageProducts({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status ?? undefined,
      categoryId: query.categoryId ?? undefined
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
  query.categoryId = null
  query.pageNum = 1
  loadList()
}

const goPage = (page) => {
  query.pageNum = page
  loadList()
}

const formatPrice = (v) => (v == null ? '—' : String(v))

/* ---------- 上下架（status 走 query） ---------- */
const toggleStatus = async (row) => {
  const next = row.status === 1 ? 0 : 1
  row._switching = true
  try {
    await updateProductStatus(row.id, next)
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
    await deleteProduct(row.id)
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
  font-weight: 600;
  color: var(--ink-900);
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
