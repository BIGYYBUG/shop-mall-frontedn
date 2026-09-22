import request from './request'

/**
 * 管理端 - 用户管理接口
 *
 * 每个接口都对应后端的一条 @RequiresPermission 权限：
 *   pageUsers        → user:list
 *   getUserDetail    → user:detail
 *   updateUser       → user:update
 *   updateUserStatus → user:status
 *   resetUserPassword→ user:password
 *   deleteUser       → user:delete
 *   assignUserRoles  → role:assign
 * 前端控制按钮显隐只是体验优化，真正的拦截在后端，两者缺一不可。
 */

/** 分页查询用户 @param {{pageNum:number,pageSize:number,keyword?:string,status?:number}} params */
export const pageUsers = (params) =>
  request({ url: '/admin/user/page', method: 'get', params })

/** 用户详情 */
export const getUserDetail = (id) =>
  request({ url: `/admin/user/${id}`, method: 'get' })

/** 修改用户基本信息 */
export const updateUser = (id, data) =>
  request({ url: `/admin/user/${id}`, method: 'put', data })

/** 启用 / 禁用用户 @param {number} status 0 禁用，1 正常 */
export const updateUserStatus = (id, status) =>
  request({ url: `/admin/user/${id}/status`, method: 'put', params: { status } })

/** 重置密码 */
export const resetUserPassword = (id, newPassword) =>
  request({ url: `/admin/user/${id}/password`, method: 'put', data: { newPassword } })

/** 删除用户（逻辑删除） */
export const deleteUser = (id) =>
  request({ url: `/admin/user/${id}`, method: 'delete' })

/** 查询用户已绑定的角色 ID */
export const getUserRoleIds = (id) =>
  request({ url: `/admin/user/${id}/roles`, method: 'get' })

/** 分配角色（全量覆盖，传空数组表示清空） */
export const assignUserRoles = (id, roleIds) =>
  request({ url: `/admin/user/${id}/roles`, method: 'put', data: { roleIds } })

/** 角色列表 */
export const listRoles = () =>
  request({ url: '/admin/role/list', method: 'get' })
