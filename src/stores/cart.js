import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCartCount } from '../api/cart'

/**
 * 购物车角标状态。
 *
 * 为什么单独开一个 store 而不是让 App.vue 自己存：
 * 头部角标要在「加购成功后立刻 +N」，而加购发生在商品详情页 —— 两个组件没有父子关系。
 * 放 store 里，详情页调 `refresh()` 后头部自动跟着变，不需要事件总线或 props 穿透。
 *
 * 只存一个数字（商品**种类数**，不是件数 —— 与后端 `CartVO.totalCount` 口径一致）。
 * 整车明细不在这里缓存：价格/库存必须实时，缓存反而制造"数据显示不刷新"的错觉。
 */
export const useCartStore = defineStore('cart', () => {
  const count = ref(0)

  /** 直接用写操作返回的 CartVO.totalCount 更新，省一次请求 */
  const setCount = (n) => {
    count.value = Number(n) || 0
  }

  /**
   * 主动拉取角标数。
   * 未登录直接归零并返回 —— 不请求，避免首页刷出一堆 401。
   */
  const refresh = async () => {
    if (!localStorage.getItem('token')) {
      count.value = 0
      return 0
    }
    try {
      setCount(await getCartCount())
    } catch {
      // 401 已由 request.js 拦截器统一处理（清 token + 跳登录），这里静默即可
    }
    return count.value
  }

  /** 退出登录时清零，否则会看到"别人车的角标" */
  const reset = () => {
    count.value = 0
  }

  return { count, setCount, refresh, reset }
})
