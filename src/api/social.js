import request from './request'

/**
 * 第三方登录接口（OAuth2 授权码模式）
 *
 * 前端只做两件事：拿授权地址跳转、拿 code 换令牌。
 * 中间「code 换 access_token」「拉取用户信息」都由后端完成 ——
 * 因为 access_token 和 AppSecret 都属于不能进浏览器的凭据。
 */

/** 查询已完成配置的渠道，如 ['wechat']；未配置时返回 [] */
export const listSocialSources = () =>
  request({ url: '/auth/sources', method: 'get' })

/** 获取授权跳转地址 */
export const getAuthorizeUrl = (source, state) =>
  request({ url: `/auth/${source}/authorize-url`, method: 'get', params: { state } })

/** 用授权码登录，返回结构同账号密码登录 */
export const socialLogin = (source, code, state) =>
  request({ url: `/auth/${source}/login`, method: 'post', data: { code, state } })

/**
 * 生成 state：防 CSRF 的随机串。
 * 发起授权前存进 sessionStorage，回调时比对，不一致说明不是用户主动发起的授权。
 */
export const createState = () => {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
  sessionStorage.setItem('oauth_state', state)
  return state
}

export const verifyState = (state) => {
  const saved = sessionStorage.getItem('oauth_state')
  sessionStorage.removeItem('oauth_state')
  return !!saved && saved === state
}
