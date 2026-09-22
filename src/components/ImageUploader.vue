<template>
  <div class="uploader" :class="{ 'is-multi': multiple }">
    <!-- 已上传项（单图/多图共用） -->
    <div v-for="(item, i) in items" :key="item.key" class="thumb">
      <img :src="item.url" :alt="`已上传图片 ${i + 1}`" />
      <button
        type="button"
        class="thumb-remove"
        :aria-label="multiple ? `删除第 ${i + 1} 张` : '删除图片'"
        @click="removeAt(i)"
      >
        ×
      </button>
      <!-- 多图模式：左移/右移排序 -->
      <span v-if="multiple && items.length > 1" class="thumb-ops">
        <button
          type="button"
          :disabled="i === 0"
          aria-label="左移"
          @click="moveAt(i, -1)"
        >←</button>
        <button
          type="button"
          :disabled="i === items.length - 1"
          aria-label="右移"
          @click="moveAt(i, 1)"
        >→</button>
      </span>
      <span v-if="item.uploading" class="thumb-mask">上传中…</span>
    </div>

    <!-- 上传入口（达到上限后隐藏） -->
    <label v-if="canAdd" class="picker" :class="{ disabled: uploadingCount > 0 }">
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        :multiple="multiple"
        :disabled="uploadingCount > 0"
        @change="onPick"
      />
      <span class="picker-plus">+</span>
      <span class="picker-text">
        {{ uploadingCount > 0 ? `上传中 ${uploadingCount}` : hintText }}
      </span>
    </label>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadImage } from '../api/file'

/**
 * 通用图片上传组件。
 *
 * 核心契约（后端约定，见交接文档 1.6-4）：
 *   v-model 绑定的是 **objectKey**（单图 string / 多图 string[]），
 *   预览用的是上传接口返回的 **url**。
 *   「提交传 key、展示用 url」，绝不能把 URL 存进表单再提交回去。
 *
 * 编辑回显：父组件拿到后端 VO 的 coverUrl / imageUrls（完整 URL）后，
 * 通过 initial-urls 传入做纯预览；一旦用户重新上传，值就会被新 objectKey 覆盖。
 */
const props = defineProps({
  /** v-model：单图 string（objectKey），多图 string[] */
  modelValue: { type: [String, Array], default: null },
  /** 初始预览 URL（编辑回显用；不改变 modelValue） */
  initialUrls: { type: [String, Array], default: null },
  /** 对象存储目录：product | shop | avatar | common */
  category: { type: String, default: 'common' },
  /** 上传数量上限，>1 即多图模式 */
  limit: { type: Number, default: 1 },
  maxSizeMB: { type: Number, default: 5 }
})

const emit = defineEmits(['update:modelValue'])

const multiple = computed(() => props.limit > 1)
const inputRef = ref(null)

/**
 * 内部展示模型：{ key(objectKey|本地去重id), url, uploading }
 * 纯预览项（回显的 URL，没有 key）key 用 'preview:' 前缀占位。
 */
const items = ref([])

const uploadingCount = computed(() => items.value.filter((it) => it.uploading).length)
const canAdd = computed(() => items.value.length < props.limit)

const hintText = computed(() =>
  multiple.value ? `${items.value.length}/${props.limit}` : '上传图片'
)

/* ---------- modelValue / initialUrls → 内部模型同步 ---------- */

const buildFromProps = () => {
  const urls = props.initialUrls
  const vals = props.modelValue

  // 多图模式
  if (multiple.value) {
    const list = []
    const urlList = Array.isArray(urls) ? urls : urls ? [urls] : []
    const keyList = Array.isArray(vals) ? vals : vals ? [vals] : []
    // key 与回显 URL 按下标配对（编辑场景：后端保证两数组同序）
    urlList.forEach((u, i) => {
      list.push({ key: keyList[i] || `preview:${i}:${u}`, url: u, uploading: false })
    })
    // 有 key 但没有对应 URL 的（理论少见）：不预览但保留在值里
    items.value = list
    return
  }

  // 单图模式
  if (vals && typeof vals === 'string') {
    const url = typeof urls === 'string' ? urls : Array.isArray(urls) ? urls[0] : ''
    items.value = [{ key: vals, url, uploading: false }]
  } else if (urls) {
    // 没有值只有预览 URL：纯回显态
    const u = typeof urls === 'string' ? urls : Array.isArray(urls) ? urls[0] : ''
    items.value = [{ key: `preview:0:${u}`, url: u, uploading: false }]
  } else {
    items.value = []
  }
}

