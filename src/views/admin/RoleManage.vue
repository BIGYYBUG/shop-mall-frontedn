<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1 class="page-title">角色管理</h1>
        <p class="page-desc">角色的增删改与权限分配（权限点全量覆盖语义）</p>
      </div>
      <el-button type="primary" @click="openCreate">新增角色</el-button>
    </header>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="roles" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="code" label="角色编码" width="140">
          <template #default="{ row }">
            <span class="mono">{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="角色名称" width="140" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.builtIn === 1 ? 'warning' : 'info'" effect="plain">
              {{ row.builtIn === 1 ? '内置' : '自定义' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" effect="plain">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" @click="openPermissionDialog(row)">分配权限</el-button>
            <!-- 内置角色禁删：disabled 会同时锁 click，tooltip 只对禁用态生效 -->
            <el-tooltip
              content="内置角色不可删除"
              :disabled="row.builtIn !== 1"
              placement="top"
            >
              <span>
                <el-button
                  link
                  type="danger"
                  :disabled="row.builtIn === 1"
                  @click="confirmDelete(row)"
                >
                  删除
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ===== 新增 / 编辑弹窗 ===== -->
    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑角色' : '新增角色'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="角色编码" prop="code">
          <!-- 编辑态：后端 RoleUpdateDTO 没有 code 字段，改了也白改，直接只读 -->
          <el-input
            v-if="!editingId"
            v-model="form.code"
            placeholder="如 AUDITOR，大写字母开头"
            maxlength="32"
          />
          <el-input v-else :model-value="form.code" disabled>
            <template #suffix>
              <el-tooltip content="内置角色不可删除，编码创建后不可修改" placement="top">
                <el-icon><InfoFilled /></el-icon>
              </el-tooltip>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">正常</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :step="1" step-strictly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button :loading="submitting" type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 权限分配弹窗（全量覆盖语义） ===== -->
    <el-dialog
      v-model="permVisible"
      :title="`分配权限 · ${permRole?.name ?? ''}（${permRole?.code ?? ''}）`"
      width="680px"
      destroy-on-close
    >
      <div v-loading="permLoading">
        <p class="perm-hint">
          提交的勾选结果即该角色<b>最终</b>拥有的权限（全量覆盖，取消全部勾选 = 清空权限）。
        </p>

        <div v-for="group in permGroups" :key="group.prefix" class="perm-group">
          <div class="perm-group-head">
            <span class="perm-group-title">{{ group.prefix }}:*</span>
            <el-button
              link
              size="small"
              @click="toggleGroup(group)"
            >
              {{ isGroupAllChecked(group) ? '取消全组' : '勾选全组' }}
            </el-button>
          </div>
          <el-checkbox-group v-model="checkedPermIds">
            <el-checkbox
              v-for="p in group.items"
              :key="p.id"
              :value="p.id"
              :disabled="p.code === 'role:permission'"
            >
              {{ p.code }}
              <span class="perm-name">{{ p.name }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="role:permission 是修改角色权限的唯一入口，后端会拒绝移除它（防止自锁），该权限已锁定勾选。"
        />
      </div>

      <template #footer>
        <el-button @click="permVisible = false">取消</el-button>
        <el-button :loading="permSubmitting" type="primary" @click="submitPermissions">
          保存权限
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getRoleDetail,
  listPermissions,
  listRoles,
  updateRole
} from '../../api/role'

/* ---------- 列表 ---------- */
const loading = ref(false)
const roles = ref([])

const loadRoles = async () => {
  loading.value = true
  try {
    roles.value = await listRoles()
  } catch (e) {
    ElMessage.error(e.message || '加载角色列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadRoles)

/* ---------- 新增 / 编辑表单 ---------- */
const formVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const editingId = ref(null)

const emptyForm = () => ({
  code: '',
  name: '',
  description: '',
  status: 1,
  sort: 0
})

const form = reactive(emptyForm())

const formRules = {
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
      {
        pattern: /^[A-Z][A-Z0-9_]{1,31}$/,
        message: '大写字母开头，仅大写字母/数字/下划线，2-32 位',
        trigger: 'blur'
      }
  ],
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { max: 64, message: '最长 64 个字符', trigger: 'blur' }
  ],
  description: [{ max: 255, message: '最长 255 个字符', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  sort: [{ type: 'number', min: 0, message: '排序需为不小于 0 的整数', trigger: 'blur' }]
}

const openCreate = () => {
  editingId.value = null
  Object.assign(form, emptyForm())
  formVisible.value = true
}

/**
 * 编辑：先 GET /admin/role/{id} 回显（轻量 list 里没有的完整字段以详情为准）。
 */
const openEdit = async (row) => {
  editingId.value = row.id
  Object.assign(form, emptyForm())
  formVisible.value = true
  try {
    const detail = await getRoleDetail(row.id)
    // 只取表单契约内的字段；code 只读展示
    form.code = detail.code ?? row.code
    form.name = detail.name ?? ''
    form.description = detail.description ?? ''
    form.status = detail.status ?? 1
    form.sort = detail.sort ?? 0
  } catch (e) {
    formVisible.value = false
    ElMessage.error(e.message || '加载角色详情失败')
  }
}

const submitForm = async () => {
  // 校验失败会返回 rejected promise，必须 await 才能 catch 到
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    if (editingId.value) {
      // 编辑契约：RoleUpdateDTO 没有 code 字段，提交多余字段后端忽略，这里就不传
      await updateRole(editingId.value, {
        name: form.name,
        description: form.description,
        status: form.status,
        sort: form.sort
      })
      ElMessage.success('角色已更新')
    } else {
      await createRole({ ...form })
      ElMessage.success('角色已创建')
    }
    formVisible.value = false
    loadRoles()
  } catch (e) {
    // 后端业务 message 已是中文（如"角色编码已存在"），原样展示
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

/* ---------- 删除 ---------- */
const confirmDelete = (row) => {
  ElMessageBox.confirm(
    `确定删除角色「${row.name}（${row.code}）」？该角色关联的用户将同时失去对应权限。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
  )
    .then(async () => {
      try {
        await deleteRole(row.id)
        ElMessage.success('已删除')
        loadRoles()
      } catch (e) {
        // 典型失败："内置角色不可删除" / "角色仍被用户持有" —— 后端 message 原样展示
        ElMessage.error(e.message || '删除失败')
      }
    })
    .catch(() => {})
}

/* ---------- 权限分配弹窗 ---------- */
const permVisible = ref(false)
const permLoading = ref(false)
const permSubmitting = ref(false)
const permRole = ref(null)
const permissions = ref([])
const checkedPermIds = ref([])

/** 按 code 冒号前段分组（user:* / role:* / shop:* …），从字典推导，无需额外接口 */
const permGroups = computed(() => {
  const map = new Map()
  for (const p of permissions.value) {
    const prefix = p.code.includes(':') ? p.code.split(':')[0] : p.code
    if (!map.has(prefix)) map.set(prefix, [])
    map.get(prefix).push(p)
  }
  // 组内按 sort、组间按组名排序，展示稳定
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([prefix, items]) => ({
      prefix,
      items: [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    }))
})

/**
 * 打开弹窗：并行拉「权限字典全量」+「角色详情（permissionIds 回显）」。
 */
const openPermissionDialog = async (row) => {
  permRole.value = row
  permVisible.value = true
  permLoading.value = true
  checkedPermIds.value = []
  try {
    // allSettled：两个请求独立失败互不影响，任一失败都给出明确提示
    const [permRes, detailRes] = await Promise.allSettled([listPermissions(), getRoleDetail(row.id)])
    if (permRes.status === 'fulfilled') {
      permissions.value = permRes.value
    } else {
      ElMessage.error(permRes.reason?.message || '加载权限字典失败')
    }
    if (detailRes.status === 'fulfilled') {
      checkedPermIds.value = detailRes.value.permissionIds ?? []
    } else {
      ElMessage.error(detailRes.reason?.message || '加载角色已选权限失败')
    }
    // 锁定项兜底：即使回显数据里没有，也强制勾上 role:permission
    const lock = permissions.value.find((p) => p.code === 'role:permission')
    if (lock && !checkedPermIds.value.includes(lock.id)) {
      checkedPermIds.value = [...checkedPermIds.value, lock.id]
    }
  } finally {
    permLoading.value = false
  }
}

const isGroupAllChecked = (group) =>
  group.items.every((p) => checkedPermIds.value.includes(p.id))

/** 组级勾选切换：受锁定项影响，全组勾选时锁定项天然保持勾上 */
const toggleGroup = (group) => {
  const ids = group.items.map((p) => p.id)
  if (isGroupAllChecked(group)) {
    checkedPermIds.value = checkedPermIds.value.filter((id) => !ids.includes(id))
    // 取消全组后把锁定项补回 —— checkbox disabled 不阻止 v-model 数组被程序改掉
    const lock = group.items.find((p) => p.code === 'role:permission')
    if (lock) checkedPermIds.value = [...checkedPermIds.value, lock.id]
  } else {
    checkedPermIds.value = [...new Set([...checkedPermIds.value, ...ids])]
  }
}

const submitPermissions = async () => {
  if (!permRole.value) return
  // 提交前兜底锁定项（理论上 UI 已挡住，双保险）
  const lock = permissions.value.find((p) => p.code === 'role:permission')
  const finalIds = lock && !checkedPermIds.value.includes(lock.id)
    ? [...checkedPermIds.value, lock.id]
    : checkedPermIds.value

  permSubmitting.value = true
  try {
    // 全量覆盖语义：传 [] = 清空。这里提交的就是终态
    await assignRolePermissions(permRole.value.id, finalIds)
    ElMessage.success(`已保存「${permRole.value.name}」的权限（共 ${finalIds.length} 项）`)
    permVisible.value = false
  } catch (e) {
    // 典型失败："不能移除 role:permission 权限" —— 后端 message 原样展示
    ElMessage.error(e.message || '保存权限失败')
  } finally {
    permSubmitting.value = false
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

.mono {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
}

/* ===== 权限弹窗 ===== */
.perm-hint {
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--ink-500);
}

.perm-group {
  padding: 12px 14px;
  margin-bottom: 12px;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-sm);
}

.perm-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.perm-group-title {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-900);
}

.perm-group .el-checkbox {
  display: flex;
  width: 100%;
  margin-right: 0;
}

.perm-name {
  margin-left: 6px;
  font-size: 12px;
  color: var(--ink-500);
}
</style>
