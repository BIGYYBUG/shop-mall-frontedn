import axios from 'axios'

// 创建 axios 实例
// baseURL 用 /api 前缀，由 vite 的 proxy 转发到后端 8080（见 vite.config.js）
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从本地存储读取 token 并注入请求头，格式必须与后端 JwtInterceptor 约定一致
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * 统一错误提示位。
 * 注意：这里刻意保持 console 占位而不用 ElMessage ——
 * 既有页面（如 UserManage）自带页面级 toast，全局再弹一次会「双重提示」。
 * 错误提示的归属权在页面层，谁 catch 谁负责展示。
 */
const notify = (message) => {
  console.warn('[request]', message)
}

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 后端统一返回 { code, message, data }
    if (res.code !== 200) {
      // 业务异常（如 400 参数错误、403 权限不足）后端仍以 HTTP 200 返回，
      // 靠 body 里的 code 区分，所以这里要主动 reject，让调用方走 catch
      const message = res.message || '请求失败'
      notify(message)
      return Promise.reject(new Error(message))
    }
    // 直接返回 data，调用方少写一层 .data
    return res.data
  },
  (error) => {
    const status = error.response?.status
    const body = error.response?.data

    // 401 由后端 JwtInterceptor 直接写出，属于「登录态失效」。
    // 统一在这里清凭证并跳登录页，避免每个页面都写一遍
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error(body?.message || '登录已过期，请重新登录'))
    }

    const message = body?.message || error.message || '网络异常，请稍后重试'
    notify(message)
    return Promise.reject(new Error(message))
  }
)

export default request
