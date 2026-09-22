import request from './request'

/**
 * 前台 - 商品浏览（免登录，放行清单内）。
 * 有 token 时 request.js 会自动带上，无妨。
 */

/** 商品列表（只返回上架商品） */
export const pagePublicProducts = (params) =>
  request({ url: '/product/page', method: 'get', params })

/** 商品详情 */
export const getPublicProduct = (id) =>
  request({ url: `/product/${id}`, method: 'get' })
