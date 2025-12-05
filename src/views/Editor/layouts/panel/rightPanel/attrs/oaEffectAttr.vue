<script setup lang="ts">
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { watch, watchEffect, unref, computed } from 'vue'
import { Modal, Message } from '@arco-design/web-vue'
import { GColor } from '@/utils/color/g-color'
import useUnitStore from '@/store/modules/unit'
import { useColorStore } from '@/store/modules/color'
import { storeToRefs } from 'pinia'
import CustomColorPicker from '@/components/arco/color-picker/color-picker.js'
import { formatColor } from '@/views/Editor/utils/formatColor'
import { Image } from 'leafer-ui'
import { UI, Resource } from 'leafer-ui'
import { optimize } from 'svgo'
import { previewSelectSvg } from '@/utils/analysisSvg'
import emitter from '@/utils/eventBus'
import { auditMaterialApi } from '@/api/audit/material'
import { useRoute } from 'vue-router'
import { canvasApi } from '@/api/save/canvas'
import { useMaterialOriginalStore } from '@/store/modules/materialOriginal'
import tinycolor from 'tinycolor2'
import { saveStyleSvgToDB, readStyleSvgFromDB, removeStyleSvgFromDB, migrateLocalStorageStyleSvgMap } from '@/utils/styleSvgDB'
import { SimulateAttrController } from '../SimulateTempAttr'
import { isArray } from 'lodash'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
const isSameChildren = computed(() => {
  simulateAttr.selectCount.value
  // 如果不是模拟元素，直接返回true
  if (!simulateAttr.isSimulateElement.value) {
    return true
  }
  
  // 获取所有选中的元素列表
  const list = canvas.app?.editor?.leafList?.list
  if (!Array.isArray(list) || list.length === 0) {
    return true
  }
  
  // 获取第一个元素作为参考
  const firstItem = list[0]
  // 检查所有元素ID是否一致
  return list.every((item, index) => {
    // 第一个元素直接返回true
    if (index === 0) return true
    
    // 确保两个元素都有data属性
    if (!firstItem?.data || !item?.data) return false
    
    // 优先判断sourceId - 如果第一个元素有sourceId，那么所有元素都必须有相同的sourceId
    if (firstItem.data.sourceId) {
      return item.data.sourceId && item.data.sourceId === firstItem.data.sourceId
    }
    
    // 如果sourceId不存在，则判断materialId是否一致
    if (firstItem.data.materialId) {
      return item.data.materialId && item.data.materialId === firstItem.data.materialId
    }
    // 如果都没有ID，则判断为不同元素
    return false
  })
})

const imgBaseUrl = import.meta.env.VITE_IMG_BASE_URL

const route = useRoute()
const materialId = route.query.id as string // 从路由参数中获取 materialId
const boardOutId = route.query.dashboardId as string // 从路由参数中获取 boardOutId
const pageId = route.query.pageOutId as string // 从路由参数中获取 pageId
const status = route.query.status as string | undefined // 从路由参数中获取 status
console.log(materialId, '素材materialId')

// 从左侧组件拖进来的素材是否是审核过的
const dragStatus = computed(() => {
  // 首先检查activeObject的状态
  if (canvas.activeObject.value?.data?.status) {
    return canvas.activeObject.value.data.status
  }
  
  // 处理多选情况：检查所有选中元素的状态
  const list = canvas.app?.editor?.leafList?.list
  if (Array.isArray(list) && list.length > 0) {
    // 获取第一个元素的状态作为参考
    const firstStatus = list[0]?.data?.status
    if (firstStatus) {
      // 检查所有元素是否都有相同的状态
      const allSameStatus = list.every(item => item?.data?.status === firstStatus)
      if (allSameStatus) {
        return firstStatus
      }
    }
  }
  
  return ''
})

/**
 * 样式列表显示隐藏：上传面板拖拽且无素材ID时隐藏
 * @function shouldHideStyleList
 * @returns {boolean} 是否隐藏样式列表
 * @remarks 当激活对象的 `data.isDraggedMaterial` 为 true 且无法解析到素材仓库ID（`data.materialId`/`data.outId` 或解析到的 `resolveActiveMaterialIds()[0]`）时隐藏样式列表。
 */
const shouldHideStyleList = computed<boolean>(() => {
  // 检查是否处于多选状态且所有元素相同
  const list = canvas.app?.editor?.leafList?.list
  if (Array.isArray(list) && list.length > 1 && isSameChildren.value) {
    // 多选相同元素时不隐藏样式列表
    return false
  }
  
  // 处理单选情况
  const obj = canvas.activeObject.value as any
  const isUploadDrag = Boolean(obj?.data?.isDraggedMaterial)
  console.log(isUploadDrag, 'isUploadDrag')
  return isUploadDrag
})

/**
 * 判断是否处于“素材详情编辑”模式。
 * 当 localStorage.isMeterial === '1' 时，认为当前在素材详情页上下文中；
 * 在该模式下，ID解析将优先使用详情页/路由中的 materialId。
 * @returns {boolean} 是否为素材详情模式
 */
const isMaterialDetailMode: boolean = (() => {
  try {
    const val = localStorage.getItem('isMeterial') || '0'
    return val === '1'
  } catch {
    return false
  }
})()

/**
 * 对象-素材ID缓存：为每个激活对象记录最近解析出的素材ID，避免切回旧对象时ID丢失。
 * 使用 WeakMap 以防止内存泄漏。
 * @type {WeakMap<any, string>}
 */
const activeObjectMaterialIdMap: WeakMap<any, string> = new WeakMap()

/**
 * 从图片或SVG相关 URL 中解析素材ID（如果可能）。
 * 支持形如 `${imgBaseUrl}/${boardOutId}/${pageOutId}/${materialId}/${styleOutId}.png` 的路径结构。
 * @param {string} url - 图片或SVG的URL
 * @returns {string | null} - 解析出的素材ID，解析失败返回 null
 */
