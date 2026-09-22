import request from './request'

/**
 * 管理端 - 店铺管理接口
 *
 * 没有 POST /admin/shop：平台不能凭空给人开店，只能审核/维护（见交接文档 2.6）。
 */

/** 分页查询店铺 @param {{pageNum:number,pageSize:number,keyword?:string,status?:number}} params */
export const pageShops = (params) =>
  request({ url: '/admin/shop/page', method: 'get', params })

/** 店铺详情 */
export const getShopDetail = (id) =>
  request({ url: `/admin/shop/${id}`, method: 'get' })

/** 修改店铺资料 */
export const updateShop = (id, data) =>
  request({ url: `/admin/shop/${id}`, method: 'put', data })

/**
 * 审核（服务端原子操作：通过→授予店主 SELLER 角色；驳回/冻结→收回；冻结同时下架全店在售商品）
 * @param {number} id
 * @param {{status:number, rejectReason?:string}} data status: 1 通过 / 2 驳回 / 3 冻结
 */
export const auditShop = (id, data) =>
  request({ url: `/admin/shop/${id}/audit`, method: 'put', data })
