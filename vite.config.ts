import { defineConfig, loadEnv } from 'vite'
import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { resolve } from 'path'
import viteCompression from 'vite-plugin-compression'
import { rumVitePlugin } from '@arms/rum-vite-plugin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  /**
   * 读取当前构建模式下的环境变量
   * @param mode 当前 Vite 构建模式（development/staging/test/production）
   * @returns 从 `.env.*` 文件加载的键值对，含 `VITE_` 前缀变量
   * @remarks 这里用于读取 `VITE_BUILD_COMPRESS`，以控制打包阶段是否生成 `.gz`/`.br` 预压缩文件
   */
  const env: Record<string, string> = loadEnv(mode, process.cwd(), '')

  /**
   * 压缩算法配置，逗号分隔，例如：`"gzip,brotli"`
   * @description 若未配置，则默认同时启用 `gzip` 与 `brotli` 预压缩
   */
  const compressModes: string = env.VITE_BUILD_COMPRESS || 'gzip,brotli'

  /**
   * 解析后的压缩算法列表
   * @example ["gzip", "brotli"]
   */
  const list: string[] = compressModes.split(',').map((s) => s.trim()).filter(Boolean)

  /**
   * 根据算法列表动态创建压缩插件集合
   * @returns 返回供 Vite 使用的插件数组
   * @see https://github.com/vbenjs/vite-plugin-compression
   */
  const compressionPlugins: PluginOption[] = [
    ...(list.includes('gzip')
      ? [
          viteCompression({
            algorithm: 'gzip',
            ext: '.gz',
            threshold: 1024,
          }),
        ]
      : []),
    ...(list.includes('brotli')
      ? [
          viteCompression({
            algorithm: 'brotliCompress',
            ext: '.br',
            threshold: 1024,
          }),
        ]
      : []),
  ]
  return {
    base: '/leafer-web',
    plugins: [
      vue(),
      // 自动按需引入组件
      AutoImport({
        resolvers: [
          ArcoResolver({
            // importStyle: 'less',
          })
        ],
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        eslintrc: {
          enabled: true
        }
      }),
      Components({
        directoryAsNamespace: true,
        resolvers: [
          // 自动引入arco
          ArcoResolver({
            // importStyle: 'less',
            resolveIcons: true
          })
        ]
      }),
      UnoCSS(),
      createSvgIconsPlugin({
        // 指定需要缓存的图标文件夹
        iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
        // 指定symbolId格式
        symbolId: 'icon-[dir]-[name]'
      }),
      ...compressionPlugins,
      // https://help.aliyun.com/zh/arms/user-experience-monitoring/use-cases/automatic-parsing-of-web-h5-sourcemap
     
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 80,
      proxy: {
        // 配置代理
        '/api': {
          // target: 'http://192.168.1.61:8081',
          // target: 'https://pre.oa.scipixa.cn/prod-api',
          target:'http://test.scipixa.cn:8081',
          changeOrigin: true, // 允许跨域
          rewrite: (path) => path.replace(/^\/api/, '') // 重写路径
          // secure: true, // 如果是 https 接口，需要配置这个参数
        }
      },
      allowedHosts:['local.scipixa.cn'],
    },
    build: {
      /**
       * Source Map 配置
       * @description 通过环境变量 `VITE_BUILD_SOURCEMAP` 控制生成：`true` | `false` | `"inline"` | `"hidden"`
       * - 生产环境建议使用 `hidden`，生成 map 文件但不在产物中添加引用注释
       */
      sourcemap:
        env.VITE_BUILD_SOURCEMAP === 'true'
          ? true
          : env.VITE_BUILD_SOURCEMAP === 'false'
          ? false
          : (env.VITE_BUILD_SOURCEMAP as any) || 'hidden',
      minify: 'terser',
      terserOptions: {
        compress: {
          //生产环境时移除console
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    /**
     * CSS 配置
     * @description 开发环境开启 CSS Source Map，便于样式调试
     */
    css: {
      devSourcemap: true,
    },
  }
})
