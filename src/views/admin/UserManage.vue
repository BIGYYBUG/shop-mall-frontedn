<template>
  <div class="page container">
    <header class="page-head">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-desc">
          共 <strong>{{ total }}</strong> 位用户 · 角色与权限由后端 RBAC 统一控制
        </p>
      </div>
      <button class="btn-ghost" :disabled="loading" @click="loadList">
        {{ loading ? '加载中…' : '刷新' }}
      </button>
    </header>

    <!-- ---------------- 工具栏 ---------------- -->
    <section class="toolbar">
      <div class="field-inline">
        <input
          v-model.trim="query.keyword"
          type="text"
          placeholder="搜索用户名 / 昵称 / 手机号"
          @keyup.enter="handleSearch"
        />
      </div>

      <div class="field-inline">
        <select v-model="query.status">
          <option value="">全部状态</option>
          <option :value="1">正常</option>
          <option :value="0">已禁用</option>
        </select>
      </div>

      <button class="btn-primary" @click="handleSearch">查询</button>
      <button class="btn-ghost" @click="handleReset">重置</button>
    </section>

    <!-- ---------------- 表格 ---------------- -->
    <section class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 70px">ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>手机号</th>
            <th style="width: 150px">角色</th>
            <th style="width: 110px">状态</th>
            <th style="width: 160px">创建时间</th>
            <th style="width: 300px">操作</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty">正在加载…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="8" class="empty">没有符合条件的用户</td>
          </tr>

          <tr v-for="row in list" :key="row.id">
            <td class="mono">{{ row.id }}</td>
            <td>
              <span class="strong">{{ row.username }}</span>
              <span v-if="isSelf(row)" class="self-tag">本人</span>
            </td>
            <td>{{ row.nickname || '—' }}</td>
            <td class="mono">{{ row.phone || '—' }}</td>
            <td>
              <span
                v-for="code in row.roles"
                :key="code"
                class="role-tag"
                :class="code === 'ADMIN' ? 'role-admin' : 'role-user'"
              >
                {{ code }}
              </span>
              <span v-if="!row.roles || !row.roles.length" class="muted">无角色</span>
            </td>
            <td>
              <button
                class="status-pill"
                :class="row.status === 1 ? 'on' : 'off'"
                :disabled="isSelf(row)"
                :title="isSelf(row) ? '不能禁用当前登录账号' : '点击切换状态'"
                @click="toggleStatus(row)"
              >
                {{ row.status === 1 ? '正常' : '已禁用' }}
              </button>
            </td>
            <td class="mono muted">{{ formatTime(row.createTime) }}</td>
            <td>
              <div class="ops">
                <button class="op" @click="openEdit(row)">编辑</button>
                <button class="op" @click="openRoles(row)">角色</button>
                <button class="op" @click="openPassword(row)">改密</button>
                <button
                  class="op danger"
                  :disabled="isSelf(row)"
                  @click="openDelete(row)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ---------------- 分页 ---------------- -->
      <div class="pager">
        <span class="pager-info">
          第 {{ query.pageNum }} / {{ totalPages }} 页
        </span>
        <div class="pager-btns">
          <button :disabled="query.pageNum <= 1" @click="goPage(query.pageNum - 1)">上一页</button>
          <button :disabled="query.pageNum >= totalPages" @click="goPage(query.pageNum + 1)">下一页</button>
        </div>
      </div>
    </section>

    <!-- ---------------- 编辑弹窗 ---------------- -->
    <div v-if="modal.type === 'edit'" class="mask" @click.self="closeModal">
      <div class="dialog">
        <h3 class="dialog-title">编辑用户 · {{ modal.row.username }}</h3>

        <label class="dialog-field">
          <span>昵称</span>
          <input v-model.trim="editForm.nickname" type="text" maxlength="64" />
        </label>
        <label class="dialog-field">
          <span>手机号</span>
          <input v-model.trim="editForm.phone" type="text" placeholder="11 位手机号" />
        </label>
        <label class="dialog-field">
          <span>邮箱</span>
          <input v-model.trim="editForm.email" type="text" />
        </label>
        <label class="dialog-field">
          <span>头像地址</span>
          <input v-model.trim="editForm.avatar" type="text" placeholder="https://…" />
        </label>

        <p class="dialog-tip">留空表示清空该字段；用户名与密码不在此处修改。</p>

        <div class="dialog-actions">
          <button class="btn-ghost" @click="closeModal">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="submitEdit">
            {{ submitting ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ---------------- 角色分配弹窗 ---------------- -->
    <div v-if="modal.type === 'roles'" class="mask" @click.self="closeModal">
      <div class="dialog">
        <h3 class="dialog-title">分配角色 · {{ modal.row.username }}</h3>

        <p class="dialog-tip">
          采用「全量覆盖」：提交后该用户只保留勾选的角色。全部取消勾选即收回所有角色。
        </p>

        <div class="role-list">
          <label v-for="role in roleOptions" :key="role.id" class="role-item">
            <input v-model="selectedRoleIds" type="checkbox" :value="role.id" />
            <span class="role-name">{{ role.name }}</span>
            <code class="role-code">{{ role.code }}</code>
            <span class="role-desc">{{ role.description }}</span>
          </label>
        </div>

        <div class="dialog-actions">
          <button class="btn-ghost" @click="closeModal">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="submitRoles">
            {{ submitting ? '提交中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ---------------- 重置密码弹窗 ---------------- -->
    <div v-if="modal.type === 'password'" class="mask" @click.self="closeModal">
      <div class="dialog">
        <h3 class="dialog-title">重置密码 · {{ modal.row.username }}</h3>

        <label class="dialog-field">
          <span>新密码</span>
          <input
            v-model="passwordForm.newPassword"
            type="text"
            placeholder="6-32 位"
            maxlength="32"
          />
        </label>

        <p class="dialog-tip">
          管理端重置不校验原密码；重置后旧令牌不会被吊销，这一点留到「登录态治理」阶段处理。
        </p>

        <div class="dialog-actions">
          <button class="btn-ghost" @click="closeModal">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="submitPassword">
            {{ submitting ? '提交中…' : '确认重置' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ---------------- 删除确认弹窗 ---------------- -->
    <div v-if="modal.type === 'delete'" class="mask" @click.self="closeModal">
      <div class="dialog">
        <h3 class="dialog-title">删除用户</h3>
        <p class="dialog-tip">
          确定要删除 <strong>{{ modal.row.username }}</strong> 吗？
          这是逻辑删除：数据行仍保留在数据库中（标记为已删除），后续可审计、可恢复。
        </p>
        <div class="dialog-actions">
          <button class="btn-ghost" @click="closeModal">取消</button>
          <button class="btn-danger" :disabled="submitting" @click="submitDelete">
            {{ submitting ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ---------------- 轻提示 ---------------- -->
    <transition name="toast">
      <div v-if="toastMsg.text" class="toast" :class="toastMsg.type">{{ toastMsg.text }}</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  pageUsers,
  getUserRoleIds,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  assignUserRoles,
  listRoles
} from '../../api/admin'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const roleOptions = ref([])

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: ''
})

const modal = reactive({ type: '', row: null })
const editForm = reactive({ nickname: '', phone: '', email: '', avatar: '' })
const selectedRoleIds = ref([])
const passwordForm = reactive({ newPassword: '' })
const toastMsg = reactive({ text: '', type: 'info' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))

/** 是否是当前登录的自己 —— 后端会拦截「禁用/删除自己」，前端先给出视觉提示 */
const isSelf = (row) => row.id === userStore.userInfo?.id

const showToast = (text, type = 'info') => {
  toastMsg.text = text
  toastMsg.type = type
  setTimeout(() => {
    toastMsg.text = ''
  }, 2600)
}

/** 后端返回的时间是 ISO 字符串，这里只展示到分钟 */
const formatTime = (value) => {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

// ------------------------------------------------------------------
// 列表
// ------------------------------------------------------------------
const loadList = async () => {
  loading.value = true
  try {
    const data = await pageUsers({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      // 空字符串要转成 undefined，否则后端会当成有效筛选条件
      keyword: query.keyword || undefined,
      status: query.status === '' ? undefined : query.status
    })
    list.value = data.records || []
    total.value = data.total || 0
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

const loadRoles = async () => {
  try {
    roleOptions.value = await listRoles()
  } catch (e) {
    // 没有角色列表权限时不阻塞页面，仅提示
    showToast(e.message, 'error')
  }
}

const handleSearch = () => {
  query.pageNum = 1
  loadList()
}

const handleReset = () => {
  query.keyword = ''
  query.status = ''
  query.pageNum = 1
  loadList()
}

const goPage = (page) => {
  query.pageNum = page
  loadList()
}

// ------------------------------------------------------------------
// 状态切换
// ------------------------------------------------------------------
const toggleStatus = async (row) => {
  const next = row.status === 1 ? 0 : 1
  try {
    await updateUserStatus(row.id, next)
    row.status = next
    showToast(next === 1 ? '已启用' : '已禁用', 'success')
  } catch (e) {
    showToast(e.message, 'error')
  }
}

// ------------------------------------------------------------------
// 弹窗控制
// ------------------------------------------------------------------
const closeModal = () => {
  modal.type = ''
  modal.row = null
}

const openEdit = (row) => {
  modal.type = 'edit'
  modal.row = row
  editForm.nickname = row.nickname || ''
  editForm.phone = row.phone || ''
  editForm.email = row.email || ''
  editForm.avatar = row.avatar || ''
}

const submitEdit = async () => {
  submitting.value = true
  try {
    await updateUser(modal.row.id, { ...editForm })
    showToast('修改成功', 'success')
    closeModal()
    loadList()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    submitting.value = false
  }
}

const openRoles = async (row) => {
  modal.type = 'roles'
  modal.row = row
  selectedRoleIds.value = []
  try {
    selectedRoleIds.value = await getUserRoleIds(row.id)
  } catch (e) {
    showToast(e.message, 'error')
  }
}

const submitRoles = async () => {
  // 提权操作（role:assign）必须二次确认：
  // 全量覆盖语义下，确认框同时帮用户核对"终态角色清单"，防止误清角色
  const picked = roleOptions.value.filter((r) => selectedRoleIds.value.includes(r.id))
  const pickedText = picked.length
    ? picked.map((r) => r.code).join('、')
    : '（无任何角色）'
  const isSelfAssign = isSelf(modal.row)
  if (
    !window.confirm(
      `将用户 ${modal.row.username} 的角色设置为：${pickedText}\n` +
        '提交后仅保留以上角色（全量覆盖），其余角色将被移除。' +
        (isSelfAssign ? '\n注意：这是你自己的账号，移除 ADMIN 将导致失去管理权限（后端会拒绝）。' : '') +
        '\n\n确认提交？'
    )
  ) {
    return
  }

  submitting.value = true
  try {
    await assignUserRoles(modal.row.id, selectedRoleIds.value)
    showToast('角色已更新，权限缓存已同步刷新', 'success')
    closeModal()
    // 若改的是自己的角色，刷新本地 userInfo 里的 roles 展示
    if (isSelfAssign) {
      try {
        await userStore.refreshUserInfo()
      } catch {
        /* 刷新失败不影响主流程，头部昵称下次登录会纠正 */
      }
    }
    loadList()
  } catch (e) {
    // 典型拒绝：取消自己的 ADMIN 角色 —— message 原样展示
    showToast(e.message, 'error')
  } finally {
    submitting.value = false
  }
}

const openPassword = (row) => {
  modal.type = 'password'
  modal.row = row
  passwordForm.newPassword = ''
}

const submitPassword = async () => {
  if (passwordForm.newPassword.length < 6) {
    showToast('密码至少 6 位', 'error')
    return
  }
  submitting.value = true
  try {
    await resetUserPassword(modal.row.id, passwordForm.newPassword)
    showToast('密码已重置', 'success')
    closeModal()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    submitting.value = false
  }
}

const openDelete = (row) => {
  modal.type = 'delete'
  modal.row = row
}

const submitDelete = async () => {
  submitting.value = true
  try {
    await deleteUser(modal.row.id)
    showToast('已删除', 'success')
    closeModal()
    // 删掉当页最后一条时回退一页，避免停在空页
    if (list.value.length === 1 && query.pageNum > 1) query.pageNum -= 1
    loadList()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadList()
  loadRoles()
})
</script>

<style scoped>
.page {
  width: var(--container);
  max-width: 100%;
  margin: 0 auto;
  padding: 0 32px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
}

.page-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-500);
}

/* ---------- 工具栏 ---------- */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.field-inline input,
.field-inline select {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 13px;
  color: var(--ink-900);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-inline input {
  width: 280px;
}

.field-inline input:focus,
.field-inline select:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.btn-primary,
.btn-ghost,
.btn-danger {
  height: 36px;
  padding: 0 18px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.btn-primary {
  border: 1px solid var(--ink-900);
  background: var(--ink-900);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--brand-600);
  border-color: var(--brand-600);
}

.btn-ghost {
  border: 1px solid var(--ink-300);
  background: #fff;
  color: var(--ink-700);
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--ink-900);
  color: var(--ink-900);
}

.btn-danger {
  border: 1px solid var(--danger);
  background: var(--danger);
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(0.94);
}

.btn-primary:disabled,
.btn-ghost:disabled,
.btn-danger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ---------- 表格 ---------- */
.panel {
  background: #fff;
  border: 1px solid var(--ink-300);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  padding: 12px 14px;
  text-align: left;
  font-weight: 600;
  color: var(--ink-700);
  background: #fafbfc;
  border-bottom: 1px solid var(--ink-300);
  white-space: nowrap;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f0f1f3;
  color: var(--ink-900);
  vertical-align: middle;
}

.data-table tbody tr:hover {
  background: #fcfcfd;
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--ink-500);
}

.mono {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}

.muted {
  color: var(--ink-500);
}

.strong {
  font-weight: 600;
}

.self-tag {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 11px;
}

.role-tag {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 4px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.role-admin {
  background: #fdecec;
  color: #a32d2d;
}

.role-user {
  background: #eef2ff;
  color: var(--brand-600);
}

.status-pill {
  height: 24px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  cursor: pointer;
}

.status-pill.on {
  background: #e9f7ee;
  border-color: #bfe6cd;
  color: var(--success);
}

.status-pill.off {
  background: #f4f4f5;
  border-color: #e2e3e6;
  color: var(--ink-500);
}

.status-pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ops {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.op {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: var(--brand-600);
  cursor: pointer;
}

.op:hover:not(:disabled) {
  text-decoration: underline;
}

.op.danger {
  color: var(--danger);
}

.op:disabled {
  color: var(--ink-300);
  cursor: not-allowed;
}

/* ---------- 分页 ---------- */
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 13px;
  color: var(--ink-500);
}

.pager-btns {
  display: flex;
  gap: 8px;
}

.pager-btns button {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--ink-300);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: var(--ink-700);
  cursor: pointer;
}

.pager-btns button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ---------- 弹窗 ---------- */
.mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(22, 24, 29, 0.42);
}

.dialog {
  width: 460px;
  max-width: 100%;
  max-height: 86vh;
  overflow: auto;
  padding: 26px 26px 20px;
  border-radius: var(--radius-md);
  background: #fff;
  box-shadow: var(--shadow-md);
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.dialog-field {
  display: block;
  margin-bottom: 14px;
}

.dialog-field span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--ink-500);
}

.dialog-field input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--ink-300);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.dialog-field input:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}

.dialog-tip {
  margin: 4px 0 16px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-500);
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ink-300);
  border-radius: 10px;
  cursor: pointer;
}

.role-item:hover {
  border-color: var(--brand-500);
}

.role-name {
  font-size: 13px;
  font-weight: 600;
}

.role-code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f2f3f5;
  font-size: 11px;
  color: var(--ink-700);
}

.role-desc {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-500);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* ---------- 轻提示 ---------- */
.toast {
  position: fixed;
  left: 50%;
  bottom: 48px;
  transform: translateX(-50%);
  z-index: 300;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13px;
  color: #fff;
  background: var(--ink-900);
  box-shadow: var(--shadow-md);
}

.toast.success {
  background: var(--success);
}

.toast.error {
  background: var(--danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