const parseMaterialIdFromUrl = (url?: string): string | null => {
  if (!url || typeof url !== 'string') return null
  try {
    // 排除 data URL
    if (url.startsWith('data:image/svg+xml')) return null
    // 匹配 /<board>/<page>/<material>/<style>.(png|jpg|jpeg|svg) —— 修正正则
    const m = url.match(/\/[^\/]+\/[^\/]+\/([^\/]+)\/[^\/]+\.(png|jpg|jpeg|svg)(\?|$)/i)
    if (m && m[1]) return String(m[1])
    // 备用：query 中包含 materialId
    const q = url.match(/[?&]materialId=([^&#]+)/)
    if (q && q[1]) return decodeURIComponent(q[1])
  } catch (e) {
    console.warn('parseMaterialIdFromUrl 解析失败：', e)
  }
  return null
}

/**
 * 从样式签名 URL 中解析板/页/素材/样式 ID 段。
 * URL 通常形如：.../<board>/<page>/<material>/<style>.png?...
 * @param {string} url - 预签名的上传或下载 URL。
 * @returns {{ boardId?: string; pageId?: string; materialId?: string; styleOutId?: string } | undefined} 解析得到的 ID 集合。
 */
const parseBoardPageFromStyleUrl = (url: string): { boardId?: string; pageId?: string; materialId?: string; styleOutId?: string } | undefined => {
  try {
    if (!url) return undefined
    const m = url.match(/\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\.(png|jpg|jpeg|svg)(\?|$)/i)
    if (m) {
      const [, boardId, pageId, materialId, styleOutId] = m
      return { boardId, pageId, materialId, styleOutId }
    }
  } catch (e) {
    console.warn('parseBoardPageFromStyleUrl 解析失败：', e)
  }
  return undefined
}

/**
 * 判断一个ID是否有效：非空、非'0'
 * @param {unknown} id - 任意类型的ID
 * @returns {boolean} 是否有效
 */
const isValidId = (id: unknown): boolean => {
  if (id === null || id === undefined) return false
  const s = String(id)
  return s.length > 0 && s !== '0'
}

/**
 * 获取 boardOutId（区分拖入模式与详情模式）
 * - 拖入模式：优先返回选中对象 data.boardOutId；在该模式下 '0' 视为有效占位
 * - 官方组件：当对象 MaterialType 为 OFFICIAL_COMPONENT 时，允许返回占位 '0'
 * - 其他模式：覆盖值 > 选中对象 > Frame > 路由 > 本地存储
 * @returns {string} 有效的 boardOutId，可能为空字符串
 */
/**
 * 解析当前画板ID（boardOutId）。
 * 优先级：覆盖值 > 活动对象 > Frame > 路由 > 本地存储。
 * 规则：优先返回非空且非'0'的ID；若全部来源都不可用，且有明确占位'0'，则返回'0'以兼容本地样式路径。
 * @returns {string} 有效的 boardOutId；可能为 '0' 或空字符串。
 */
const resolveBoardOutId = (): string => {
  try {
    const { canvas, editor } = useEditor()
    const activeObj = (canvas.activeObject?.value ?? null) as any
    // 覆盖值始终最高（即便为 '0' 也返回，用于与上传签名路径对齐）
    const overrideBoard = boardOutIdOverride.value
    const currentMat = selectedMaterialId.value
    if (overrideAppliedMaterialId.value && currentMat && overrideAppliedMaterialId.value === currentMat) {
      if (overrideBoard !== undefined && overrideBoard !== null && String(overrideBoard).length > 0) return String(overrideBoard)
    }

    // 处理多选情况：从所有选中对象中获取一致的boardOutId
    const multiple = editor.app?.editor?.multiple
    if (multiple) {
      const list = canvas.app?.editor?.list || []
      if (list.length > 0) {
        // 获取第一个对象的boardOutId作为参考
        const firstBoardOutId = (list[0] as any)?.data?.boardOutId
        if (firstBoardOutId) {
          // 检查所有对象是否有相同的boardOutId
          const allSame = list.every(obj => (obj as any)?.data?.boardOutId === firstBoardOutId)
          if (allSame) {
            return String(firstBoardOutId)
          }
        }
      }
    }

    const fromActive = activeObj?.data?.boardOutId
    const fromFrame = (editor?.contentFrame as any)?.data?.boardOutId
    const fromRoute = route.query.dashboardId
    const fromLocal = localStorage.getItem('dashboardId')

    // 优先处理活动对象的占位'0'（不要让 Frame/路由的非零覆盖它）
    if (String(fromActive) === '0') return '0'

    // 先尝试非零有效ID
    if (isValidId(fromActive)) return String(fromActive)
    if (isValidId(fromFrame)) return String(fromFrame)
    if (isValidId(fromRoute)) return String(fromRoute as string)
    if (isValidId(fromLocal)) return String(fromLocal)

    // 若未解析到非零ID，回退到占位'0'（按来源优先级）
    if (String(fromFrame) === '0') return '0'
    if (String(fromRoute) === '0') return '0'
    if (String(fromLocal) === '0') return '0'
    return ''
  } catch {
    return isValidId(boardOutIdOverride.value)
      ? String(boardOutIdOverride.value)
      : isValidId(route.query.dashboardId)
        ? String(route.query.dashboardId)
        : String(route.query.dashboardId) === '0'
          ? '0'
          : ''
  }
}

/**
 * 获取 pageId（区分拖入模式与详情模式）
 * - 拖入模式：优先返回选中对象 data.pageOutId/pageId；在该模式下 '0' 视为有效占位
 * - 官方组件：当对象 MaterialType 为 OFFICIAL_COMPONENT 时，允许返回占位 '0'
 * - 其他模式：覆盖值 > 选中对象 > Frame > 路由 > 本地存储
 * @returns {string} 有效的 pageId，可能为空字符串
 */
/**
 * 解析当前页面ID（pageOutId/pageId）。
 * 优先级：覆盖值 > 活动对象 > Frame > 路由 > 本地存储。
 * 规则：优先返回非空且非'0'的ID；若全部来源都不可用，且有明确占位'0'，则返回'0'以兼容本地样式路径。
 * @returns {string} 有效的 pageId；可能为 '0' 或空字符串。
 */
const resolvePageId = (): string => {
  try {
    const { canvas, editor } = useEditor()
    const activeObj = (canvas.activeObject?.value ?? null) as any
    // 覆盖值始终最高（即便为 '0' 也返回，用于与上传签名路径对齐）
    const overridePage = pageOutIdOverride.value
    const currentMat = selectedMaterialId.value
    if (overrideAppliedMaterialId.value && currentMat && overrideAppliedMaterialId.value === currentMat) {
      if (overridePage !== undefined && overridePage !== null && String(overridePage).length > 0) return String(overridePage)
    }

    // 处理多选情况：从所有选中对象中获取一致的pageId
    const multiple = editor.app?.editor?.multiple
    if (multiple) {
      const list = canvas.app?.editor?.list || []
      if (list.length > 0) {
        // 获取第一个对象的pageId作为参考（同时检查pageOutId和pageId）
        const firstItem = list[0] as any
        const firstPageId = firstItem?.data?.pageOutId || firstItem?.data?.pageId
        if (firstPageId) {
          // 检查所有对象是否有相同的pageId（同时检查pageOutId和pageId）
          const allSame = list.every(obj => {
            const objPageId = (obj as any)?.data?.pageOutId || (obj as any)?.data?.pageId
            return objPageId === firstPageId
          })
          if (allSame) {
            return String(firstPageId)
          }
        }
      }
    }

    const fromActive = activeObj?.data?.pageOutId || activeObj?.data?.pageId
    const fromFrame = (editor?.contentFrame as any)?.data?.pageId || (editor?.contentFrame as any)?.data?.outId
    const fromRoute = route.query.pageOutId
    const fromLocal = localStorage.getItem('pageId') || localStorage.getItem('outId')

    // 优先处理活动对象的占位'0'（不要让 Frame/路由的非零覆盖它）
    if (String(fromActive) === '0') return '0'

    // 先尝试非零有效ID
    if (isValidId(fromActive)) return String(fromActive)
    if (isValidId(fromFrame)) return String(fromFrame)
    if (isValidId(fromRoute)) return String(fromRoute as string)
    if (isValidId(fromLocal)) return String(fromLocal as string)

    // 若未解析到非零ID，回退到占位'0'（按来源优先级）
    if (String(fromFrame) === '0') return '0'
    if (String(fromRoute) === '0') return '0'
    if (String(fromLocal) === '0') return '0'
    return ''
  } catch {
    return isValidId(pageOutIdOverride.value)
      ? String(pageOutIdOverride.value)
      : isValidId(route.query.pageOutId)
        ? String(route.query.pageOutId)
        : String(route.query.pageOutId) === '0'
          ? '0'
          : ''
  }
}
onMounted(async () => {
  // 主动请求一次素材上下文，避免监听晚于广播导致错过数据
  try {
    emitter.emit('request-material-context')
  } catch (e) {
    console.warn('请求素材上下文事件失败:', e)
  }
  // 迁移 localStorage 中的 materialStyleSvgMap 到 IndexedDB，释放空间
  try {
    await migrateLocalStorageStyleSvgMap('materialStyleSvgMap')
  } catch (e) {
    console.warn('迁移样式SVG到 IndexedDB 失败：', e)
  }
  await getStyleList()
})

const { canvas, editor } = useEditor()

const materialOriginalStore = useMaterialOriginalStore()

const activeObject = canvas.activeObject as any // 获取当前选中的元素

// 定义一个标志变量
let isSystemUpdate = false
const activeColor = ref('Mixed') //颜色选择选中颜色
const activeColorOpacity = ref(100)
const currentColor = ref('Mixed') //当前展示颜色
const colorStore = useColorStore()
const { historyColors } = storeToRefs(colorStore) //颜色历史记录（Pinia 响应式引用）
const isSVg = ref(false) // 是否是svg图片

// 会话级 SVG 缓存：避免重复加载同一资源
type SvgCacheEntry = { dataUrl: string; svgText: string; secondLevelGIds: string[] }
const svgCache = new Map<string, SvgCacheEntry>()
// 使用 WeakMap 记录每个对象的原始SVG数据，避免污染元素的 JSON 结构
const originalSvgMap = new WeakMap<any, { dataUrl: string; secondLevelGIds: string[]; sourceUrl?: string }>()
// 运行期颜色信息存储，避免修改 obj.data 的原始 JSON 结构
const fillColorInfoMap = new WeakMap<any, any>()
const getFillColorInfo = (obj: any) => {
  let info = fillColorInfoMap.get(obj)
  if (!info) {
    info = {}
    fillColorInfoMap.set(obj, info)
  }
  return info
}

// 更新显示颜色的函数 切换活动对象只需要更新颜色即可 不需要重新走一遍改色逻辑
/**
 * 更新显示颜色，仅更新 UI 显示不触发解析流程
 * @param {string} color - 要展示的颜色（包含 '#' 或 rgba）
 * @returns {void} 无返回值
 */
const updateDisplayColor = (color: string): void => {
  isSystemUpdate = true
  activeColor.value = color
  setTimeout(() => {
    isSystemUpdate = false
  }, 0)
}

//style相关
const styleList = ref([])
const styleId = ref('') //styleId
const materialOutId = ref('') //materialOutId
const selectedMaterialId = ref('') // 当前选中对象的素材ID
const lastContextKey = ref('') // 去重：记录最近一次上下文 key
// 由 submit.vue 广播的上下文覆盖值
const boardOutIdOverride = ref('')
const pageOutIdOverride = ref('')
/**
 * 记录当前覆盖值的作用域素材ID：仅当选中素材与其一致时才应用覆盖值
 * @type {import('vue').Ref<string>} 覆盖值所属素材ID
 */
const overrideAppliedMaterialId = ref('')

// 监听素材上下文事件以覆盖面板所需参数（有选中素材时忽略）
const onMaterialContext = async (ctx: any) => {
  console.log(ctx, 'ctx')
  try {
    const key = `${ctx?.materialId || ''}|${ctx?.boardOutId || ''}|${ctx?.pageOutId || ''}`
    if (key && key === lastContextKey.value) {
      // 重复上下文不处理，避免多次刷新
      return
    }

    // 如果当前有选中的素材，则优先使用选中对象数据，忽略提交页上下文
    if (editor.activeObjectIsType('ClipImg') && selectedMaterialId.value) {
      // 保持 board/page 由选中对象 watcher 同步，不在此处覆盖
      return
    }

    // 无选中素材：按上下文回填参数
    if (ctx?.materialId) materialOutId.value = ctx.materialId
    if (ctx?.boardOutId && !boardOutIdOverride.value) boardOutIdOverride.value = ctx.boardOutId
    if (ctx?.pageOutId && !pageOutIdOverride.value) pageOutIdOverride.value = ctx.pageOutId
    lastContextKey.value = key

    console.log('oaEffectAttr 接收到素材上下文并已应用:', ctx)
    await ensureOriginalCaptured(materialOutId.value)
    await getStyleList()
  } catch (e) {
    console.warn('处理素材上下文事件失败:', e)
  }
}
emitter.on('material-context', onMaterialContext)

onUnmounted(() => {
  emitter.off('material-context', onMaterialContext)
})

// 会话级原始SVG缓存（按 materialId 存储，跨对象引用稳定）
const materialOriginalSvgMap = new Map<string, { dataUrl: string; secondLevelGIds: string[] }>()

async function ensureOriginalCaptured(currentId: string): Promise<boolean> {
  try {
    if (!currentId) return false
    if (materialOriginalStore.hasOriginal(currentId)) return true
    const obj = canvas.activeObject.value as any
    const svgUrl = obj?.fill?.[0]?.url as string
    if (!svgUrl) return false
    let svgText = ''
    if (svgUrl.startsWith('data:image/svg+xml,')) {
      svgText = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
    } else {
      const response = await fetch(svgUrl)
      svgText = await response.text()
    }
    const gIds = getSecondLevelGIds(svgText)
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgText)}`
    originalSvgMap.set(obj, { dataUrl, secondLevelGIds: gIds, sourceUrl: svgUrl })
    materialOriginalSvgMap.set(currentId, { dataUrl, secondLevelGIds: gIds })
    materialOriginalStore.setOriginal(currentId, dataUrl, gIds, svgUrl)
    return true
  } catch (e) {
    console.error('ensureOriginalCaptured 失败:', e)
    return false
  }
}
// 冻结首帧原始项：一旦生成列表，第一项始终使用初次进入的原始图像
// const frozenOriginalUrlMap = new Map<string, string>()
// 标记每个 materialId 的原始已完成一次初始化捕获，后续不再调用任何原始抓取
const capturedMaterialSet = new Set<string>()

/**
 * 本地持久化样式颜色映射的存储键。
 * @type {string}
 */
const STYLE_COLOR_KEY = 'materialStyleColorMap'

/**
 * 保存样式与颜色的映射（仅保存单一 HEX）。
 * @param {string} styleOutId 样式的唯一 ID（styleOutId）。
 * @param {string} hex 颜色十六进制字符串（不含#，会转为大写）。
 * @returns {void} 无返回值。
 */
const saveStyleColor = (styleOutId: string, hex: string): void => {
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_COLOR_KEY) || '{}')
    if (hex) map[styleOutId] = hex.toUpperCase()
    localStorage.setItem(STYLE_COLOR_KEY, JSON.stringify(map))
  } catch {}
}

/**
 * 读取样式对应的颜色（若存在）。
 * @param {string} styleOutId 样式的唯一 ID（styleOutId）。
 * @returns {string | undefined} 返回 HEX（原样存储），若不存在返回 undefined。
 */
const readStyleColor = (styleOutId: string): string | undefined => {
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_COLOR_KEY) || '{}')
    const hex = map?.[styleOutId]
    return typeof hex === 'string' ? hex : undefined
  } catch {
    return undefined
  }
}

/**
 * 移除样式与颜色的映射。
 * @param {string} styleOutId 样式的唯一 ID（styleOutId）。
 * @returns {void} 无返回值。
 */
const removeStyleColor = (styleOutId: string): void => {
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_COLOR_KEY) || '{}')
    if (map[styleOutId]) {
      delete map[styleOutId]
      localStorage.setItem(STYLE_COLOR_KEY, JSON.stringify(map))
    }
  } catch {}
}

/**
 * 本地持久化样式的局部图层选择范围映射（styleOutId -> svgpreviewId）。
 * 用于在非预览模式下应用样式时，仍能按保存时的局部范围着色。
 * @type {string}
 */
const STYLE_PREVIEW_KEY = 'materialStylePreviewMap'

/**
 * 保存样式对应的局部图层选择范围。
 * @param {string} styleOutId 样式的唯一 ID（styleOutId）。
 * @param {{ id: string; content: any[] }} preview 根据 `parseSVGAndSetFilter` 所需的结构，包含选中图层的 id 与内容列表。
 * @returns {void}
 */
const saveStylePreview = (styleOutId: string, preview: { id: string; content: any[] }): void => {
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_PREVIEW_KEY) || '{}')
    map[styleOutId] = preview
    localStorage.setItem(STYLE_PREVIEW_KEY, JSON.stringify(map))
  } catch {}
}

/**
 * 读取样式的局部图层选择范围。
 * @param {string} styleOutId 样式的唯一 ID（styleOutId）。
 * @returns {{ id: string; content: any[] } | undefined} 若存在则返回结构，否则返回 undefined。
 */
const readStylePreview = (styleOutId: string): { id: string; content: any[] } | undefined => {
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_PREVIEW_KEY) || '{}')
    const preview = map?.[styleOutId]
    return preview ? preview : undefined
  } catch {
    return undefined
  }
}

/**
 * 移除样式的局部图层选择范围映射。
 * @param {string} styleOutId 样式的唯一 ID（styleOutId）。
 * @returns {void}
 */
const removeStylePreview = (styleOutId: string): void => {
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_PREVIEW_KEY) || '{}')
    if (map[styleOutId]) {
      delete map[styleOutId]
      localStorage.setItem(STYLE_PREVIEW_KEY, JSON.stringify(map))
    }
  } catch {}
}

/**
 * 持久化样式的完整 SVG 内容映射（styleOutId -> svgText）。
 * 采用 IndexedDB 存储，避免 localStorage 空间不足。
 * 若 IndexedDB 不可用时，回退到 localStorage（只读/写入）。
 * @type {string}
 */
const STYLE_SVG_KEY = 'materialStyleSvgMap'

/**
 * 保存样式的完整 SVG 文本（IndexedDB）
 * @param {string} styleOutId 样式唯一ID
 * @param {string} svgText 完整的SVG文本（可为优化后文本）
 * @returns {Promise<void>} 无返回值
 */
const saveStyleSvg = async (styleOutId: string, svgText: string): Promise<void> => {
  if (!styleOutId || !svgText) return
  try {
    await saveStyleSvgToDB(styleOutId, svgText)
  } catch (e) {
    // IndexedDB 存储失败时回退到 localStorage
    try {
      const map = JSON.parse(localStorage.getItem(STYLE_SVG_KEY) || '{}')
      map[styleOutId] = svgText
      localStorage.setItem(STYLE_SVG_KEY, JSON.stringify(map))
    } catch {}
  }
}

/**
 * 读取样式的完整 SVG 文本（IndexedDB）
 * @param {string} styleOutId 样式唯一ID
 * @returns {Promise<string | undefined>} 若存在则返回SVG文本
 */
const readStyleSvg = async (styleOutId: string): Promise<string | undefined> => {
  if (!styleOutId) return undefined
  try {
    const text = await readStyleSvgFromDB(styleOutId)
    if (typeof text === 'string') return text
  } catch {}
  // 回退读取 localStorage
  try {
    const map = JSON.parse(localStorage.getItem(STYLE_SVG_KEY) || '{}')
    const text = map?.[styleOutId]
    return typeof text === 'string' ? text : undefined
  } catch {
    return undefined
  }
}

/**
 * 删除样式的 SVG 文本缓存（IndexedDB）
 * @param {string} styleOutId 样式唯一ID
 * @returns {Promise<void>} 无返回值
 */
const removeStyleSvg = async (styleOutId: string): Promise<void> => {
  if (!styleOutId) return
  try {
    await removeStyleSvgFromDB(styleOutId)
  } catch {
    // 回退删除 localStorage
    try {
      const map = JSON.parse(localStorage.getItem(STYLE_SVG_KEY) || '{}')
      if (map[styleOutId]) {
        delete map[styleOutId]
        localStorage.setItem(STYLE_SVG_KEY, JSON.stringify(map))
      }
    } catch {}
  }
}

const isSingleColor = ref(false) //是否是单个图层改色
// 从SVG文本中提取颜色信息，严格区分整体改色和子图层改色
const extractDataFillColor = (svgText: string): string | null => {
  try {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    // console.log(doc.querySelectorAll('[data-fill-color]'), 'doc')
    const allColoredNodes = doc.querySelectorAll('[data-fill-color]')
    // 如果没有颜色标记，返回null
    if (allColoredNodes.length === 0) {
      return null
    }
    // 如果节点只有一个，说明是只有一个子图层改色，也需要返回mixed
    if (allColoredNodes.length === 1) {
      console.log('只有一个图层改色')
      isSingleColor.value = true
      return 'mixed'
    }

    // 是否存在子图层改色（g标签内部的元素设置了data-fill-color属性）
    // 无论子图层改了多少个颜色，只要是在g标签内部设置的颜色，都视为子图层改色
    const hasChildLayerColoring = doc.querySelector('g [data-fill-color]') !== null
    console.log('hasChildLayerColoring:', hasChildLayerColoring)

    // if (hasChildLayerColoring) {
    //   // 如果有子图层改色，直接返回"mixed"
    //   return "mixed"
    // }

    // 检查是否存在顶层整体改色（顶层g标签或svg标签上的data-fill-color属性）
    // const topLevelElement = doc.querySelector('g[data-fill-color], svg[data-fill-color]')
    // console.log('topLevelElement:', topLevelElement)

    // if (topLevelElement) {
    //   const topLevelFillColor = topLevelElement.getAttribute('data-fill-color')?.toUpperCase()
    //   return topLevelFillColor
    // }

    // 检查是否只有一种颜色（非子图层改色的情况）
    const colors = new Set<string>()
    allColoredNodes.forEach((node) => {
      const hex = node.getAttribute('data-fill-color')
      if (hex) {
        colors.add(hex.toUpperCase())
      }
    })

    // 如果只有一种颜色，返回该颜色
    if (colors.size === 1) {
      return Array.from(colors)[0]
    }

    // 其他情况返回"mixed"
    return 'mixed'
  } catch {
    return null
  }
}

// 判断 SVG 文本是否已经被改色（存在 data-fill-color 或颜色滤镜标记）
const isModifiedSvgText = (svgText: string): boolean => {
  try {
    if (svgText.includes('color-filter-')) return true
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    if (doc.querySelector('[data-fill-color]')) return true
    const styled = Array.from(doc.querySelectorAll('[style]'))
    return styled.some((el) => (el.getAttribute('style') || '').includes('url(#color-filter-'))
  } catch {
    return false
  }
}

/**
 * @description 获取原始 SVG 内容并更新缓存（不改动 styleList）
 * @param svgUrl SVG 文件的 URL 或 data URL
 */
const loadOriginalSvg = async (svgUrl: string) => {
  const obj = canvas.activeObject.value as any
  const currentId = materialOutId.value || (obj as any)?.data?.materialId || (obj as any)?.data?.outId || ''

  const meta = originalSvgMap.get(obj)
  if (meta?.dataUrl) return

  // 优先使用全局持久化的首帧原始
  if (currentId && materialOriginalStore.hasOriginal(currentId)) {
    const dataUrl = materialOriginalStore.getOriginal(currentId)!
    const gIds = materialOriginalStore.getSecondLevelGIds(currentId)
    originalSvgMap.set(obj, { dataUrl, secondLevelGIds: gIds, sourceUrl: undefined })
    return
  }

  try {
    const isDataUrl = svgUrl.startsWith('data:image/svg+xml,')
    let svgText = ''
    if (isDataUrl) {
      svgText = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
    } else {
      const response = await fetch(svgUrl)
      svgText = await response.text()
    }

    const secondLevelGIds = getSecondLevelGIds(svgText)
    const originalSvgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgText)}`

    // 写入当前对象、会话级与持久化原始
    originalSvgMap.set(obj, { dataUrl: originalSvgDataUrl, secondLevelGIds, sourceUrl: svgUrl })
    if (currentId) {
      materialOriginalSvgMap.set(currentId, { dataUrl: originalSvgDataUrl, secondLevelGIds })
      materialOriginalStore.setOriginal(currentId, originalSvgDataUrl, secondLevelGIds, svgUrl)
    }
  } catch (error) {
    console.error('加载原始 SVG 失败:', error)
  }
}

/**
 * 解析当前激活元素的素材ID（支持多选）
 * @returns {string[]} 当前激活或多选列表中的素材ID集合（去重）
 */
/**
 * 解析当前激活元素的素材ID（支持多选）
 * @returns {string[]} 当前激活或多选列表中的素材ID集合（去重）
 */
/**
 * 解析当前激活元素的素材ID（支持多选，避免跨对象污染）
 * - 多选：收集每个对象 data.materialId/outId，或缓存/URL解析
 * - 单选：
 *   - 详情模式：route.materialId > obj.data(materialId/outId) > cache > url
 *   - 普通模式：obj.data(materialId/outId) > route.materialId > cache > url
 * 注意：不再回退到 selectedMaterialId/materialOutId，避免沿用上一个对象的ID
 * @returns {string[]} 当前激活或多选列表中的素材ID集合（去重）
 */
const resolveActiveMaterialIds = (): string[] => {
  const ids: string[] = []
  try {
    const multiple = editor.app.editor.multiple
    if (multiple) {
      const list = canvas.app.editor.leafList.list || []
      for (const obj of list) {
        const mid =
          (obj as any)?.data?.materialId ||
          (obj as any)?.data?.outId ||
          parseMaterialIdFromUrl((obj as any)?.fill?.[0]?.url) ||
          activeObjectMaterialIdMap.get(obj as any)
        if (mid && isValidId(mid)) ids.push(String(mid))
      }
    } else {
      const obj = canvas.activeObject.value as any
      // 单选：优先级（两种模式一致）：data > URL > cache；路由 materialId 在素材详情模式下回退
      let mid =
        (obj as any)?.data?.materialId ||
        (obj as any)?.data?.outId ||
        parseMaterialIdFromUrl(obj?.fill?.[0]?.url) ||
        activeObjectMaterialIdMap.get(obj) ||
        ''
      if (!mid && isMaterialDetailMode && isValidId(materialId)) {
        mid = String(materialId)
      }
      if (mid && isValidId(mid)) ids.push(String(mid))
    }
  } catch (e) {
    console.warn('解析激活素材ID失败：', e)
  }
  return Array.from(new Set(ids)).filter(Boolean)
}

/**
 * 获取当前素材的style列表
 * @description 支持多选：若多选且存在多个不同素材ID，优先展示首个素材ID的样式列表
 * @returns {Promise<void>} 无返回值，更新组件内的 styleList
 */
const getStyleList = async (): Promise<void> => {
  // 获取样式列表：当存在有效素材ID时加载远端样式
  const obj = canvas.activeObject.value as any
  const ids = resolveActiveMaterialIds()
  const currentId = ids[0] || ''
  /**
   * 加载当前素材的样式列表（解析优先级：data(materialId/outId) > url > cache > route）
   */

  console.log(currentId, '当前素材id', status, dragStatus.value, shouldHideStyleList)
  // 公共素材库进来的素材style会被清空
  //   if (!currentId || !(status === '1' || dragStatus.value === '1')) {
  //     styleList.value = []
  //     return
  //   }
  // 清空旧列表，避免切换素材时显示上一个素材的图片
  styleList.value = []
  // 清理内存中的颜色缓存，避免切换style后显示旧的颜色信息
  // 但保留obj.data中的颜色信息，因为多图层改色时需要这些数据
  if (canvas.activeObject.value) {
    fillColorInfoMap.delete(canvas.activeObject.value)
    // 不再清空obj.data.fillColorInfo，因为这会导致多图层改色信息丢失
  }
  const styleRes = await auditMaterialApi.getMaterialStyleList(currentId, 1, 50)
  const list = Array.isArray(styleRes) ? styleRes : Array.isArray(styleRes?.rows) ? styleRes.rows : []

  const items = list
    .map((item: any, idx: number) => {
      const styleOutId = item?.styleOutId
      const url = `${imgBaseUrl}/${resolveBoardOutId()}/${resolvePageId()}/${currentId}/${styleOutId}.png`
      const id = item?.id || item?.outId || styleOutId || `style-${idx}`
      const name = item?.name || ''
      const colorHex = styleOutId ? readStyleColor(styleOutId) : undefined
      const key = `${currentId}-${id}`
      return url ? { id, key, styleOutId, url, isOriginal: false, name, colorHex } : null
    })
    .filter(Boolean)
  console.log(items, 'items')
  // 原始样式优先使用持久化首帧原始
  let originalUrl = materialOriginalStore.getOriginal(currentId)
  if (!originalUrl) {
    await ensureOriginalCaptured(currentId)
    originalUrl =
      materialOriginalStore.getOriginal(currentId) ||
      materialOriginalSvgMap.get(currentId)?.dataUrl ||
      originalSvgMap.get(canvas.activeObject.value as any)?.dataUrl
    if (originalUrl) {
      const gIds = materialOriginalSvgMap.get(currentId)?.secondLevelGIds || []
      materialOriginalStore.setOriginal(currentId, originalUrl, gIds)
    }
  }

  const mapped = originalUrl
    ? ([{ id: 'original', key: `${currentId}-original`, url: originalUrl, isOriginal: true }] as any[]).concat(items as any[])
    : (items as any[])

  const seen = new Set<string>()
  styleList.value = mapped.filter((it: any) => {
    if (seen.has(it.id)) return false
    seen.add(it.id)
    return true
  })
}

watch(
  () => canvas.ref.svgpreviewId.value,
  async (newVal) => {
    if (newVal) {
      if (canvas.activeObject.value.tag === 'SimulateElement') {
        let svgColor: any = []
        editor.dateEdit(async (e) => {
          // 判断是否有子svg颜色
          if (e.data.fillColorInfo?.childSvgColorInfo) {
            const colorInfo = e.data.fillColorInfo.childSvgColorInfo.find((item: { id: string }) => item.id === newVal.id)
            svgColor.push(colorInfo?.hex || '')
          } else {
            svgColor.push('')
          }
        })
        const isSame = svgColor.every((v: any) => v === svgColor[0])
        if (isSame) {
          currentColor.value = svgColor[0].toUpperCase()
          updateDisplayColor('#' + svgColor[0])
        } else {
          activeColor.value = '#'
          currentColor.value = 'Mixed'
        }
      } else {
        const activeObject = canvas.activeObject.value as any
        let svgColor = ''
        // 判断是否有子svg颜色
        if (activeObject.data.fillColorInfo?.childSvgColorInfo) {
          const colorInfo = activeObject.data.fillColorInfo.childSvgColorInfo.find((item: { id: string }) => item.id === newVal.id)
          svgColor = colorInfo?.hex || ''
        }

        // 如果从内存中找不到颜色信息，尝试从SVG DOM中读取
        if (!svgColor) {
          svgColor = await getColorFromSvgDom(activeObject, newVal.id)
        }
        currentColor.value = svgColor.toUpperCase() || 'Mixed'
        updateDisplayColor('#' + svgColor || 'Mixed')
      }
    }
  },
  { deep: true }
)

// 处理多选元素的颜色判断
const handleMultipleObjectsColor = async () => {
  const isMultiple = editor.app?.editor?.multiple || canvas.activeObject.value?.tag === 'SimulateElement';
  console.log(isMultiple, 'isMultiple')
  if (isMultiple) {
    const list = canvas.app?.editor?.list || [];
    if (list.length > 1) {
      // 收集所有选中对象的颜色
      const colors: string[] = [];
      for (const obj of list) {
        if (obj && obj.data && obj.data.fillColorInfo && obj.data.fillColorInfo.svg && obj.data.fillColorInfo.svg.hex) {
          colors.push(obj.data.fillColorInfo.svg.hex.toUpperCase());
        } else {
          colors.push('Mixed');
        }
      }
      
      // 检查所有颜色是否相同
      const allSameColor = colors.every(color => color === colors[0]);
      if (allSameColor) {
        if (colors[0] === 'Mixed') {
          activeColor.value = 'Mixed';
          currentColor.value = 'Mixed';
        } else {
          currentColor.value = colors[0];
          activeColor.value = '#' + colors[0];
        }
      } else {
        // 颜色不一致，显示为Mixed
        activeColor.value = 'Mixed';
        currentColor.value = 'Mixed';
      }
      return true;
    }
  }
  return false;
};

// 监听选中对象列表的变化，确保多选时颜色显示正确
watchEffect(() => {
  // 当编辑器实例存在且处于多选模式时，检查选中的对象列表
  // if (editor.app?.editor?.multiple && canvas.app?.editor?.list && canvas.app?.editor?.list.length > 0) {
  //   handleMultipleObjectsColor();
  // }
});

// 切换活动对象时，更新图层信息
watch(
  () => canvas.activeObject.value,
  async (newActiveObject) => {
    // 先检查是否是多选情况，如果是则处理多选颜色逻辑
    // const handled = await handleMultipleObjectsColor();
    // if (handled) return;
    
    console.log(canvas.activeObject.value.tag, canvas.activeObject.value.data.fillColorInfo)
    if (canvas.activeObject.value.tag === 'SimulateElement') {
      isSVg.value = true
      const svgHex = editor.getAttributeValue('data.fillColorInfo.svg.hex')
      if (svgHex) {
        currentColor.value = svgHex.toUpperCase()
        updateDisplayColor('#' + svgHex)
      } else {
        // 识别不到颜色 显示 mix
        activeColor.value = 'Mixed'
        currentColor.value = 'Mixed'
      }
      return false
    } else {
      if (!editor.activeObjectIsType('ClipImg', 'CustomCilpImg')) return
      console.log(newActiveObject, 'newActiveObject', canvas.contentFrame.children)
      // 重置单个图层改色标志，确保每次切换活动对象时从正确的初始状态开始
      isSingleColor.value = false

      const svgUrl = (newActiveObject as any).fill[0].url as string
      if (!svgUrl?.toLowerCase().includes('.svg') && !svgUrl?.toLowerCase().includes('data:image/svg+xml')) {
        isSVg.value = false
        styleList.value = []
        return
      }
      isSVg.value = true

      // 更新当前素材 id：优先对象 data，其次 URL 解析，再次缓存，最后在非拖拽素材详情模式下回退路由 materialId
      const objData = (newActiveObject as any)?.data || {}
      let currentId: string =
        objData.materialId || objData.outId || parseMaterialIdFromUrl(svgUrl) || activeObjectMaterialIdMap.get(newActiveObject as any) || ''
      if (!currentId && isMaterialDetailMode && isValidId(materialId)) {
        currentId = String(materialId)
      }
      selectedMaterialId.value = currentId
      if (currentId) activeObjectMaterialIdMap.set(newActiveObject as any, currentId)
      // 切换到新的素材后仅在审核通过或拖拽审核素材时刷新样式列表
      // if (status === '1' || dragStatus.value === '1') {
      //     await getStyleList()
      // }
      await getStyleList()
      // 同步当前选中对象的画板与页面 ID 覆盖：直接写入解析到的值
      const nextBoardId = objData.boardOutId ?? objData.boardId ?? ''
      const nextPageId = objData.pageOutId ?? objData.pageId ?? ''
      /**
       * 同步覆盖值更新策略
       * - 若解析为 '0'，强制覆盖为 '0'（保持与签名 local/0/0 路径一致）
       * - 否则仅在当前覆盖为空时更新，避免已设覆盖被非零 ID 覆盖
       * @returns {void}
       */
      const nextBoardIdStr = nextBoardId != null ? String(nextBoardId) : ''
      const nextPageIdStr = nextPageId != null ? String(nextPageId) : ''
      if (nextBoardIdStr === '0') {
        boardOutIdOverride.value = '0'
      } else if (!boardOutIdOverride.value) {
        boardOutIdOverride.value = isValidId(nextBoardIdStr) ? nextBoardIdStr : ''
      }
      if (nextPageIdStr === '0') {
        pageOutIdOverride.value = '0'
      } else if (!pageOutIdOverride.value) {
        pageOutIdOverride.value = isValidId(nextPageIdStr) ? nextPageIdStr : ''
      }

      console.log(activeObject.value.data.fillColorInfo, 'activeObject.value.data.fillColorInfo')
      // 获取 svg整体图层滤镜颜色
      if (activeObject.value.data.fillColorInfo?.svg) {
        currentColor.value = activeObject.value.data.fillColorInfo.svg.hex.toUpperCase()
        updateDisplayColor('#' + activeObject.value.data.fillColorInfo.svg.hex)
      } else {
        // 尝试从SVG文本中提取填充颜色，以正确设置isSingleColor标志
        try {
          // 获取SVG文本内容
          let svgText = ''
          const currentActiveObject = activeObject.value as any
          
          // 检查fill属性是否存在且为数组，以及数组是否有元素
          if (!currentActiveObject.fill || !Array.isArray(currentActiveObject.fill) || currentActiveObject.fill.length === 0 || !currentActiveObject.fill[0]?.url) {
            console.warn('当前对象没有有效的SVG URL')
            activeColor.value = 'Mixed'
            currentColor.value = 'Mixed'
            return
          }
          
          const svgUrl = currentActiveObject.fill[0].url as string

          if (svgUrl.startsWith('data:image/svg+xml,')) {
            svgText = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
          } else {
            const resp = await fetch(svgUrl)
            svgText = await resp.text()
          }

          // 使用extractDataFillColor正确设置isSingleColor标志
          if (svgText) {
            const extractedColor = extractDataFillColor(svgText)
            console.log(extractedColor, 'extractedColor')
            if (extractedColor) {
              if (extractedColor.toLowerCase() === 'mixed') {
                activeColor.value = 'Mixed'
                currentColor.value = 'Mixed'
              } else {
                currentColor.value = extractedColor.toUpperCase()
                updateDisplayColor('#' + extractedColor)
              }
            } else {
              activeColor.value = 'Mixed'
              currentColor.value = 'Mixed'
            }
          } else {
            activeColor.value = 'Mixed'
            currentColor.value = 'Mixed'
          }
        } catch (e) {
          console.error('提取svg文本失败:', e)
          activeColor.value = 'Mixed'
          currentColor.value = 'Mixed'
        }
      }

      // 仅首次按 currentId 捕获原始
      if (currentId && !materialOriginalStore.hasOriginal(currentId)) {
        try {
          if (svgUrl.startsWith('data:image/svg+xml,')) {
            const text = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
            const gIds = getSecondLevelGIds(text)
            const dataUrl = `data:image/svg+xml,${encodeURIComponent(text)}`
            originalSvgMap.set(newActiveObject as any, { dataUrl, secondLevelGIds: gIds, sourceUrl: svgUrl })
            materialOriginalSvgMap.set(currentId, { dataUrl, secondLevelGIds: gIds })
            materialOriginalStore.setOriginal(currentId, dataUrl, gIds, svgUrl)
          } else {
            const resp = await fetch(svgUrl)
            const text = await resp.text()
            const gIds = getSecondLevelGIds(text)
            const dataUrl = `data:image/svg+xml,${encodeURIComponent(text)}`
            originalSvgMap.set(newActiveObject as any, { dataUrl, secondLevelGIds: gIds, sourceUrl: svgUrl })
            materialOriginalSvgMap.set(currentId, { dataUrl, secondLevelGIds: gIds })
            materialOriginalStore.setOriginal(currentId, dataUrl, gIds, svgUrl)
          }
        } catch (e) {
          console.log(e, '获取失败')
        }
      } else if (currentId) {
        // 已有原始：仅用持久化原始回填对象级缓存
        const dataUrl = materialOriginalStore.getOriginal(currentId)
        const gIds = materialOriginalStore.getSecondLevelGIds(currentId)
        if (dataUrl) {
          originalSvgMap.set(newActiveObject as any, { dataUrl, secondLevelGIds: gIds, sourceUrl: undefined })
        }
      }

      const info = getFillColorInfo(activeObject.value)
      if (info?.svg) {
        currentColor.value = info.svg.hex.toUpperCase()
        updateDisplayColor('#' + info.svg.hex)
      } else {
        // 先尝试从SVG文本中提取填充颜色，以正确设置isSingleColor标志
        try {
          // 获取SVG文本内容
          let svgText = ''
          const currentActiveObject = activeObject.value as any
          
          // 添加空值检查，避免fill属性不存在或不是数组时的错误
          if (!currentActiveObject.fill || !Array.isArray(currentActiveObject.fill) || currentActiveObject.fill.length === 0 || !currentActiveObject.fill[0].url) {
            console.warn('SVG对象缺少有效的fill属性或url');
            return;
          }
          
          const svgUrl = currentActiveObject.fill[0].url as string

          if (svgUrl.startsWith('data:image/svg+xml,')) {
            svgText = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
          } else {
            const resp = await fetch(svgUrl)
            svgText = await resp.text()
          }

          // 使用extractDataFillColor正确设置isSingleColor标志
          if (svgText) {
            const extractedColor = extractDataFillColor(svgText)
            if (extractedColor) {
              if (extractedColor.toLowerCase() === 'mixed') {
                // 如果明确是混合颜色，直接设置为Mixed
                activeColor.value = 'Mixed'
                currentColor.value = 'Mixed'
                return
              } else {
                // 如果提取到了具体颜色，直接使用
                currentColor.value = extractedColor.toUpperCase()
                updateDisplayColor('#' + extractedColor)
                return
              }
            }
          }
        } catch (e) {
          console.error('从svg文本中提取颜色失败:', e)
        }

        // 从当前 SVG DOM 中提取已应用的颜色（读取 data-fill-color）
        const colors = await deriveColorsFromSvgDom()
        console.log(colors, 'colors', isSingleColor.value)
        if (colors.length === 1 && !isSingleColor.value) {
          const hex = colors[0].toUpperCase()
          currentColor.value = hex
          updateDisplayColor('#' + hex)
        } else {
          activeColor.value = 'Mixed'
          currentColor.value = 'Mixed'
        }
      }

      // 先清空，避免切换素材时短暂显示上一个素材的样式
      // styleList.value = []
      // // if (status === '1' || dragStatus.value === '1') await getStyleList()
      // await getStyleList()
    }
  },
  {
    immediate: true
  }
)

// 颜色选择器触发器属性
const triggerProps = ref({
  position: 'lt', //弹出位置
  popupTranslate: [-10, -100] //偏移位置，用于控制面板位置
})

// 拖拽状态变量
const isDragging = ref(false)
const startPosition = ref({ x: 0, y: 0 })
const panelPosition = ref({ x: -5, y: 0 })

// 处理拖拽状态变化
const handleDragStateChange = (dragging: boolean) => {
  isDragging.value = dragging
}

//鼠标按下事件
const handleMouseDown = (e: MouseEvent) => {
  // 获取事件目标元素
  const target = e.target as HTMLElement
  //获取target的类名
  const targetClassName = target.className
  const names = ['arco-color-picker-colors-text', 'arco-color-picker-panel-colors', 'arco-color-picker-panel-control']
  if (names.includes(targetClassName)) {
    // 让当前激活的输入框失去焦点
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    // 开始拖拽
    isDragging.value = true
  } else {
    return
  }

  // 记录开始拖拽时的鼠标位置
  startPosition.value = {
    x: e.clientX,
    y: e.clientY
  }

  // 记录当前面板偏移位置
  panelPosition.value = {
    x: triggerProps.value.popupTranslate[0],
    y: triggerProps.value.popupTranslate[1]
  }

  // 鼠标移动事件处理
  function onMouseMove(moveEvent: MouseEvent) {
    if (!isDragging.value) return

    // 计算鼠标移动的距离
    const offsetX = moveEvent.clientX - startPosition.value.x
    const offsetY = moveEvent.clientY - startPosition.value.y

    // 计算新位置，防止面板移出屏幕
    const newX = Math.max(-500, Math.min(500, panelPosition.value.x + offsetX))
    const newY = Math.max(-300, Math.min(300, panelPosition.value.y + offsetY))

    // 设置新位置
    triggerProps.value.popupTranslate = [newX, newY]
  }

  // 鼠标释放事件
  function onMouseUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  // 添加鼠标移动和释放事件
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)

  // 防止事件冒泡，避免触发其他事件
  e.stopPropagation()
  e.preventDefault()
}

