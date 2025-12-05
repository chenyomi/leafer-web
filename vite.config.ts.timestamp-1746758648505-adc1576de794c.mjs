// vite.config.ts
import { defineConfig } from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/vite/dist/node/index.js";
import vue from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import UnoCSS from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/unocss/dist/vite.mjs";
import AutoImport from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/unplugin-vue-components/dist/vite.mjs";
import { ArcoResolver } from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/unplugin-vue-components/dist/resolvers.mjs";
import { createSvgIconsPlugin } from "file:///D:/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/scipixa-leafer-web/node_modules/vite-plugin-svg-icons/dist/index.mjs";
import { resolve } from "path";
var __vite_injected_original_dirname = "D:\\\u6211\u7684\u5907\u4EFD\\scipixa-leafer-web";
var config = ({ mode }) => {
  return {
    plugins: [
      vue(),
      // 自动按需引入组件
      AutoImport({
        resolvers: [
          ArcoResolver({
            // importStyle: 'less',
          })
        ],
        imports: ["vue", "vue-router", "pinia", "@vueuse/core"],
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
        iconDirs: [resolve(process.cwd(), "src/assets/icons")],
        // 指定symbolId格式
        symbolId: "icon-[dir]-[name]"
      })
    ],
    resolve: {
      alias: {
        "@": resolve(__vite_injected_original_dirname, "./src")
      }
    },
    server: {
      host: "0.0.0.0",
      port: 8080
    }
  };
};
var vite_config_default = defineConfig(config);
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxcdTYyMTFcdTc2ODRcdTU5MDdcdTRFRkRcXFxcc2NpcGl4YS1sZWFmZXItd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxcdTYyMTFcdTc2ODRcdTU5MDdcdTRFRkRcXFxcc2NpcGl4YS1sZWFmZXItd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi8lRTYlODglOTElRTclOUElODQlRTUlQTQlODclRTQlQkIlQkQvc2NpcGl4YS1sZWFmZXItd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXHJcbmltcG9ydCBVbm9DU1MgZnJvbSAndW5vY3NzL3ZpdGUnXHJcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnXHJcbmltcG9ydCBDb21wb25lbnRzIGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3ZpdGUnXHJcbmltcG9ydCB7IEFyY29SZXNvbHZlciB9IGZyb20gJ3VucGx1Z2luLXZ1ZS1jb21wb25lbnRzL3Jlc29sdmVycydcclxuaW1wb3J0IHsgY3JlYXRlU3ZnSWNvbnNQbHVnaW4gfSBmcm9tICd2aXRlLXBsdWdpbi1zdmctaWNvbnMnXHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJ1xyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5jb25zdCBjb25maWc9KHttb2RlfSk9PntcclxuICAgIHJldHVybntcclxuICAgICAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgICAgIHZ1ZSgpLFxyXG4gICAgICAgICAgICAvLyBcdTgxRUFcdTUyQThcdTYzMDlcdTk3MDBcdTVGMTVcdTUxNjVcdTdFQzRcdTRFRjZcclxuICAgICAgICAgICAgQXV0b0ltcG9ydCh7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlcnM6IFtcclxuICAgICAgICAgICAgICAgICAgICBBcmNvUmVzb2x2ZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbXBvcnRTdHlsZTogJ2xlc3MnLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIGltcG9ydHM6IFsndnVlJywgJ3Z1ZS1yb3V0ZXInLCAncGluaWEnLCAnQHZ1ZXVzZS9jb3JlJ10sXHJcbiAgICAgICAgICAgICAgICBlc2xpbnRyYzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgQ29tcG9uZW50cyh7XHJcbiAgICAgICAgICAgICAgICBkaXJlY3RvcnlBc05hbWVzcGFjZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHJlc29sdmVyczogW1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1ODFFQVx1NTJBOFx1NUYxNVx1NTE2NWFyY29cclxuICAgICAgICAgICAgICAgICAgICBBcmNvUmVzb2x2ZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbXBvcnRTdHlsZTogJ2xlc3MnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlSWNvbnM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgVW5vQ1NTKCksXHJcbiAgICAgICAgICAgIGNyZWF0ZVN2Z0ljb25zUGx1Z2luKHtcclxuICAgICAgICAgICAgICAgIC8vIFx1NjMwN1x1NUI5QVx1OTcwMFx1ODk4MVx1N0YxM1x1NUI1OFx1NzY4NFx1NTZGRVx1NjgwN1x1NjU4N1x1NEVGNlx1NTkzOVxyXG4gICAgICAgICAgICAgICAgaWNvbkRpcnM6IFtyZXNvbHZlKHByb2Nlc3MuY3dkKCksICdzcmMvYXNzZXRzL2ljb25zJyldLFxyXG4gICAgICAgICAgICAgICAgLy8gXHU2MzA3XHU1QjlBc3ltYm9sSWRcdTY4M0NcdTVGMEZcclxuICAgICAgICAgICAgICAgIHN5bWJvbElkOiAnaWNvbi1bZGlyXS1bbmFtZV0nLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc29sdmU6IHtcclxuICAgICAgICAgICAgYWxpYXM6IHtcclxuICAgICAgICAgICAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2VydmVyOiB7XHJcbiAgICAgICAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcclxuICAgICAgICAgICAgcG9ydDogODA4MFxyXG4gICAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhjb25maWcpXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1MsU0FBUyxvQkFBb0I7QUFDblUsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sWUFBWTtBQUNuQixPQUFPLGdCQUFnQjtBQUN2QixPQUFPLGdCQUFnQjtBQUN2QixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLDRCQUE0QjtBQUNyQyxTQUFTLGVBQWU7QUFQeEIsSUFBTSxtQ0FBbUM7QUFTekMsSUFBTSxTQUFPLENBQUMsRUFBQyxLQUFJLE1BQUk7QUFDbkIsU0FBTTtBQUFBLElBQ0YsU0FBUztBQUFBLE1BQ0wsSUFBSTtBQUFBO0FBQUEsTUFFSixXQUFXO0FBQUEsUUFDUCxXQUFXO0FBQUEsVUFDUCxhQUFhO0FBQUE7QUFBQSxVQUViLENBQUM7QUFBQSxRQUNMO0FBQUEsUUFDQSxTQUFTLENBQUMsT0FBTyxjQUFjLFNBQVMsY0FBYztBQUFBLFFBQ3RELFVBQVU7QUFBQSxVQUNOLFNBQVM7QUFBQSxRQUNiO0FBQUEsTUFDSixDQUFDO0FBQUEsTUFDRCxXQUFXO0FBQUEsUUFDUCxzQkFBc0I7QUFBQSxRQUN0QixXQUFXO0FBQUE7QUFBQSxVQUVQLGFBQWE7QUFBQTtBQUFBLFlBRVQsY0FBYztBQUFBLFVBQ2xCLENBQUM7QUFBQSxRQUNMO0FBQUEsTUFDSixDQUFDO0FBQUEsTUFDRCxPQUFPO0FBQUEsTUFDUCxxQkFBcUI7QUFBQTtBQUFBLFFBRWpCLFVBQVUsQ0FBQyxRQUFRLFFBQVEsSUFBSSxHQUFHLGtCQUFrQixDQUFDO0FBQUE7QUFBQSxRQUVyRCxVQUFVO0FBQUEsTUFDZCxDQUFDO0FBQUEsSUFDTDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ0wsT0FBTztBQUFBLFFBQ0gsS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUNuQztBQUFBLElBQ0o7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxJQUNSO0FBQUEsRUFDTjtBQUNKO0FBQ0EsSUFBTyxzQkFBUSxhQUFhLE1BQU07IiwKICAibmFtZXMiOiBbXQp9Cg==
