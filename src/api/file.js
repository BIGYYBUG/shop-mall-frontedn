import request from './request'

/**
 * 上传图片。
 * @param {File} file
 * @param {string} category product | shop | avatar | common（对象存储一级目录）
 * @returns {Promise<{objectKey:string, url:string}>}
 */
export const uploadImage = (file, category = 'common') => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('category', category)
  return request({
    url: '/file/upload',
    method: 'post',
    data: fd,
    // multipart 交给浏览器按 boundary 拼接，手动设 Content-Type 反而会坏
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000
  })
}
