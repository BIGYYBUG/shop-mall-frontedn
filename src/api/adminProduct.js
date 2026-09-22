import request from './request'

/**
 * 管理端 - 商品管理接口（全平台，无数据归属限制）。
 *
 * ⚠️ 与卖家端 /seller/product 是「同一件事的两个入口」，权限码完全不同：
 *   /admin/product/{id}  + product:update         → 能改全平台任意商品
 *   /seller/product/{id} + seller:product:update  → 只能改自己的
 * 两者不要合并，admin 页面不要误用 seller 接口（反之亦然）。
 */

/** 分页查询（比卖家端多 categoryId 过滤） */
export const pageProducts = (params) =>
  request({ url: '/admin/product/page', method: 'get', params })

/** 商品详情 */
export const getProductDetail = (id) =>
  request({ url: `/admin/product/${id}`, method: 'get' })

/** 新增商品（平台自营，sellerId=0） */
export const createProduct = (data) =>
  request({ url: '/admin/product', method: 'post', data })

/** 修改商品 */
export const updateProduct = (id, data) =>
  request({ url: `/admin/product/${id}`, method: 'put', data })

/** 上架 / 下架 —— status 走 query */
export const updateProductStatus = (id, status) =>
  request({ url: `/admin/product/${id}/status`, method: 'put', params: { status } })

/** 删除商品 */
export const deleteProduct = (id) =>
  request({ url: `/admin/product/${id}`, method: 'delete' })
