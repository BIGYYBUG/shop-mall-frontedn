import request from './request'

/** 角色列表（轻量，无权限明细） */
export const listRoles = () => request({ url: '/admin/role/list', method: 'get' })

/** 角色详情（含 permissionIds / permissions，编辑回显用） */
export const getRoleDetail = (id) => request({ url: `/admin/role/${id}`, method: 'get' })

/** 新增角色 */
export const createRole = (data) => request({ url: '/admin/role', method: 'post', data })

/** 修改角色（注意：没有 code 字段） */
export const updateRole = (id, data) => request({ url: `/admin/role/${id}`, method: 'put', data })

/** 删除角色 */
export const deleteRole = (id) => request({ url: `/admin/role/${id}`, method: 'delete' })

/** 给角色分配权限（全量覆盖，[]=清空） */
export const assignRolePermissions = (id, permissionIds) =>
  request({ url: `/admin/role/${id}/permissions`, method: 'put', data: { permissionIds } })

/** 权限字典全量（只读，无增删改） */
export const listPermissions = () => request({ url: '/admin/permission/list', method: 'get' })
