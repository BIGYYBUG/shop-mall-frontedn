import request from './request'

/**
 * 用户登录
 * @param {{ username: string, password: string }} data
 * @returns {Promise<{ token: string, userInfo: object }>}
 */
export const login = (data) =>
  request({
    url: '/user/login',
    method: 'post',
    data
  })

/**
 * 用户注册
 * @param {{ username: string, password: string, phone: string }} data
 */
export const register = (data) =>
  request({
    url: '/user/register',
    method: 'post',
    data
  })

/**
 * 获取当前登录用户信息
 */
export const getUserInfo = () =>
  request({
    url: '/user/info',
    method: 'get'
  })
