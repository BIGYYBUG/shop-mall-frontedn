import request from './request'

/**
 * 卖家端 - 我的店铺接口
 *
 * /mine 与 /apply 只要求登录（还没通过审核的人没有 SELLER 角色）：
 *   - /mine 无店铺时后端返回 404（业务码 404 包在 HTTP 200 里）
 *   - 前端据此切换「申请入驻」态
 */

/** 我的店铺。没有店铺时 reject（message 含"不存在"） */
export const getMyShop = () => request({ url: '/seller/shop/mine', method: 'get' })

/** 申请入驻 @param {{name:string, logoKey?:string, description?:string, contactPhone?:string}} data */
export const applyShop = (data) => request({ url: '/seller/shop/apply', method: 'post', data })

/** 修改我的店铺资料（需要 seller:shop 权限，即已通过审核） */
export const updateMyShop = (data) => request({ url: '/seller/shop/mine', method: 'put', data })
