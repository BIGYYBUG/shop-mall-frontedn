import request from './request'

/**
 * 购物车接口。
 *
 * 三点约定，和后端 CartController 严格对应：
 *  ① 全部需要登录 —— `/cart/**` 不在放行清单里，userId 由令牌解出，
 *     所以这里的每个函数都**不传 userId**（传了后端也不看，契约里根本没这个字段）。
 *  ② 每个写操作都返回**整车 CartVO**，前端拿到后直接替换本地状态即可，
 *     不需要「改完再 GET 一次」。省一次往返，也避免两次结果不一致。
 *  ③ `PUT /cart/items/{id}` 是**设为**该值，`POST /cart/items` 才是**累加**。
 *     数量框改动用前者，加购用后者，别混。
 */

/** 读取购物车（含实时价格、库存与失效标记） */
export const getCart = () => request({ url: '/cart', method: 'get' })

/** 角标用：商品种类数。单开轻接口，避免为了显示一个数字拉整车 */
export const getCartCount = () => request({ url: '/cart/count', method: 'get' })

/** 加入购物车。同一商品重复加购会累加数量 */
export const addToCart = (productId, quantity = 1) =>
  request({ url: '/cart/items', method: 'post', data: { productId, quantity } })

/** 设置某商品的数量（绝对值，不是累加） */
export const updateCartQuantity = (productId, quantity) =>
  request({ url: `/cart/items/${productId}`, method: 'put', data: { quantity } })

/**
 * 批量勾选。
 * `productIds` 传空数组表示**整车**（全选 / 取消全选），后端会走 setAllSelected。
 */
export const setCartSelected = (productIds, selected) =>
  request({ url: '/cart/items/selected', method: 'put', data: { productIds, selected } })

/** 移除单个商品 */
export const removeCartItem = (productId) =>
  request({ url: `/cart/items/${productId}`, method: 'delete' })

/**
 * 批量移除（「删除选中」）。
 *
 * 两点注意：
 *  ① 参数走 **query**，不走 body —— DELETE 带 body 属未定义行为，
 *     部分网关/代理会直接把它丢掉，而且前端看不出异常。
 *  ② 手动 `join(',')` 而**不是**直接传数组：axios 对数组默认序列化成
 *     `productIds[]=1&productIds[]=2`，后端 `List<Long>` 未必接得住；
 *     逗号串是 Spring 明确支持的绑定形式。
 */
export const removeCartItems = (productIds) =>
  request({
    url: '/cart/items/batch',
    method: 'delete',
    params: { productIds: productIds.join(',') }
  })

/** 清空购物车（返回 null，不是 CartVO —— 车都空了没什么可回） */
export const clearCart = () => request({ url: '/cart/items', method: 'delete' })