// 监听颜色变化
watch(activeColor, async (newVal) => {
  if (newVal === 'Mixed' || newVal === 'rgba(255, 0, 0, 1)' || currentColor.value === 'FF0000' || newVal === '#') {
    currentColor.value = 'Mixed'
    activeColor.value = 'Mixed'
    return
  }
  // console.log(newVal, '---newVal');
  if (isSystemUpdate) {
    return
  }
  // console.log(newVal, '---newVal');

  // 在拖拽过程中不处理SVG解析，避免保存拖拽过程中的颜色
  // 使用颜色选择器内部的拖拽状态，而不是UI组件的拖拽状态
  if (colorStore.getDraggingState()) {
    return
  }

  if (canvas.activeObject.value && canvas.activeObject.value.tag !== 'SimulateElement') {
    const svgUrl = (canvas.activeObject.value as any).fill[0].url as string

    const color = new GColor(newVal)
    color.alpha = activeColorOpacity.value / 100
    // 更新色值显示
    const hex = color.hex.replace('#', '')
    currentColor.value = hex.toUpperCase()
    // 使用节流函数处理SVG解析和更新
    debouncedProcessSvg(svgUrl, hex, canvas.activeObject.value.innerId)
  }
})

const setDebouncedProcessSvg = debounce((watchColor: string, list: any) => {
  editor.dateEdit(
    (e) => {
      if (isArray((e as any).fill)) {
        const svgUrl = (e as any).fill[0].url as string
        const color = new GColor(watchColor)
        color.alpha = activeColorOpacity.value / 100
        // 更新色值显示
        const hex = color.hex.replace('#', '')
        currentColor.value = hex.toUpperCase()
        // 使用节流函数处理SVG解析和更新
        debouncedProcessSvg(svgUrl, hex, e.innerId)
      }
    },
    0,
    list
  )
})

