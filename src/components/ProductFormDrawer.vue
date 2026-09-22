<template>
  <el-drawer
    :model-value="modelValue"
    :title="product ? '编辑商品' : '新增商品'"
    size="520px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @open="initForm"
  >
    <div v-loading="detailLoading" class="drawer-body">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" maxlength="128" show-word-limit placeholder="必填" />
        </el-form-item>
        <el-form-item label="副标题" prop="subtitle">
          <el-input v-model="form.subtitle" maxlength="255" show-word-limit placeholder="一句话卖点" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <!-- 后端暂无分类接口，用固定常量兜底（见 constants/category.js 注释） -->
          <el-select v-model="form.categoryId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="c in CATEGORY_OPTIONS" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="售价 (¥)" prop="price">
          <el-input v-model="form.price" placeholder="如 199.00">
            <template #append>元</template>
          </el-input>
        </el-form-item>
        <el-form-item label="原价 (¥)" prop="originalPrice">
          <el-input v-model="form.originalPrice" placeholder="可选，展示划线价">
            <template #append>元</template>
          </el-input>
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="form.stock" :min="0" :step="1" step-strictly style="width: 100%" />
        </el-form-item>
        <el-form-item label="上架状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :step="1" step-strictly style="width: 100%" />
        </el-form-item>
        <el-form-item label="封面图" prop="coverKey">
          <!-- v-model=objectKey；编辑回显用 initial-urls 预览，未换图不提交该字段 -->
          <ImageUploader v-model="form.coverKey" category="product" :initial-urls="initialCoverUrl" />
        </el-form-item>
        <el-form-item label="图集" prop="images">
          <ImageUploader
            v-model="form.images"
            category="product"
            :limit="5"
            :initial-urls="initialImageUrls"
          />
        </el-form-item>
        <el-form-item label="商品详情" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" maxlength="2000" placeholder="图文详情（当前纯文本）" />
        </el-form-item>
      </el-form>

      <div class="drawer-actions">
        <el-button @click="$emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImageUploader from './ImageUploader.vue'
import { CATEGORY_OPTIONS } from '../constants/category'
import { getMyProduct, createMyProduct, updateMyProduct } from '../api/sellerProduct'
import {
  getProductDetail,
  createProduct,
  updateProduct
} from '../api/adminProduct'

/**
 * 商品新增/编辑抽屉 —— 卖家端与管理端共用。
 *
 * 同一件事两个入口、权限码不同（见 api/adminProduct.js 头注释），
 * 通过 mode 切换调用的接口组，表单逻辑完全一致。
 */
const props = defineProps({
  /** v-model：抽屉显隐 */
  modelValue: { type: Boolean, default: false },
  /** 编辑对象（ProductVO）；null = 新增 */
  product: { type: Object, default: null },
  /** 'seller' 走 /seller/product，'admin' 走 /admin/product */
  mode: { type: String, default: 'seller', validator: (v) => ['seller', 'admin'].includes(v) }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const formRef = ref(null)
const submitting = ref(false)
const detailLoading = ref(false)

/* 回显预览 URL（编辑时 ProductVO 给的是 URL 不是 key） */
const initialCoverUrl = ref('')
const initialImageUrls = ref([])

const emptyForm = () => ({
  name: '',
  subtitle: '',
  categoryId: null,
  price: '',
  originalPrice: '',
  stock: 0,
  status: 0, // 不传默认下架 → 新增默认给下架，卖家确认后再上架
  sort: 0,
  coverKey: '', // objectKey；编辑未换图时留空 = 不提交
  images: [], // objectKey[]；同上
  description: ''
})

const form = reactive(emptyForm())

/**
 * 价格校验：后端约束「最多 8 位整数 2 位小数」。
 * 金额一律按字符串传输（BigDecimal 序列化），禁止浮点运算。
 */
const priceValidator = (rule, value, callback) => {
  if (value === '' || value == null) {
    if (rule.field === 'originalPrice') return callback() // 原价可空
    return callback(new Error('请输入售价'))
  }
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) {
    return callback(new Error('最多 8 位整数、2 位小数，如 199.00'))
  }
  callback()
}

const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { max: 128, message: '最长 128 个字符', trigger: 'blur' }
  ],
  subtitle: [{ max: 255, message: '最长 255 个字符', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, validator: priceValidator, trigger: 'blur' }],
  originalPrice: [{ validator: priceValidator, trigger: 'blur' }],
  stock: [{ required: true, type: 'number', min: 0, message: '库存为 ≥0 的整数', trigger: 'blur' }]
}

/* ---------- 初始化：新增清空 / 编辑拉详情回显 ---------- */

const initForm = async () => {
  Object.assign(form, emptyForm())
  initialCoverUrl.value = ''
  initialImageUrls.value = []

  if (!props.product) return

  detailLoading.value = true
  try {
    // 卖家端非本人商品 404；管理端全平台可查
    const detail =
      props.mode === 'seller' ? await getMyProduct(props.product.id) : await getProductDetail(props.product.id)

    form.name = detail.name ?? ''
    form.subtitle = detail.subtitle ?? ''
    form.categoryId = detail.categoryId ?? null
    form.price = detail.price != null ? String(detail.price) : ''
    form.originalPrice = detail.originalPrice != null ? String(detail.originalPrice) : ''
    form.stock = detail.stock ?? 0
    form.status = detail.status ?? 0
    form.sort = detail.sort ?? 0
    form.description = detail.description ?? ''

    // ⚠️ 图片：VO 出参是 URL，入参要 key —— 后端未同时回 key 时
    // 采用文档建议的兜底：只做预览，未换图就不提交该字段
    initialCoverUrl.value = detail.coverUrl || ''
    initialImageUrls.value = detail.imageUrls || []
    form.coverKey = ''
    form.images = []
  } catch (e) {
    ElMessage.error(e.message || '加载商品详情失败')
    emit('update:modelValue', false)
  } finally {
    detailLoading.value = false
  }
}

/* ---------- 提交 ---------- */

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payload = {
    name: form.name,
    subtitle: form.subtitle || undefined,
    categoryId: form.categoryId,
    price: form.price,
    originalPrice: form.originalPrice || undefined,
    stock: form.stock,
    status: form.status,
    sort: form.sort,
    description: form.description || undefined
  }

  // 图片字段：只在用户本次上传过（有新 objectKey）时提交，
  // 避免编辑未换图时空值把已有图片清掉
  if (form.coverKey) payload.coverKey = form.coverKey
  if (form.images && form.images.length) payload.images = form.images

  submitting.value = true
  try {
    if (props.product) {
      const id = props.product.id
      if (props.mode === 'seller') await updateMyProduct(id, payload)
      else await updateProduct(id, payload)
      ElMessage.success('商品已更新')
    } else {
      if (props.mode === 'seller') await createMyProduct(payload)
      else await createProduct(payload)
      ElMessage.success('商品已创建（下架状态，确认无误后可上架）')
    }
    emit('update:modelValue', false)
    emit('saved')
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.drawer-body {
  padding: 0 20px 20px;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
