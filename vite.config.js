import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 代理 /api 开头的请求到后端 8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // 后端接口没有 /api 前缀（如 /user/login），必须去掉，
        // 否则请求会打到 /api/user/login 直接 404
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 代理本地存储的图片访问到后端 8080。
      //
      // 为什么必须加这一条：mall.storage.type=local 时，后端 toAccessUrl()
      // 返回的是【相对路径】/uploads/xxx.jpg（OSS 实现才会返回绝对地址）。
      // 相对路径会以当前页面 origin 为基准解析，也就是打到 Vite 的 5173。
      // Vite 若不代理它，请求会落到 SPA 兜底规则上返回 index.html，
      // <img> 收到 text/html → 破图；而且响应码是 200 不是 404，几乎无迹可查。
      //
      // ⚠️ 这里不能加 rewrite：后端真实路径就是 /uploads/**，
      // 去掉前缀反而会 404（与上面的 /api 情形正好相反）。
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