// 监听透明度变化
watch(activeColorOpacity, (newVal) => {
  if (canvas.activeObject.value && activeColor.value) {
    //创建颜色对象
    const color = new GColor(activeColor.value)
    //设置透明度
    color.alpha = newVal / 100
    //更新颜色选择器颜色
    activeColor.value = color.rgba
    //更新颜色
    // fill.value.onChange(color.rgba);
  }
})
/**
 * 颜色选择器变更时更新显示并写入历史
 * @param {string} newVal - 颜色选择器输出的颜色（rgba 或 hex）
 * @returns {void} 无返回值
 */
const handleColorChange = (newVal: string): void => {
  // 使用格式化逻辑处理输入
  const result = formatColor(currentColor.value, activeColor.value)

  if (result.color !== currentColor.value) {
    currentColor.value = result.color
  }

  // 如果返回了透明度，则更新透明度值
  if (result.opacity !== undefined) {
    activeColorOpacity.value = result.opacity
  }

  // 如果是颜色选择器的值，会是一个完整的颜色值（rgba或hex）
  const colorObj = new GColor(newVal)
  const hex = colorObj.hex.replace('#', '')

  // 更新当前显示的颜色值
  currentColor.value = hex.toUpperCase()

  // 从颜色对象中获取透明度
  activeColorOpacity.value = Math.round(colorObj.alpha * 100)

  // 更新颜色选择器颜色
  activeColor.value = colorObj.rgba

  // 只有在非拖拽状态下才保存操作和写入历史记录
  // if (!isDragging.value) {
  //   // 保存操作
  //   canvas.undoRedo.save()
  //   // 条件写入历史：仅当新颜色不在历史中时（避免点击历史色块导致置顶/重复）
  //   const hexUpper = colorObj.hex.toUpperCase()
  //   if (hexUpper && activeColor.value !== 'Mixed' && !historyColors.value.includes(hexUpper)) {
  //     colorStore.addHistoryColor(hexUpper)
  //   }
  // }
  handleCurrentChange()
}