// 父组件外部改值（如重置表单）时同步内部模型
watch(
  () => [props.modelValue, props.initialUrls],
  () => buildFromProps(),
  { immediate: true }
)

/* ---------- 内部模型 → modelValue 回写 ---------- */

const emitValue = () => {
  if (multiple.value) {
    // 纯预览项（未重新上传）不计入提交值 —— 它没有 objectKey
    const keys = items.value.map((it) => it.key).filter((k) => !k.startsWith('preview:'))
    emit('update:modelValue', keys)
  } else {
    const first = items.value[0]
    emit('update:modelValue', first && !first.key.startsWith('preview:') ? first.key : '')
  }
}

/* ---------- 上传流程 ---------- */

const onPick = async (e) => {
  const files = [...(e.target.files || [])]
  e.target.value = '' // 允许连续选同一个文件
  if (!files.length) return

  const slots = props.limit - items.value.length
  if (files.length > slots) {
    ElMessage.warning(`最多还能上传 ${slots} 张，已忽略多出的 ${files.length - slots} 张`)
    files.length = slots
  }

  for (const file of files) {
    // 前置校验：类型 + 大小（后端还有魔数校验，这里只是省流量与体验）
    if (!file.type.startsWith('image/')) {
      ElMessage.error(`「${file.name}」不是图片文件`)
      continue
    }
    if (file.size > props.maxSizeMB * 1024 * 1024) {
      ElMessage.error(`「${file.name}」超过 ${props.maxSizeMB}MB 上限`)
      continue
    }
    await uploadOne(file)
  }
}

const uploadOne = async (file) => {
  const localId = `local:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const localUrl = URL.createObjectURL(file)
  const item = reactive({ key: localId, url: localUrl, uploading: true })
  items.value.push(item)

  try {
    const data = await uploadImage(file, props.category)
    // 上传成功：key 换成 objectKey，url 换成服务端地址，释放本地 blob
    item.key = data.objectKey
    item.url = data.url
    URL.revokeObjectURL(localUrl)
    emitValue()
  } catch (e) {
    // 失败：从展示列表移除（本地 blob 一并释放）
    items.value = items.value.filter((it) => it !== item)
    URL.revokeObjectURL(localUrl)
    ElMessage.error(e.message || `「${file.name}」上传失败`)
  } finally {
    item.uploading = false
  }
}

const removeAt = (i) => {
  const [removed] = items.value.splice(i, 1)
  if (removed.key.startsWith('local:')) URL.revokeObjectURL(removed.url)
  emitValue()
}

const moveAt = (i, dir) => {
  const j = i + dir
  if (j < 0 || j >= items.value.length) return
  const arr = items.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  emitValue()
}
</script>

<style scoped>
.uploader {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.thumb {
  position: relative;
  width: 100px;
  height: 100px;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #fff;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 0 0 0 8px;
  background: rgba(22, 24, 29, 0.6);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.thumb-remove:hover {
  background: var(--danger);
}

.thumb-ops {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
}

.thumb-ops button {
  flex: 1;
  height: 20px;
  border: none;
  background: rgba(22, 24, 29, 0.6);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.thumb-ops button:first-child {
  border-right: 1px solid rgba(255, 255, 255, 0.25);
}

.thumb-ops button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.thumb-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  color: var(--ink-700);
}

.picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100px;
  height: 100px;
  border: 1px dashed var(--ink-300);
  border-radius: var(--radius-sm);
  background: var(--canvas);
  color: var(--ink-500);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.picker:hover {
  border-color: var(--brand-500);
  color: var(--brand-600);
}

.picker.disabled {
  opacity: 0.6;
  cursor: wait;
}

.picker input {
  display: none;
}

.picker-plus {
  font-size: 24px;
  line-height: 1;
}

.picker-text {
  font-size: 11px;
}
</style>
