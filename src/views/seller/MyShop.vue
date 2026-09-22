<template>
  <div class="page">
    <!-- ============ 加载中 ============ -->
    <div v-if="loading" class="state-box">
      <p class="state-text">正在加载店铺信息…</p>
    </div>

    <!-- ============ 态一：没有店铺 → 申请入驻表单 ============ -->
    <template v-else-if="view === 'apply'">
      <header class="page-head">
        <div>
          <h1 class="page-title">申请开店</h1>
          <p class="page-desc">提交后平台将审核你的资质，通过后即可上架商品</p>
        </div>
      </header>

      <el-card shadow="never" class="form-card">
        <el-form
          ref="applyFormRef"
          :model="form"
          :rules="formRules"
          label-width="100px"
          style="max-width: 560px"
        >
          <el-form-item label="店铺名称" prop="name">
            <el-input v-model="form.name" maxlength="64" show-word-limit placeholder="给顾客看的名字" />
          </el-form-item>
          <el-form-item label="店铺 Logo" prop="logoKey">
            <!-- v-model 绑 objectKey，符合"提交传 key、展示用 url"契约 -->
            <ImageUploader v-model="form.logoKey" category="shop" />
          </el-form-item>
          <el-form-item label="店铺简介" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="3" maxlength="512" show-word-limit />
          </el-form-item>
          <el-form-item label="联系电话" prop="contactPhone">
            <el-input v-model="form.contactPhone" maxlength="11" placeholder="11 位手机号，方便平台联系" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="submitApply">提交申请</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </template>

    <!-- ============ 态二~五：已有店铺 ============ -->
    <template v-else>
      <header class="page-head">
        <div>
          <h1 class="page-title">我的店铺</h1>
          <p class="page-desc">店铺状态与资料维护</p>
        </div>
        <!-- 仅「正常」态可编辑资料 -->
        <el-button
          v-if="shop.status === 1"
          type="primary"
          @click="startEdit"
        >
          编辑资料
        </el-button>
      </header>

      <!-- 待审核 -->
      <el-alert
        v-if="shop.status === 0"
        class="status-alert"
        type="warning"
        :closable="false"
        show-icon
        title="资料审核中，请耐心等待"
        description="平台会尽快处理你的开店申请，审核通过后将获得卖家权限。"
      />

      <!-- 已驳回：必须显眼展示驳回原因 -->
      <el-alert
        v-else-if="shop.status === 2"
        class="status-alert"
        type="error"
        :closable="false"
        show-icon
        title="开店申请被驳回"
      >
        <template #default>
          <p class="reject-reason">驳回原因：{{ shop.rejectReason || '（平台未填写原因）' }}</p>
          <p>你可以修改资料后重新提交申请。</p>
        </template>
      </el-alert>

      <!-- 已冻结 -->
      <el-alert
        v-else-if="shop.status === 3"
        class="status-alert"
        type="info"
        :closable="false"
        show-icon
        title="店铺已被冻结"
        description="如有疑问请联系平台客服。冻结期间无法编辑资料或上架商品。"
      />

      <el-card shadow="never" class="form-card">
        <!-- 展示态 -->
        <el-descriptions v-if="!editing" :column="1" border style="max-width: 560px">
          <el-descriptions-item label="店铺名称">{{ shop.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType" effect="plain">{{ shop.statusText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="店铺 Logo">
            <el-image
              v-if="shop.logoUrl"
              :src="shop.logoUrl"
              :preview-src-list="[shop.logoUrl]"
              fit="cover"
              style="width: 100px; height: 100px; border-radius: 8px"
            />
            <span v-else class="muted">未设置</span>
          </el-descriptions-item>
          <el-descriptions-item label="简介">{{ shop.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ shop.contactPhone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatTime(shop.createTime) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 编辑态（仅正常店铺） -->
        <el-form
          v-else
          ref="editFormRef"
          :model="form"
          :rules="formRules"
          label-width="100px"
          style="max-width: 560px"
        >
          <el-form-item label="店铺名称" prop="name">
            <el-input v-model="form.name" maxlength="64" show-word-limit />
          </el-form-item>
          <el-form-item label="店铺 Logo" prop="logoKey">
            <!-- initial-urls 做回显预览；用户换图后 modelValue 被新 key 覆盖 -->
            <ImageUploader v-model="form.logoKey" category="shop" :initial-urls="shop.logoUrl" />
          </el-form-item>
          <el-form-item label="店铺简介" prop="description">
            <el-input v-model="form.description" type="textarea" :rows="3" maxlength="512" show-word-limit />
          </el-form-item>
          <el-form-item label="联系电话" prop="contactPhone">
            <el-input v-model="form.contactPhone" maxlength="11" />
          </el-form-item>
          <el-form-item>
            <el-button :loading="submitting" type="primary" @click="submitEdit">保存</el-button>
            <el-button @click="cancelEdit">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 驳回态：重新提交入口 -->
      <div v-if="shop.status === 2 && !editing" class="resubmit">
        <el-button type="primary" @click="startEdit">修改资料并重新提交</el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { applyShop, getMyShop, updateMyShop } from '../../api/sellerShop'
import ImageUploader from '../../components/ImageUploader.vue'

/* ---------- 状态机 ---------- */
const loading = ref(true)
const submitting = ref(false)
const editing = ref(false)

/**
 * view 三值：
 *   'apply'  无店铺（/mine 404）→ 申请表单
 *   'shop'   有店铺 → 由 shop.status 细分展示态
 */
const view = ref('shop')

/** /mine 返回的 ShopVO */
const shop = ref(null)

/* ---------- 表单（申请与编辑共用一套字段与校验） ---------- */
const applyFormRef = ref(null)
const editFormRef = ref(null)

const emptyForm = () => ({ name: '', logoKey: '', description: '', contactPhone: '' })
const form = reactive(emptyForm())

const formRules = {
  name: [
    { required: true, message: '请输入店铺名称', trigger: 'blur' },
    { max: 64, message: '最长 64 个字符', trigger: 'blur' }
  ],
  description: [{ max: 512, message: '最长 512 个字符', trigger: 'blur' }],
  contactPhone: [
    // 可空，但填了就必须是合法手机号（与后端校验一致）
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的 11 位手机号',
      trigger: 'blur'
    }
  ]
}

/* ---------- 状态标签色（statusText 直接用后端中文） ---------- */
const statusTagType = computed(() => {
  switch (shop.value?.status) {
    case 0: return 'warning'
    case 1: return 'success'
    case 2: return 'danger'
    case 3: return 'info'
    default: return 'info'
  }
})

/* ---------- 初始化：调 /mine 决定走哪个态 ---------- */
const load = async () => {
  loading.value = true
  editing.value = false
  try {
    shop.value = await getMyShop()
    view.value = 'shop'
  } catch (e) {
    // 无店铺 → 404。判断方式按文档：message 含"不存在"兜底
    const msg = e.message || ''
    if (msg.includes('不存在') || msg.includes('404')) {
      view.value = 'apply'
      Object.assign(form, emptyForm())
    } else {
      // 真错误（网络/403）：展示但不跳转，用户可刷新重试
      ElMessage.error(msg || '加载店铺信息失败')
      view.value = 'shop'
      shop.value = null
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

/* ---------- 提交：申请入驻 ---------- */
const submitApply = async () => {
  try {
    await applyFormRef.value.validate()
  } catch {
    return
  }

  // 提交 payload 只含 ShopDTO 契约字段（绝无 status）
  submitting.value = true
  try {
    await applyShop({
      name: form.name,
      logoKey: form.logoKey || undefined,
      description: form.description || undefined,
      contactPhone: form.contactPhone || undefined
    })
    ElMessage.success('申请已提交，等待平台审核')
    load() // 重新拉 /mine：状态应变为「审核中」
  } catch (e) {
    ElMessage.error(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

/* ---------- 编辑（仅 status===1） ---------- */
const startEdit = () => {
  Object.assign(form, {
    name: shop.value.name || '',
    // logoKey 从 URL 推导不可靠，编辑时先置空：不换图就不提交该字段
    logoKey: '',
    description: shop.value.description || '',
    contactPhone: shop.value.contactPhone || ''
  })
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
}

const submitEdit = async () => {
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      contactPhone: form.contactPhone || undefined
    }
    // 用户重新传了 Logo 才提交 logoKey（objectKey）；
    // 没换图时留空不提交，后端保持原 Logo —— 避免空值把已传 Logo 清掉
    if (form.logoKey) payload.logoKey = form.logoKey

    await updateMyShop(payload)
    ElMessage.success('店铺资料已更新')
    editing.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

/* ---------- 工具 ---------- */
const formatTime = (value) => {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
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

.form-card {
  max-width: 760px;
}

.status-alert {
  max-width: 760px;
}

.reject-reason {
  font-weight: 600;
  margin-bottom: 4px;
}

.resubmit {
  max-width: 760px;
}

.muted {
  color: var(--ink-500);
  font-size: 13px;
}

.state-box {
  padding: 80px 0;
  text-align: center;
}

.state-text {
  font-size: 14px;
  color: var(--ink-500);
}
</style>