// 失去焦点时才进行颜色转换
const handleCurrentChange = () => {
  // 防止输入框未移出焦点且切换对象导致元素被错误设置颜色
  if (currentColor.value === 'Mixed') {
    return
  }
  console.log(222)
  // 使用格式化逻辑处理输入
  const result = formatColor(currentColor.value, activeColor.value)
  if (result.color !== currentColor.value) {
    currentColor.value = result.color
  }

  // 如果返回了透明度，则更新透明度值
  if (result.opacity !== undefined) {
    activeColorOpacity.value = result.opacity
  }

  // 创建新的颜色对象并应用透明度
  const colorObj = new GColor('#' + result.color)
  colorObj.alpha = activeColorOpacity.value / 100
  activeColor.value = colorObj.rgba

  const list = canvas.app.editor.leafList.list
  setDebouncedProcessSvg(activeColor.value, list)
}
// 历史记录长度由 store 控制，这里不再额外裁剪

// 添加颜色
/**
 * 添加当前选中颜色到历史记录并持久化
 * @returns {void} 无返回值
 */
/**
 * 将当前选择颜色以 HEX 形式加入历史，避免 rgba 与 hex 混用。
 * @returns {void} 无返回值
 */
const handleAddColor = (): void => {
  if (!activeColor.value) return
  const hexUpper = new GColor(activeColor.value).hex.toUpperCase()
  if (!historyColors.value.includes(hexUpper)) {
    colorStore.addHistoryColor(hexUpper)
  }
  currentMode.value = 'add'
}

//当前操作模式 删除还是添加
const currentMode = ref<'delete' | 'add'>('add')

// 选择颜色  如果是添加操作，则选择颜色，如果是删除操作，则删除颜色
/**
 * 选择历史颜色或删除指定颜色
 * @param {string} color - 历史颜色值（如 rgba 或 hex）
 * @param {number} index - 历史颜色索引
 * @returns {void} 无返回值
 */
const handleSelectColor = (color: string, index: number): void => {
  if (currentMode.value === 'add') {
    activeColor.value = color
  } else {
    Modal.confirm({
      title: '删除确认',
      content: '确定要删除这个颜色吗？',
      cancelText: '取消',
      okText: '确定',
      onOk: () => {
        colorStore.deleteHistoryColor(color, index)
        currentMode.value = 'add'
      }
    })
  }
}

// 删除颜色
const handleRemoveColor = (color: string = '', index: number = 0) => {
  currentMode.value = currentMode.value === 'delete' ? 'add' : 'delete'
}

/**
 * @description 简易防抖函数
 * @param fn 需要防抖的函数
 * @param delay 防抖延迟时间
 * @returns 防抖后的函数
 */

