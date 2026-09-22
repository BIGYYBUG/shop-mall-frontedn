<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">店铺审核</h1>
        <p class="page-desc">
          通过将授予店主卖家角色；驳回/冻结将收回角色，冻结同时下架全店在售商品（服务端原子操作）
        </p>
      </div>
      <el-button :disabled="loading" @click="loadList">刷新</el-button>
    </header>

    <!-- ---------------- 工具栏 ---------------- -->
    <section class="toolbar">
      <el-input
        v-model.trim="query.keyword"
        placeholder="搜索店铺名"
        clearable
        style="width: 260px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 160px" @change="handleSearch">
        <el-option label="待审核" :value="0" />
        <el-option label="正常" :value="1" />
        <el-option label="已驳回" :value="2" />
        <el-option label="已冻结" :value="3" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
    </section>

    <!-- ---------------- 表格 ---------------- -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="Logo" width="110">
          <template #default="{ row }">
            <el-image
              v-if="row.logoUrl"
              :src="row.logoUrl"
              :preview-src-list="[row.logoUrl]"
              fit="cover"
              preview-teleported
              class="logo-img"
            />
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="店铺名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="ownerUsername" label="店主" width="130">
          <template #default="{ row }">
            <span class="mono">{{ row.ownerUsername }}</span>
            <span class="muted uid">#{{ row.userId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="contactPhone" label="联系电话" width="130">
          <template #default="{ row }">
            <span class="mono">{{ row.contactPhone || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <!-- statusText 用后端中文，前端不再 switch 一份 -->
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)" effect="plain">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="驳回原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.rejectReason" class="reject">{{ row.rejectReason }}</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">
            <span class="mono muted">{{ formatTime(row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <!-- 待审核 / 已驳回（允许改判）：通过、驳回 -->
            <template v-if="row.status === 0 || row.status === 2">
              <el-button link type="success" @click="confirmApprove(row)">通过</el-button>
              <el-button link type="danger" @click="openReject(row)">驳回</el-button>
            </template>
            <!-- 正常：冻结 -->
            <el-button v-else-if="row.status === 1" link type="warning" @click="confirmFreeze(row)">
              冻结
            </el-button>
            <!-- 已冻结：解冻（即通过 status=1） -->
            <el-button v-else-if="row.status === 3" link type="success" @click="confirmUnfreeze(row)">
              解冻
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ---------------- 分页 ---------------- -->
      <div class="pager">
        <span class="pager-info">共 {{ total }} 家 · 第 {{ query.pageNum }} / {{ totalPages }} 页</span>
        <el-pagination
          layout="prev, pager, next"
          :total="total"
          :page-size="query.pageSize"
          :current-page="query.pageNum"
          @current-change="goPage"
        />
      </div>
    </el-card>

    <!-- ---------------- 驳回弹窗（必填原因） ---------------- -->
    <el-dialog v-model="rejectVisible" title="驳回开店申请" width="480px" destroy-on-close>
      <p class="dialog-tip">
        驳回后店主将被收回 SELLER 角色，但可修改资料后重新提交。原因会展示给店主。
      </p>
      <el-form ref="rejectFormRef" :model="rejectForm" :rules="rejectRules" label-position="top">
        <el-form-item label="驳回原因（必填）" prop="rejectReason">
          <el-input
            v-model="rejectForm.rejectReason"
            type="textarea"
            :rows="3"
            maxlength="255"
            show-word-limit
            placeholder="例如：店铺名称不符合规范，请修改后重新提交"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button :loading="submitting" type="danger" @click="submitReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { auditShop, pageShops } from '../../api/shop'

/* ---------- 列表 ---------- */
const loading = ref(false)
const list = ref([])
const total = ref(0)

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: null // el-select clearable 时是 null/undefined，提交前转 undefined
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

const loadList = async () => {
  loading.value = true
  try {
    const data = await pageShops({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status ?? undefined
    })
    list.value = data.records || []
    total.value = data.total || 0
  } catch (e) {
    ElMessage.error(e.message || '加载店铺列表失败')
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

/* ---------- 展示辅助 ---------- */
/** 状态 tag 色：0 灰 / 1 绿 / 2 红 / 3 橙（与文档要求一致） */
const tagType = (status) => {
  switch (status) {
    case 1: return 'success'
    case 2: return 'danger'
    case 3: return 'warning'
    default: return 'info'
  }
}

const formatTime = (value) => {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

/* ---------- 审核动作 ---------- */
const submitting = ref(false)

const doAudit = async (row, payload, successText) => {
  submitting.value = true
  try {
    await auditShop(row.id, payload)
    ElMessage.success(`${row.name}：${successText}`)
    // 审核后当页数据可能变化（状态列/角色联动），重拉当前页
    loadList()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

/** 通过（status=1）。待审/驳回改判/解冻共用 */
const confirmApprove = (row) => {
  ElMessageBox.confirm(
    `通过「${row.name}」的开店申请？店主 ${row.ownerUsername} 将获得卖家角色。`,
    '审核确认',
    { type: 'success', confirmButtonText: '通过', cancelButtonText: '取消' }
  )
    .then(() => doAudit(row, { status: 1 }, '已通过'))
    .catch(() => {})
}

/** 解冻 = status 1（与通过等价，但语境不同文案不同） */
const confirmUnfreeze = (row) => {
  ElMessageBox.confirm(
    `解冻「${row.name}」？店铺将恢复正常，店主重新获得卖家角色。`,
    '解冻确认',
    { type: 'success', confirmButtonText: '解冻', cancelButtonText: '取消' }
  )
    .then(() => doAudit(row, { status: 1 }, '已解冻'))
    .catch(() => {})
}

/** 冻结（status=3）：连带下架全店商品，文案必须说清后果 */
const confirmFreeze = (row) => {
  ElMessageBox.confirm(
    `冻结「${row.name}」？\n冻结将同时下架该店全部在售商品，并收回店主的卖家角色。`,
    '冻结确认',
    { type: 'warning', confirmButtonText: '冻结', cancelButtonText: '取消' }
  )
    .then(() => doAudit(row, { status: 3 }, '已冻结'))
    .catch(() => {})
}

/* ---------- 驳回（必填原因） ---------- */
const rejectVisible = ref(false)
const rejectFormRef = ref(null)
const rejectRow = ref(null)
const rejectForm = reactive({ rejectReason: '' })
const rejectRules = {
  rejectReason: [
    { required: true, message: '请填写驳回原因', trigger: 'blur' },
    { max: 255, message: '最长 255 个字符', trigger: 'blur' }
  ]
}

const openReject = (row) => {
  rejectRow.value = row
  rejectForm.rejectReason = ''
  rejectVisible.value = true
}

const submitReject = async () => {
  try {
    await rejectFormRef.value.validate()
  } catch {
    return
  }
  const row = rejectRow.value
  submitting.value = true
  try {
    await auditShop(row.id, { status: 2, rejectReason: rejectForm.rejectReason })
    ElMessage.success(`${row.name}：已驳回`)
    rejectVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error(e.message || '驳回失败')
  } finally {
    submitting.value = false
  }
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

.logo-img {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  border: 1px solid var(--ink-300);
}

.mono {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}

.muted {
  color: var(--ink-500);
}

.uid {
  margin-left: 4px;
  font-size: 11px;
}

.reject {
  color: var(--danger);
  font-size: 12px;
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

.dialog-tip {
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-500);
}
</style>
