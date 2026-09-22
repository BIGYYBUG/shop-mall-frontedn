import request from './request'

/**
 * 卖家端 - 我的商品接口
 * 所有 /seller/** 接口由后端从令牌取当前用户 —— 前端绝不传 sellerId。
 */

/** 分页查询我的商品 @param {{pageNum:number,pageSize:number,keyword?:string,status?:number}} params */
export const pageMyProducts = (params) =>
  request({ url: '/seller/product/page', method: 'get', params })

/** 商品详情（非本人商品 → 404） */
export const getMyProduct = (id) =>
  request({ url: `/seller/product/${id}`, method: 'get' })

/** 新增商品（ProductDTO） */
export const createMyProduct = (data) =>
  request({ url: '/seller/product', method: 'post', data })

/** 修改商品（ProductDTO） */
export const updateMyProduct = (id, data) =>
  request({ url: `/seller/product/${id}`, method: 'put', data })

/** 上架 / 下架 —— status 走 query，不是 JSON body */
export const updateMyProductStatus = (id, status) =>
  request({ url: `/seller/product/${id}/status`, method: 'put', params: { status } })

/** 删除商品 */
export const deleteMyProduct = (id) =>
  request({ url: `/seller/product/${id}`, method: 'delete' })