function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): (...args: Parameters<T>) => void {
  let timer: number | null = null

  return function (...args: Parameters<T>) {
    if (timer) {
      window.clearTimeout(timer)
    }

    timer = window.setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}
// 定义图层信息接口
interface LayerInfo {
  id: string
  name: string
  type: string
  childCount: number
  paths: number
}
/**
 * @description 解析 SVG 并设置图层滤镜（添加节流）
 * @param svgText SVG 文本内容
 * @param fillColor 填充颜色矩阵值
 * @param hex 十六进制颜色值
 * @param svgpreviewId 局部填充颜色的图层信息（仅使用其 id 指定单个目标图层）
 */
const parseSVGAndSetFilter = (
  svgText: string,
  fillColor?: string,
  hex?: string,
  svgpreviewId?: { id: string; content: LayerInfo[] },
  id?: number | string
) => {
  console.log(hex, '---hex111')
  //  mix阻止填充
  // if (hex === 'ffffff') return
  canvas.undoRedo.save()
  colorStore.addHistoryColor(hex) //拖拽结束时才保存到颜色历史记录
  try {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    const result = canvas.findObjectById(id)
    // 获取所有内容层级的元素
    let contentLayers: Element[] = []

    // 从 SVG 根元素的子元素开始查找可能的内容层包裹层
    Array.from(svgDoc.documentElement.children).forEach((child) => {
      // 调用 findContentGroups 来找到内容层列表
      const foundLayers = findContentGroups(child)
      // 将找到的层级添加到总列表中
      contentLayers = contentLayers.concat(foundLayers)
    })

    // 检查是否已存在 defs 元素，如果不存在则创建
    let defsElement = svgDoc.querySelector('defs')
    if (!defsElement) {
      defsElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs')
      svgDoc.documentElement.appendChild(defsElement)
    }

    // 添加滤镜配置
    const filterId = 'color-filter-' + Date.now()
    const filtersHTML = `
      <filter id="${filterId}" color-interpolation-filters="sRGB" x="-150%" y="-150%" width="400%" height="400%">
        <!-- 灰度转换 -->
        <feColorMatrix type="matrix"
          values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"
          in="SourceGraphic" result="result-0" />
        <!-- 色调调整 -->
        <feColorMatrix type="matrix"
          values="${fillColor}"
          in="result-0" result="result-1" />
        
        <!-- 对比度增强 大幅提高图像对比度 -->
        <feComponentTransfer in="result-1">
          <feFuncR type="gamma" exponent="3" />
          <feFuncG type="gamma" exponent="3" />
          <feFuncB type="gamma" exponent="3" />
        </feComponentTransfer>
      </filter>
    `

    // 将滤镜配置添加到 defs 元素
    defsElement.innerHTML += filtersHTML

    // 如果是局部填充，只对指定图层应用滤镜
    if (svgpreviewId) {
      // 优先使用选中分组的子层（content），若不存在则退回单一 id
      const selectedLayerIds =
        svgpreviewId.content && svgpreviewId.content.length > 0 ? svgpreviewId.content.map((item) => item.id) : [svgpreviewId.id]

      // 遍历所有内容层
      contentLayers.forEach((layer) => {
        const layerId = layer.getAttribute('id')

        // 只对选中的图层应用滤镜
        if (selectedLayerIds.includes(layerId)) {
          // 获取当前样式
          const currentStyle = (layer as SVGElement).getAttribute('style') || ''

          // 提取现有的filter属性（如果有）
          let existingFilter = ''
          const filterMatch = currentStyle.match(/filter:\s*([^;]+)/)

          if (filterMatch && filterMatch[1]) {
            // 保留饱和度滤镜，移除旧的颜色滤镜
            existingFilter = filterMatch[1].replace(/url\(#color-filter-[0-9]+\)\s*/g, '')
          }

          // 移除现有的filter属性
          const styleWithoutFilter = currentStyle
            .split(';')
            .filter((style) => !style.trim().startsWith('filter:'))
            .join(';')

          // 组合新的颜色滤镜和现有的饱和度滤镜
          let newFilter = ''
          if (existingFilter && existingFilter.trim() !== '') {
            // 如果存在其他滤镜（如饱和度滤镜），则组合使用
            // 颜色滤镜放在前面，饱和度滤镜放在后面
            newFilter = `url(#${filterId}) ${existingFilter}`
          } else {
            // 否则只使用颜色滤镜
            newFilter = `url(#${filterId})`
          }

          // 应用新滤镜
          const newStyle = `${styleWithoutFilter}; filter: ${newFilter}; isolation: isolate;`.trim()
          ;(layer as SVGElement).setAttribute('style', newStyle)

          // 添加自定义数据属性，存储hex颜色值（不带#号）
          if (hex) {
            layer.setAttribute('data-fill-color', hex)
          }

          // 如果需要存储更多信息，可以添加额外的data属性
          layer.setAttribute('data-filter-id', filterId)
          layer.setAttribute('data-last-modified', new Date().toISOString())

          // 将颜色信息追加到 activeObject.value.data.fillColorInfo 中
          if (hex && layerId) {
            const imgData = result.data || {}
            if (!imgData.fillColorInfo) {
              imgData.fillColorInfo = {}
            }

            // 初始化 childSvgColorInfo 数组（如果不存在）
            if (!imgData.fillColorInfo.childSvgColorInfo) {
              imgData.fillColorInfo.childSvgColorInfo = []
            }

            // 创建新的颜色信息对象
            const colorInfo = {
              id: svgpreviewId.id,
              content: svgpreviewId.content,
              hex: hex,
              fillColor: fillColor
            }

            // 检查是否已存在相同 id 的颜色信息
            const existingIndex = imgData.fillColorInfo.childSvgColorInfo.findIndex((item: { id: string }) => item.id === svgpreviewId.id)
            if (existingIndex !== -1) {
              // 如果存在，则更新颜色相关字段，保留其他字段（如饱和度）
              const existingItem = imgData.fillColorInfo.childSvgColorInfo[existingIndex]

              // 只更新颜色相关字段，保留其他字段
              existingItem.hex = hex
              existingItem.fillColor = fillColor
              // 不要覆盖 saturation 和 saturationFilterId 字段
            } else {
              // 如果不存在，则追加
              imgData.fillColorInfo.childSvgColorInfo.push(colorInfo)
            }

            // 更新 svgImg 的数据
            canvas.activeObject.value.data = imgData
          }
        }
      })
    } else {
      // 全局填充，对所有图层应用滤镜
      contentLayers.forEach((layer) => {
        const layerId = layer.getAttribute('id')
        // 获取当前样式
        const currentStyle = (layer as SVGElement).getAttribute('style') || ''

        // 提取现有的filter属性（如果有）
        let existingFilter = ''
        const filterMatch = currentStyle.match(/filter:\s*([^;]+)/)

        if (filterMatch && filterMatch[1]) {
          // 保留饱和度滤镜，移除旧的颜色滤镜
          existingFilter = filterMatch[1].replace(/url\(#color-filter-[0-9]+\)\s*/g, '')
        }

        // 移除现有的filter属性
        const styleWithoutFilter = currentStyle
          .split(';')
          .filter((style) => !style.trim().startsWith('filter:'))
          .join(';')

        // 组合新的颜色滤镜和现有的饱和度滤镜
        let newFilter = ''
        if (existingFilter && existingFilter.trim() !== '') {
          // 如果存在其他滤镜（如饱和度滤镜），则组合使用
          newFilter = `url(#${filterId}) ${existingFilter}`
        } else {
          // 否则只使用颜色滤镜
          newFilter = `url(#${filterId})`
        }

        // 应用新滤镜
        const newStyle = `${styleWithoutFilter}; filter: ${newFilter}; isolation: isolate;`.trim()
        ;(layer as SVGElement).setAttribute('style', newStyle)

        // 添加自定义数据属性，存储hex颜色值（不带#号）
        if (hex) {
          layer.setAttribute('data-fill-color', hex)
        }

        // 如果需要存储更多信息，可以添加额外的data属性
        layer.setAttribute('data-filter-id', filterId)
        layer.setAttribute('data-last-modified', new Date().toISOString())
      })
      const imgData = result.data || {}
      if (!imgData.fillColorInfo) {
        imgData.fillColorInfo = {}
      }

      // 初始化 childSvgColorInfo 数组（如果不存在）
      if (!imgData.fillColorInfo.childSvgColorInfo) {
        imgData.fillColorInfo.childSvgColorInfo = []
      }

      const svgChildInfo = canvas.ref.svgChildInfo.value || []
      if (svgChildInfo.length > 0) {
        svgChildInfo.forEach((layerInfo: any) => {
          // 创建新的颜色信息对象（与局部填充格式一致）
          const colorInfo = {
            id: layerInfo.id,
            content: layerInfo.content,
            hex: hex,
            fillColor: fillColor
          }

          // 检查是否已存在相同 id 的颜色信息
          const existingIndex = imgData.fillColorInfo.childSvgColorInfo.findIndex((item: { id: string }) => item.id === layerInfo.id)

          if (existingIndex !== -1) {
            // 如果存在，则更新颜色相关字段，保留其他字段（如饱和度）
            const existingItem = imgData.fillColorInfo.childSvgColorInfo[existingIndex]

            // 只更新颜色相关字段，保留其他字段
            existingItem.hex = hex
            existingItem.fillColor = fillColor
            // 不要覆盖 saturation 和 saturationFilterId 字段
          } else {
            // 如果不存在，则追加
            imgData.fillColorInfo.childSvgColorInfo.push(colorInfo)
          }
        })
      }
    }

    // 将修改后的 SVG 转换回字符串
    const serializer = new XMLSerializer()
    const modifiedSvgString = serializer.serializeToString(svgDoc)

    // 更新活动对象的 SVG
    if (canvas.activeObject.value) {
      updateSvgUrl(result as Image, modifiedSvgString)
    }

    return svgDoc
  } catch (error) {
    return null
  }
}
/**
 * @description 递归查找内容层包裹层，并返回其子元素作为内容层列表
 * @param element 当前 SVG 元素
 * @returns 找到的内容层元素数组，如果未找到则为空数组
 */
const findContentGroups = (element: Element): Element[] => {
  const tagName = element.tagName.toLowerCase()

  // 跳过 defs 标签和其他非图形容器标签
  if (tagName === 'defs' || tagName === 'title' || tagName === 'desc') {
    return [] // 跳过这些元素及其子树
  }

  const children = Array.from(element.children)

  // 如果当前元素是 g 标签
  if (tagName === 'g') {
    // 判断是否为包裹层 (只有一个 g 子元素)
    const isWrapper = children.length === 1 && children[0].tagName.toLowerCase() === 'g'

    if (isWrapper) {
      // 如果是包裹层，继续向下递归其唯一的 g 子元素
      return findContentGroups(children[0])
    } else {
      // 如果不是包裹层，说明找到了内容层所在的父级 (内容层包裹层)
      // 返回它的所有子元素作为内容层
      return children.filter((child) => {
        const childTagName = child.tagName.toLowerCase()
        // 包含所有常见的SVG图形元素
        return (
          childTagName === 'g' ||
          childTagName === 'path' ||
          childTagName === 'circle' ||
          childTagName === 'rect' ||
          childTagName === 'ellipse' ||
          childTagName === 'line' ||
          childTagName === 'polygon' ||
          childTagName === 'polyline'
        )
      })
    }
  }

  // 对于非 g 标签且非 defs/title/desc，如果是图形元素，则直接返回该元素
  if (['path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline'].includes(tagName)) {
    return [element]
  }

  return []
}
// 获取第二层 g 标签的所有 id：svg > g > g
function getSecondLevelGIds(svgText: string): string[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement
  const ids: string[] = []

  // 优先使用选择器（现代浏览器支持 :scope）
  try {
    const nodes = svg.querySelectorAll(':scope > g > g')
    nodes.forEach((el) => {
      const id = el.getAttribute('id')
      if (id) ids.push(id)
    })
    if (ids.length) return ids
  } catch {}

  // 回退：手动遍历两层 g
  svg.childNodes.forEach((node) => {
    if (node.nodeType === 1 && (node as Element).tagName.toLowerCase() === 'g') {
      const g1 = node as Element
      g1.childNodes.forEach((child) => {
        if (child.nodeType === 1 && (child as Element).tagName.toLowerCase() === 'g') {
          const g2 = child as Element
          const id = g2.getAttribute('id')
          if (id) ids.push(id)
        }
      })
    }
  })

  return ids
}

/**
 * @param imageElement 图像元素
 * @param svgString SVG字符串
 */
const updateSvgUrl = (imageElement: any, svgString: string) => {
  if (imageElement) {
    const url = `data:image/svg+xml,${encodeURIComponent(svgString)}`

    Resource.loadImage(url).then(() => {
      imageElement.set({
        fill: [
          {
            ...imageElement.fill[0],
            url
          }
        ]
      })
      // 预览中需要高亮图层
      if (canvas.ref.isSvgpreview.value) {
        previewSelectSvg()
      }
      // 裁剪中可能会修改svg 需要更新编辑器
      if (canvas.app.editor.innerEditing) {
        canvas.app.editor.innerEditor.updateEditor()
      }
    })
  }
  // 保存操作历史
  canvas.undoRedo.save(51)
}

// 转换补偿色
const hexToFeColorMatrix = (hexColor: string) => {
  // 移除#号
  hexColor = hexColor.replace('#', '')

  // 解析RGB值
  const r = parseInt(hexColor.substring(0, 2), 16)
  const g = parseInt(hexColor.substring(2, 4), 16)
  const b = parseInt(hexColor.substring(4, 6), 16)

  // 计算矩阵值
  const rDiag = (1 - r / 255).toFixed(15)
  const gDiag = (1 - g / 255).toFixed(15)
  const bDiag = (1 - b / 255).toFixed(15)

  const rOffset = (r / 255).toFixed(15)
  const gOffset = (g / 255).toFixed(15)
  const bOffset = (b / 255).toFixed(15)

  // 构建矩阵字符串
  return `${rDiag} 0 0 0 ${rOffset} 0 ${gDiag} 0 0 ${gOffset} 0 0 ${bDiag} 0 ${bOffset} 0 0 0 1 0`
}

/**
 * @description 节流处理SVG解析和更新
 * @param {string} svgUrl - 目标 SVG 的 URL
 * @param {string} hex - 十六进制颜色（不含#）
 * @returns {void}
 */
const debouncedProcessSvg = async (svgUrl: string, hex: string, id: number) => {
  if (canvas.activeObject.value.tag !== 'SimulateElement') {
    // 若当前活动对象的URL与任务URL不一致，说明已切换对象，跳过过期任务
    const currentUrl = ((canvas.activeObject.value as any)?.fill?.[0]?.url as string) || ''
    if (!currentUrl || currentUrl !== svgUrl) return
    // canvas.ref.isSvgpreview.value = false;
  }
  const response = await fetch(svgUrl)
  const svgText = await response.text()
  const svgResult = optimize(svgText, {
    plugins: ['removeDoctype', 'removeXMLProcInst', 'removeComments', 'removeMetadata', 'removeEditorsNSData', 'cleanupAttrs', 'removeViewBox']
  })

  if ('data' in svgResult) {
    const imgData = canvas.findObjectById(id)
    // 二次校验，避免在异步过程中发生切换
    const latestUrl = ((imgData as any)?.fill?.[0]?.url as string) || ''
    if (!latestUrl || latestUrl !== svgUrl) return

    const fillColor = hexToFeColorMatrix(hex)
    if (canvas.ref.isSvgpreview.value) {
      parseSVGAndSetFilter(svgResult.data, fillColor, hex, canvas.ref.svgpreviewId.value, id)
      imgData.data.fillColorInfo.svg = null
    } else {
      parseSVGAndSetFilter(svgResult.data, fillColor, hex, null, id)
      imgData.data.fillColorInfo = imgData.data.fillColorInfo || {}
      imgData.data.fillColorInfo.svg = { hex, fillColor }
      // imgData.fillColorInfo.childSvgColorInfo = null
    }
  }
}

/**
 * 检测当前激活的 SVG 是否已发生颜色更改（支持全局/局部）。
 * - 局部模式：依据 `canvas.ref.svgpreviewId` 指向的图层集合，在 `childSvgColorInfo` 中是否存在对应条目且含 `hex`。
 * - 全局模式：依据 `fillColorInfo.svg.hex` 判断。
 * @returns {boolean} 当检测到颜色被修改时返回 true，可用于触发“添加到 style”。
 */
/**
 * 检测当前激活的 SVG 是否已发生颜色更改（支持全局/局部、以及多子图层）
 * - 局部模式：优先检查当前预览所选图层集合；若未选中或无匹配项，则只要任一子图层存在 `hex` 即视为已改色。
 * - 全局模式：若存在 `fillColorInfo.svg.hex` 或任一子图层 `hex`，均视为已改色。
 * 这样可以支持“修改了多个子图层颜色”后仍可添加到 style，不再误判为未变更。
 * @returns {boolean} 当检测到颜色被修改时返回 true。
 */
const hasSvgColorChanged = (): boolean => {
  const obj = canvas.activeObject.value as any
  if (!obj) return false

  // 优先从obj.data中获取颜色信息，这是多图层改色时实际存储数据的地方
  const dataInfo = obj.data?.fillColorInfo

  // 同时维护内存中的缓存
  const mapInfo = getFillColorInfo(obj)

  // 使用dataInfo作为主要数据源，因为这是多图层改色时实际存储数据的地方
  const info = dataInfo || mapInfo

  // 同步到mapInfo以保持一致性
  if (dataInfo) {
    Object.assign(mapInfo, dataInfo)
  }

  console.log('hasSvgColorChanged', info, 'dataInfo:', dataInfo)
  if (!info) return false

  const childList = Array.isArray(info.childSvgColorInfo) ? info.childSvgColorInfo : []
  const hasAnyChildHex = childList.some((i: any) => !!i?.hex)

  if (canvas.ref.isSvgpreview.value) {
    const id = canvas.ref.svgpreviewId.value?.id
    if (id) {
      const item = childList.find((i: any) => i.id === id)
      if (item?.hex) return true
    }
    // 回退：即便当前未选中具体子图层，只要任一子图层存在颜色改动，也视为已改色
    return hasAnyChildHex || !!info.svg?.hex
  }
  // 非局部预览时，同时考虑全局与任一子图层的改色情况
  return hasAnyChildHex || !!info.svg?.hex
}

/**
 * 获取当前选中 SVG 的有效颜色 HEX（大写）。
 * - 优先返回局部选中色（`childSvgColorInfo` 对应条目的 `hex`）。
 * - 否则返回全局色（`fillColorInfo.svg.hex`）。
 * @returns {string | null} 若找不到，则返回 null。
 */
const getSvgColorHex = (): string | null => {
  const obj = canvas.activeObject.value as any
  if (!obj) return null
  const info = obj.data?.fillColorInfo ?? getFillColorInfo(obj)
  if (!info) return null

  if (canvas.ref.isSvgpreview.value) {
    const id = canvas.ref.svgpreviewId.value?.id
    if (!id) return null
    const item = info.childSvgColorInfo?.find((i: any) => i.id === id)
    return item?.hex?.toUpperCase() ?? null
  }

  return info.svg?.hex?.toUpperCase() ?? null
}

/**
 * 从SVG DOM中获取指定图层的颜色
 * @param {any} obj - 当前激活对象
 * @param {string} layerId - 图层ID
 * @returns {Promise<string>} 颜色HEX值，如果找不到则返回空字符串
 */
async function getColorFromSvgDom(obj: any, layerId: string): Promise<string> {
  if (!obj) return ''
  const svgUrl = obj.fill?.[0]?.url as string
  if (!svgUrl) return ''

  try {
    let svgText = ''
    if (svgUrl.startsWith('data:image/svg+xml,')) {
      svgText = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
    } else {
      const res = await fetch(svgUrl)
      svgText = await res.text()
    }

    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    // 查找指定图层的元素
    const layerElement = doc.querySelector(`[id="${layerId}"]`)
    if (layerElement) {
      // 优先从 data-fill-color 属性读取颜色
      const hex = layerElement.getAttribute('data-fill-color')
      if (hex) return hex.toUpperCase()

      // 如果没有 data-fill-color，尝试从 style 或 fill 属性读取
      const styleFill = layerElement.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1]
      const fillAttr = layerElement.getAttribute('fill')
      const color = styleFill || fillAttr

      if (color && color !== 'none' && !color.startsWith('url(')) {
        return color.toUpperCase()
      }
    }
  } catch (e) {
    console.error('Error reading color from SVG DOM:', e)
  }

  return ''
}

// 定义函数，从SVG DOM 中获取已应用的颜色（读取 data-fill-color）
async function deriveColorsFromSvgDom(): Promise<string[]> {
  const obj = canvas.activeObject.value as any
  if (!obj) return []
  const svgUrl = obj.fill?.[0]?.url as string
  if (!svgUrl) return []

  try {
    let svgText = ''
    if (svgUrl.startsWith('data:image/svg+xml,')) {
      svgText = decodeURIComponent(svgUrl.replace('data:image/svg+xml,', ''))
    } else {
      const res = await fetch(svgUrl)
      svgText = await res.text()
    }
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const nodes = Array.from(doc.querySelectorAll('[data-fill-color]'))
    const set = new Set<string>()
    nodes.forEach((el) => {
      const hex = el.getAttribute('data-fill-color')
      if (hex) set.add(hex.toUpperCase())
    })
    return Array.from(set)
  } catch (e) {
    return []
  }
}

/**
 * 获取当前有效的颜色 HEX（优先使用内存记录，其次解析 SVG DOM 的 `data-fill-color`）。
 * - 若内存（fillColorInfo）已有单一颜色，直接返回。
 * - 若需解析 DOM，且仅检测到一种颜色，返回该颜色（大写）。
 * - 当检测到多种颜色或无法解析时返回 null（此时依然会正常保存样式，只是不记录颜色标签）。
 * @returns {Promise<string | null>} HEX（大写）或 null。
 */
async function getEffectiveSvgHex(): Promise<string | null> {
  const memHex = getSvgColorHex()
  if (memHex) return memHex
  const colors = await deriveColorsFromSvgDom()
  return colors.length === 1 ? colors[0].toUpperCase() : null
}

/**
 * 解析并返回当前激活对象对应的素材ID（多重兜底）
 * @param {any} obj - 当前激活对象
 * @returns {string} 素材ID；可能为空字符串
 */
/**
 * 解析并返回当前激活对象对应的素材ID（多重兜底，含上下文优先级）
 * - 素材详情模式：route.materialId > obj.data(materialId/outId) > url > cache > fallback
 * - 普通编辑模式：obj.data(materialId/outId) > route.materialId > url > cache > fallback
 * @param {any} obj - 当前激活对象
 * @returns {string} 素材ID；可能为空字符串
 */
function resolveCurrentMaterialOutId(obj: any): string {
  const dataId: string = (obj?.data?.materialId || obj?.data?.outId || '') as string
  const urlId: string = parseMaterialIdFromUrl((obj?.fill?.[0]?.url || '') as string) || ''
  const cachedId: string = (activeObjectMaterialIdMap.get(obj as any) || '') as string
  let id: string = dataId || urlId || cachedId || ''
  // 处于素材详情模式时，若未解析到 ID，则回退到路由 materialId（即便是拖拽）
  // 上传面板拖拽通常没有路由 materialId，因此不会误判
  if (!id && isMaterialDetailMode && isValidId(materialId)) {
    id = String(materialId)
  }
  return id
}

let addingStyle = false // 防重入，避免一次点击产生多次保存
let onAddStyle: (isAdd: boolean) => Promise<void>

// 右键添加到style：将当前颜色样式加入列表后，恢复画布到原始颜色
onMounted(() => {
  /**
   * 将当前颜色保存为样式并上传预览封面
   * @param {boolean} isAdd - 是否触发添加样式操作
   * @returns {Promise<void>} 无返回值，完成后刷新样式列表并恢复原始颜色
   * 规则：若当前对象为拖拽上传（data.isDraggedMaterial=true），则禁止添加样式
   */
  onAddStyle = async (isAdd: any) => {
    if (!isAdd) return
    if (addingStyle) return
    addingStyle = true
    try {
      const obj = canvas.activeObject.value as any
      if (!obj) return
      // 拖拽上传的素材禁止添加样式
      const isDragged = !!obj?.data?.isDraggedMaterial
      if (isDragged) {
        Message.warning('拖拽上传的素材不可添加样式')
        addingStyle = false
        return
      }
      // 优化：仅在“上传拖拽且无素材ID”时禁止添加样式
      const resolvedId: string = resolveCurrentMaterialOutId(obj)
      const currentId: string = isValidId(resolvedId) ? resolvedId : ''

      console.log(currentId, 'currentId(resolved)', obj?.data?.materialId, obj?.data?.outId)
      if (!currentId) {
        addingStyle = false
        return
      }
      // 优先使用hasSvgColorChanged检测，它能更好地处理多子图层改色情况
      // hasSvgColorChanged函数已经包含了对全局改色和多子图层改色的完整检测
      const changed = hasSvgColorChanged()
      if (!changed) {
        Message.info('未检测到颜色变更，请先修改颜色')
      } else {
        const currentSvgUrl = obj.fill?.[0]?.url as string
        // 调用图片上传签名，将当前激活元素的 SVG 上传到服务器
        const saveInfo = await auditMaterialApi.getMaterialUploadStyleSignature(currentId)
        styleId.value = saveInfo.styleId // 获取styleId（styleOutId）
        // 注意：不再覆盖全局 materialOutId，避免后续添加样式误用上一个元素ID
        // 上传json以及data（仅针对当前激活对象）
        const jsonUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.data')
        const coverUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.png')
        // console.log(jsonUplod, coverUplod, 'jsonUplod, coverUplod')
        // 将签名 URL 中的板/页 ID 写入覆盖值，确保后续预览与上传路径一致
        {
          /**
           * 同步签名 URL 的板/页 ID 到覆盖值，以统一预览路径。
           * @returns {void} 无返回值
           */
          const parsed = parseBoardPageFromStyleUrl((coverUplod?.url as string) || (jsonUplod?.url as string) || '')
          if (parsed) {
            boardOutIdOverride.value = parsed.boardId ?? boardOutIdOverride.value
            pageOutIdOverride.value = parsed.pageId ?? pageOutIdOverride.value
            overrideAppliedMaterialId.value = currentId
          }
        }
        // 使用当前激活对象进行导出
        const targetObject = obj
        const dataUrlObj = targetObject.toJSON()
        const jsonData = (dataUrlObj.fill as any)[0].url
        // console.log(jsonData, 'base64编码')
        const result = await targetObject.export('png', {
          blob: true,
          trim: false,
          pixelRatio: 4,
          fill: 'transparent'
        })
        await Promise.all([canvasApi.uploadToData(jsonUplod.url, jsonData), canvasApi.uploadToServer(coverUplod.url, result.data)])
        const params = ref({
          styleOutId: styleId.value,
          materialOutId: currentId // 明确使用当前激活元素的素材ID
        })

        /**
         * 保存当前颜色到本地映射（优先内存记录，失败再读DOM）
         * @returns {Promise<void>} 无返回值
         */
        // 获取当前SVG的颜色信息
        const fillInfo = getFillColorInfo(obj)
        // 优先从childSvgColorInfo获取颜色，如果没有则使用主svg的颜色
        const effectiveHex = fillInfo.childSvgColorInfo?.[0]?.hex || fillInfo.svg?.hex
        const hex = effectiveHex
        if (hex) saveStyleColor(styleId.value, hex)

        // 若当前处于局部预览，持久化该样式的图层选择范围
        if (canvas.ref.isSvgpreview.value && canvas.ref.svgpreviewId.value) {
          saveStylePreview(styleId.value, canvas.ref.svgpreviewId.value as { id: string; content: any[] })
        }

        await auditMaterialApi.addMaterialStyle(params.value) // 新增style
        await getStyleList() // 获取样式列表

        // 不再保存完整 SVG 快照到本地缓存，直接使用接口返回的数据渲染
      }

      // 恢复到原始 SVG 颜色
      const fallbackOriginal: string | undefined =
        originalSvgMap.get(obj)?.dataUrl || materialOriginalSvgMap.get(currentId)?.dataUrl || materialOriginalStore.getOriginal(currentId)

      if (fallbackOriginal) {
        const originalContent = decodeURIComponent(fallbackOriginal.replace('data:image/svg+xml,', ''))
        updateSvgUrl(obj as Image, originalContent)
        activeColor.value = 'Mixed'
        currentColor.value = 'Mixed'
        canvas.undoRedo.save()
      } else {
        const url = obj.fill?.[0]?.url as string
        if (url) {
          loadOriginalSvg(url).then(() => {
            const dataUrl = originalSvgMap.get(obj)?.dataUrl
            if (dataUrl) {
              const content = decodeURIComponent(dataUrl.replace('data:image/svg+xml,', ''))
              updateSvgUrl(obj as Image, content)
              activeColor.value = 'Mixed'
              currentColor.value = 'Mixed'
              {
                const info = getFillColorInfo(obj)
                info.svg = null
                info.childSvgColorInfo = null
              }
              canvas.undoRedo.save()
            }
          })
        }
      }
    } finally {
      addingStyle = false
    }
  }
  emitter.on('addStyle', onAddStyle)
})

onUnmounted(() => {
  if (onAddStyle) emitter.off('addStyle', onAddStyle)
})
// 删除style
const handleDeleteStyle = async (id: string) => {
  if (id === 'original') return
  try {
    await auditMaterialApi.deleteMaterialStyle(id)
    removeStyleColor(id)
    removeStylePreview(id)
    await removeStyleSvg(id)
    await getStyleList()
  } catch (error) {
    console.error('删除样式失败:', error)
  }
}

const styleDataUrl = ref('') //style详情签名url
const styleSvgText = ref('') //style详情svg文本
// 获取style详情
const getStyleDetail = async (id: string) => {
  try {
    const res = await auditMaterialApi.getMaterialStyleDetail(id)
    console.log(res, 'style详情')
    styleDataUrl.value = res.sign?.url
    const svgTextFromSign: string | undefined = await loadFromSignUrl(styleDataUrl.value)
    const lower = svgTextFromSign.toLowerCase()
    if (lower.startsWith('data:image/svg+xml,')) {
      styleSvgText.value = decodeURIComponent(svgTextFromSign.replace('data:image/svg+xml,', ''))
    }
  } catch (error) {
    console.error('获取样式详情失败:', error)
  }
}

/**
 * 从 sign.url 加载 SVG 文本（支持 data URL 和远程 URL）
 * @param {string | undefined} url - sign.url
 * @returns {Promise<string | undefined>} SVG 文本或 undefined
 */
const loadFromSignUrl = async (url?: string): Promise<string | undefined> => {
  try {
    if (!url) return undefined
    const res = await fetch(url)
    if (!res.ok) return undefined
    return await res.text()
  } catch (err) {
    console.warn('从 sign.url 加载 SVG 失败:', err)
    return undefined
  }
}

// 选择样式：应用保存的样式或恢复原始
const _handleStyleSelect = async (item: any) => {
  const { canvas, editor } = useEditor()
  const isMultiple = editor.app?.editor?.multiple
  let objectsToProcess: any[] = []
  
  if (isMultiple) {
    // 多选情况：获取所有选中对象
    const list = canvas.app?.editor?.list || []
    if (list.length > 0) {
      objectsToProcess = list
    } else {
      // 如果多选列表为空，尝试使用activeObject
      const singleObj = canvas.activeObject.value as any
      if (singleObj) objectsToProcess = [singleObj]
    }
  } else {
    // 单选情况
    const singleObj = canvas.activeObject.value as any
    if (!singleObj) return
    objectsToProcess = [singleObj]
  }
  
  if (objectsToProcess.length === 0) return

  // 处理单个对象的样式应用
  const applyStyleToObject = async (obj: any) => {
    // 点击原始：恢复到原始 SVG
    if (item?.isOriginal) {
      /**
       * 选择原始时的素材ID解析：优先对象data，其次 URL，再次缓存，最后路由/选中回退
       * @type {string}
       */
      // 统一优先级：data > URL > cache > route
      const currentId: string =
        (obj as any)?.data?.materialId ||
        (obj as any)?.data?.outId ||
        parseMaterialIdFromUrl((obj as any)?.fill?.[0]?.url) ||
        '' ||
        activeObjectMaterialIdMap.get(obj) ||
        '' ||
        (materialId as string) ||
        ''
      const originalUrl =
        materialOriginalStore.getOriginal(currentId) || materialOriginalSvgMap.get(currentId)?.dataUrl || originalSvgMap.get(obj)?.dataUrl

      if (originalUrl) {
        const originalText = decodeURIComponent(originalUrl.replace('data:image/svg+xml,', ''))
        updateSvgUrl(obj as Image, originalText)
        const info = getFillColorInfo(obj)
        info.svg = null
        info.childSvgColorInfo = null
        // 只更新最后一个对象的显示颜色
        if (obj === objectsToProcess[objectsToProcess.length - 1]) {
          activeColor.value = 'Mixed'
          currentColor.value = 'Mixed'
        }
        // 同时更新obj.data中的信息
        if (obj.data) {
          obj.data.fillColorInfo = {
            svg: null,
            childSvgColorInfo: null
          }
        }
      }
      return
    }

    const styleOutId = item?.styleOutId || item?.id
    // 只获取一次样式详情
    if (obj === objectsToProcess[0]) {
      await getStyleDetail(styleOutId)
    }

    // 直接使用接口返回的 SVG 文本进行渲染
    if (styleSvgText.value) {
      // 直接应用样式内的 SVG 内容（完整快照）
      updateSvgUrl(obj as Image, styleSvgText.value)
      const hex = extractDataFillColor(styleSvgText.value)
      const info = getFillColorInfo(obj)
      if (hex) {
        // 如果是混合颜色，设置为Mixed
        if (hex.toLowerCase() === 'mixed') {
          info.svg = null
          // 只更新最后一个对象的显示颜色
          if (obj === objectsToProcess[objectsToProcess.length - 1]) {
            activeColor.value = 'Mixed'
            currentColor.value = 'Mixed'
          }
        } else {
          // 单一颜色的情况
          info.svg = { hex }
          // 只更新最后一个对象的显示颜色
          if (obj === objectsToProcess[objectsToProcess.length - 1]) {
            currentColor.value = hex.toUpperCase()
            activeColor.value = `#${hex.toUpperCase()}`
          }
        }
      } else {
        info.svg = null
        // 只更新最后一个对象的显示颜色
        if (obj === objectsToProcess[objectsToProcess.length - 1]) {
          activeColor.value = 'Mixed'
          currentColor.value = 'Mixed'
        }
      }
      // 清空childSvgColorInfo，因为应用新样式应该使用样式中的颜色
      info.childSvgColorInfo = null

      // 同时更新obj.data中的颜色信息
      if (obj.data) {
        obj.data.fillColorInfo = {
          svg: hex && hex.toLowerCase() !== 'mixed' ? { hex } : null,
          childSvgColorInfo: null
        }
      }
      return
    }

    // 兜底：使用本地记录的颜色重新对原始 SVG 着色
    const hex = (item?.colorHex as string) || undefined
    if (!hex) {
      // 只提示一次
      if (obj === objectsToProcess[0]) {
        Message.info('该样式未包含颜色信息，无法直接应用颜色，请重新保存颜色样式或在预览模式下选择图层后再保存')
      }
      return
    }

    // 获取原始 SVG 文本
    let baseText = ''
    let baseUrl =
      materialOriginalStore.getOriginal(materialId) ||
      materialOriginalSvgMap.get(materialId)?.dataUrl ||
      originalSvgMap.get(obj)?.dataUrl ||
      obj?.fill?.[0]?.url

    try {
      if (typeof baseUrl === 'string') {
        if (baseUrl.startsWith('data:image/svg+xml,')) {
          baseText = decodeURIComponent(baseUrl.replace('data:image/svg+xml,', ''))
        } else {
          const r2 = await fetch(baseUrl)
          baseText = await r2.text()
        }
      }
    } catch {}
    if (!baseText) return

    // 优化并应用颜色滤镜
    const result = optimize(baseText, {
      plugins: ['removeDoctype', 'removeXMLProcInst', 'removeComments', 'removeMetadata', 'removeEditorsNSData', 'cleanupAttrs', 'removeViewBox']
    })
    const optimizedText = 'data' in result ? (result as any).data : baseText
    const matrix = hexToFeColorMatrix(hex.replace('#', ''))
    const hexNoHash = hex.replace('#', '')

    // 优先使用保存样式时记录的局部图层范围（即使当前不在预览模式）
    const savedPreview = readStylePreview(styleOutId)
    if (savedPreview) {
      parseSVGAndSetFilter(optimizedText, matrix, hexNoHash, savedPreview)
      const imgData = obj.data || {}
      imgData.fillColorInfo = imgData.fillColorInfo || {}
      imgData.fillColorInfo.svg = null
      obj.data = imgData
    } else if (canvas.ref.isSvgpreview.value && canvas.ref.svgpreviewId.value) {
      // 若当前处于局部预览模式且 svgpreviewId 存在，则仅对选中图层着色
      parseSVGAndSetFilter(optimizedText, matrix, hexNoHash, canvas.ref.svgpreviewId.value)
      const imgData = obj.data || {}
      imgData.fillColorInfo = imgData.fillColorInfo || {}
      imgData.fillColorInfo.svg = null
      obj.data = imgData
    } else {
      // 全局应用：对所有图层着色
      parseSVGAndSetFilter(optimizedText, matrix, hexNoHash)
    }

    // 更新颜色信息并清空childSvgColorInfo
    const info = getFillColorInfo(obj)
    info.svg = { hex: hexNoHash }
    info.childSvgColorInfo = null

    // 同时更新obj.data中的颜色信息
    if (obj.data) {
      obj.data.fillColorInfo = {
        svg: { hex: hexNoHash },
        childSvgColorInfo: null
      }
    }

    // 只更新最后一个对象的显示颜色
    if (obj === objectsToProcess[objectsToProcess.length - 1]) {
      currentColor.value = hexNoHash.toUpperCase()
      activeColor.value = hex.toUpperCase()
    }
  }

  // 对每个选中对象应用样式
  for (const obj of objectsToProcess) {
    await applyStyleToObject(obj)
  }

  // 所有对象处理完成后保存一次撤销历史
  canvas.undoRedo.save()
}

// 添加防抖功能 避免重复触发
const handleStyleSelect = debounce(_handleStyleSelect, 300)

// 颜色调色板
const palette = ref(['#317EC2', '#825CA6', '#C43E96', '#C03830', '#E7872B', '#5AAA46', '#06948E', '#DB7975', '#A5B352', '#7A97CD'])
// 选中的颜色索引（点击后）
const selectedPaletteIndex = ref(-1)
// 悬停的颜色索引（移入）
const hoverPaletteIndex = ref(-1)
// 当前色块的详细列表
const paletteDetail = ref<string[]>([])

// 生成当前色块的详细列表（深浅变化）
const generateDetailColors = (base: string): string[] => {
  const list: string[] = []
  for (let i = 10; i >= 1; i--) {
    list.push(
      tinycolor(base)
        .darken(i * 5)
        .toHexString()
        .toUpperCase()
    )
  }
  for (let i = 1; i <= 10; i++) {
    list.push(
      tinycolor(base)
        .lighten(i * 5)
        .toHexString()
        .toUpperCase()
    )
  }
  return list
}

// 处理鼠标移入事件
const handleMouseEnter = (index: number) => {
  hoverPaletteIndex.value = index
}

// 处理鼠标移出事件
const handleMouseLeave = () => {
  hoverPaletteIndex.value = -1
}

// 点击色块，显示对应的详细列表
const handleClick = (index: number) => {
  // 再次点击同一色块则关闭详情下拉（toggle行为）
  if (selectedPaletteIndex.value === index) {
    selectedPaletteIndex.value = -1
    paletteDetail.value = []
    return
  }
  selectedPaletteIndex.value = index
  paletteDetail.value = generateDetailColors(palette.value[index])
}

// 选择详细列表中的颜色填充svg
const handleSelectPalette = (index: number) => {
  const hex = paletteDetail.value[index]
  activeColor.value = hex
  currentColor.value = hex.replace('#', '').toUpperCase()
}

// 颜色历史记录（使用上方已声明的 Pinia 响应式 historyColors，并统一转换为 HEX 格式供面板点击）
/**
 * 将任意格式颜色字符串规范化为 HEX（#RRGGBB）用于历史面板点击兼容。
 * 返回 null 表示不可解析的颜色，将在列表中过滤掉。
 * @param {string} input - 颜色字符串（rgba | rgb | hex）
 * @returns {string | null} HEX 格式颜色（#RRGGBB）或 null
 */
const normalizeToHex = (input: string): string | null => {
  try {
    const gc = new GColor(input)
    return gc.hex.toUpperCase()
  } catch {
    return null
  }
}
/**
 * 历史颜色列表：统一转换为 HEX 并去重，过滤不可解析项，避免重复 key 警告
 * @returns {string[]} 去重后的 HEX 颜色列表
 */
const historyColorsList = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  historyColors.value.forEach((c) => {
    const hex = normalizeToHex(c)
    if (hex && !seen.has(hex)) {
      seen.add(hex)
      out.push(hex)
    }
  })
  return out
})

console.log(dragStatus.value, 'dragStatus.value', status)

//预设颜色列表
const presetColors = ref([
  '#000000',
  '#282828',
  '#424242',
  '#585858',
  '#6E6E6E',
  '#838383',
  '#979797',
  '#ACACAC',
  '#C1C1C1',
  '#D5D5D5',
  '#E6E6E6',
  '#EEEEEE',
  '#7B0000',
  '#980A0A',
  '#B01A1A',
  '#BD3535',
  '#D04B4B',
  '#E26464',
  '#EC8282',
  '#F69C9C',
  '#FFB7B7',
  '#FFC6C6',
  '#FFDFDF',
  '#FFEFEF',
  '#6F1F01',
  '#862505',
  '#A2340F',
  '#B94318',
  '#CB552A',
  '#DA663F',
  '#E17F5B',
  '#ED9A7E',
  '#F9BAA6',
  '#FCCEBE',
  '#FFDDD2',
  '#FFEFE9',

  '#6E3B00',
  '#8B4B02',
  '#A55B0B',
  '#B76C0A',
  '#C87F25',
  '#E29B44',
  '#F1B05B',
  '#F9BE77',
  '#FBCF94',
  '#FFDFB4',
  '#FFE8CD',
  '#FFF1E0',
  '#575000',
  '#796D00',
  '#918300',
  '#A29A05',
  '#B0A50B',
  '#C3B539',
  '#D0C44B',
  '#DBD457',
  '#E7E16F',
  '#F6EF8B',
  '#FDFAB8',
  '#FFFDDA',
  '#2E5102',
  '#3A6A07',
  '#467A11',
  '#578B18',
  '#669F1A',
  '#7AB533',
  '#8ECA51',
  '#A3D46F',
  '#C0E39D',
  '#D9F3BF',
  '#E6FFCD',
  '#F1FFE2',

  '#01493E',
  '#005E4D',
  '#0D7062',
  '#167F6F',
  '#2B947F',
  '#42AC99',
  '#5FCDBE',
  '#7CE1D5',
  '#98EADB',
  '#B6EFE3',
  '#D3F7F1',
  '#E9FFFA',
  '#012B41',
  '#004164',
  '#106085',
  '#106E97',
  '#2487B2',
  '#3F9DC6',
  '#62B3D9',
  '#85C8E6',
  '#A2D9ED',
  '#C2E7F8',
  '#D6F3FF',
  '#EAF9FF',
  '#0B2476',
  '#1C3A94',
  '#3754AC',
  '#4C6CC6',
  '#617ED5',
  '#7995E9',
  '#8CA6F4',
  '#A5BAF9',
  '#C2D2FF',
  '#D6E0FF',
  '#E3EBFF',
  '#F1F5FF',

  '#32196A',
  '#4A2D87',
  '#5A3B9C',
  '#6E50B3',
  '#8367CA',
  '#9879DA',
  '#AA8EE6',
  '#BFA8F1',
  '#D2C0FB',
  '#E3D7FD',
  '#EDE6FB',
  '#F5F1FF',
  '#49095D',
  '#602178',
  '#793490',
  '#8F45A8',
  '#A35BBD',
  '#B56ECE',
  '#C889DD',
  '#DAA2EF',
  '#E8C4F4',
  '#F7DDFF',
  '#F8E4FF',
  '#FBF2FF',
  '#56023F',
  '#740857',
  '#8A1D68',
  '#A53180',
  '#BD4B99',
  '#CE69B3',
  '#E188C5',
  '#EFA1D7',
  '#F6B5E2',
  '#FECBED',
  '#FEDCF5',
  '#FDEBF7'
])
</script>

<template>
  <div class="p2 custom-box effect-attr" v-if="isSVg">
    <a-space direction="vertical" style="width: 100%">
      <a-row :gutter="[4, 4]" align="center">
        <a-col :span="18">
          <div style="font-size: 12px; color: #515151">Fill Color</div>
        </a-col>
        <a-space direction="vertical" class="mt5px flex" style="width: 100%">
          <a-col :span="24" class="flex items-center">
            <div class="color-picker-container">
              <custom-color-picker
                :value="activeColor"
                size="mini"
                :trigger-props="triggerProps"
                showPreset
                :presetColors="presetColors"
                :historyColors="historyColorsList"
                class="color-picker-wrapper"
                @change="handleColorChange"
                @mousedown="handleMouseDown"
                @drag-state-change="handleDragStateChange"
              >
                <a-input size="mini" v-model="currentColor" @change="handleCurrentChange" :max-length="6">
                  <template #prefix>
                    <div class="w18px h18px radius" :style="{ backgroundColor: activeColor }" v-if="activeColor != 'Mixed'"></div>
                    <img src="@/assets/images/color.jpg" alt="color" class="w18px h18px radius" v-else />
                  </template>
                </a-input>
              </custom-color-picker>
            </div>
          </a-col>
        </a-space>
        <!-- <a-col :span="24" class="mt10px">
          <div class="title-text">Color Palette</div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between" @mouseleave="handleMouseLeave">
          <div class="palette-box">
            <div
              class="palette-color"
              v-for="(color, index) in palette"
              :key="index"
              :style="{ backgroundColor: color }"
              @mouseenter="handleMouseEnter(index)"
              @click="handleClick(index)"
            >
              <icon-down class="w10px h10px" style="color: #ffffff" v-if="hoverPaletteIndex === index && selectedPaletteIndex < 0" />
              <icon-up class="w10px h10px" style="color: #ffffff" v-if="selectedPaletteIndex === index" />
            </div>
          </div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between" v-if="selectedPaletteIndex >= 0">
          <div class="palette-box palette-detail">
            <div
              class="palette-color"
              v-for="(color, index) in paletteDetail"
              :key="index"
              :style="{ backgroundColor: color }"
              @click="handleSelectPalette(index)"
            ></div>
          </div>
        </a-col> -->
        <!-- style相关 -->
        <template v-if="((activeObject?.tag === 'ClipImg' || activeObject?.tag === 'SimulateElement') && isSameChildren) && (status == '1' || dragStatus == '1') && !shouldHideStyleList">
          <a-col :span="24" class="mt10px">
            <div class="title-text">Style</div>
          </a-col>
          <a-col :span="24" class="flex items-center justify-between">
            <div class="style-list">
              <div class="style-item" v-for="(item, index) in styleList" :key="item.key" @click.stop="handleStyleSelect(item)" :title="item.name">
                <img :src="item.url" class="style-img" />
                <div class="delete-icon" v-if="!item.isOriginal" @click.stop="handleDeleteStyle(item.id)">
                  <img src="@/assets/images/close-btn.png" alt="delete" class="w12px h12px" />
                </div>
              </div>
            </div>
          </a-col>
        </template>
      </a-row>
    </a-space>
  </div>
</template>

<style scoped lang="less">
.effect-attr {
  position: relative;
}
.effect-attr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
}

.custom-box {
  width: 286px;

  :deep(.arco-input-wrapper.arco-input-focus) {
    background: #ededed;
  }

  :deep(.arco-input-wrapper:hover) {
    background: #ededed;
  }
}

.effect-item {
  font-size: 12px;
  color: #515151;
  margin-right: 10px;
}

.effect-content {
  width: 140px;
}

:deep(.arco-slider-btn::after) {
  border: 1px solid #727272;
  z-index: 100;
}

:deep(.arco-slider-bar) {
  background-color: #727272;
}

.radius {
  border-radius: 3px;
  cursor: pointer;
}

.current-color:hover {
  transform: scale(1.2);
  transition: all 0.3s ease;
}

.delete-active {
  border: 1px solid rgb(235, 213, 15);
  box-shadow: 0 0 3px rgb(221, 15, 94);
}

.style-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.style-item {
  width: 48px;
  height: 48px;
  border-radius: 5px;
  background: #fbfbfb;
  box-sizing: border-box;
  border: 1px solid #eaeaea;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;

  &:hover {
    .delete-icon {
      display: block;
    }
  }
  .style-img {
    width: 42px;
    height: 42px;
    object-fit: contain;
  }

  .delete-icon {
    position: absolute;
    right: -5px;
    top: -5px;
    display: none;
  }
}

.more {
  font-size: 12px;
  color: #6b6b6b;
}

.more-item {
  width: 48px;
  height: 48px;
  border-radius: 5px;
  background: #fbfbfb;
  box-sizing: border-box;
  border: 1px solid #eaeaea;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.palette-box {
  width: 100%;
  height: 30px;
  border-radius: 5px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  padding: 0 8px;
  .palette-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
}
.palette-detail {
  width: 100%;
  height: auto;
  box-sizing: border-box;
  padding: 10px 8px;
  border-radius: 5px;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
