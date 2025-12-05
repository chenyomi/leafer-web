import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useAppStore } from './modules/app/app'
import { useFontStore } from './modules/font/font'
import { useComponentsStore } from './modules/componentsList/componentsList'
import { useSvgCacheStore } from './modules/svgCache'
import { useMaterialStore } from './modules/material'
import { useMaterialOriginalStore } from './modules/materialOriginal'

const pinia = createPinia()
// 使用持久化插件
pinia.use(piniaPluginPersistedstate)

export default pinia

export {
    useAppStore,
    useFontStore,
    useComponentsStore,
    useSvgCacheStore,
    useMaterialStore,
    useMaterialOriginalStore
}
