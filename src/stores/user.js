import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, getUserInfo } from '../api/user'
import { socialLogin as socialLoginApi } from '../api/social'

const TOKEN_KEY = 'token'
const USER_KEY = 'userInfo'

/**
 * 用户状态管理
 *
 * token 与 userInfo 都持久化到 localStorage：
 * 前者保证刷新页面不丢登录态，后者保证刷新后头部仍能显示昵称、角色。
 * （更严谨的做法是刷新后调 /user/info 重新拉取，避免本地数据被篡改。）
 */
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')

  const userInfo = ref(
    JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  )

  const isLoggedIn = computed(() => !!token.value)

  /** 当前用户角色编码，如 ['ADMIN'] */
  const roles = computed(() => userInfo.value?.roles || [])

  /** 判断是否拥有某个角色 */
  const hasRole = (code) => roles.value.includes(code)

  /**
   * 保存登录凭证（账号密码登录与第三方登录共用）
   */
  const saveCredentials = (data) => {
    token.value = data.token
    userInfo.value = data.userInfo
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.userInfo || null))
    return data
  }

  /**
   * 账号密码登录
   */
  const login = async (form) => saveCredentials(await loginApi(form))

  /**
   * 第三方登录（微信等）
   */
  const socialLogin = async (source, code, state) =>
    saveCredentials(await socialLoginApi(source, code, state))

  /**
   * 重新拉取用户信息。
   * 角色被管理员改动后，调用它可以立刻刷新本地的角色展示。
   */
  const refreshUserInfo = async () => {
    const data = await getUserInfo()
    userInfo.value = data
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    return data
  }

  /**
   * 退出登录，清理本地凭证
   */
  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    roles,
    hasRole,
    login,
    socialLogin,
    refreshUserInfo,
    logout
  }
})
