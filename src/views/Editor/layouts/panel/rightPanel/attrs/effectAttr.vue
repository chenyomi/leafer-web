<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import { watch, watchEffect, unref, onBeforeUnmount } from 'vue'
import { Modal } from '@arco-design/web-vue'
import { GColor } from '@/utils/color/g-color'
import { useColorStore } from '@/store/modules/color'
import CustomColorPicker from '@/components/arco/color-picker/color-picker.js'
import { formatColor } from '@/views/Editor/utils/formatColor'
import { Image } from 'leafer-ui'
import { UI, Resource } from 'leafer-ui'
import { optimize } from 'svgo'
import { previewSelectSvg } from '@/utils/analysisSvg'
import { debounce } from 'lodash'
import { SimulateAttrController } from '../SimulateTempAttr'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
const isSameChildren = computed(() => {
  simulateAttr.selectCount.value
  // 是否是同一个元素
  return simulateAttr.isSimulateElement.value ? editor.getAttributeValue('data.sourceId') : true
})
const { canvas, editor } = useEditor()

// 定义一个标志变量
let isSystemUpdate = false
const activeColor = ref('Mixed') //颜色选择选中颜色
const activeColorOpacity = ref(100)
const currentColor = ref('Mixed') //当前展示颜色
const historyColors = ref<string[]>(useColorStore().historyColors) //颜色历史记录
const isSVg = ref(false) // 是否是svg图片

// 更新显示颜色的函数 切换活动对象只需要更新颜色即可 不需要重新走一遍改色逻辑
const updateDisplayColor = (color: string) => {
  isSystemUpdate = true
  activeColor.value = color
  setTimeout(() => {
    isSystemUpdate = false
  }, 0)
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
        currentColor.value = svgColor.toUpperCase() || 'Mixed'
        updateDisplayColor('#' + svgColor || 'Mixed')
      }
    }
  },
  { deep: true }
)
// 切换活动对象时，更新图层信息
watch(
  () => canvas.activeObject.value,
  async (newActiveObject, oldActiveObject) => {
    console.log(canvas.activeObject.value.tag)
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
    } else {
      if (!editor.activeObjectIsType('ClipImg', 'CustomCilpImg')) return
      const svgUrl = (newActiveObject as any).fill[0].url as string
      //是否是svg
      if (!svgUrl?.toLowerCase().includes('.svg') && !svgUrl?.toLowerCase().includes('data:image/svg+xml')) {
        isSVg.value = false
        return
      }
      isSVg.value = true
      // 获取 svg整体图层滤镜颜色
      if (newActiveObject.data.fillColorInfo?.svg) {
        currentColor.value = newActiveObject.data.fillColorInfo.svg.hex.toUpperCase()
        updateDisplayColor('#' + newActiveObject.data.fillColorInfo.svg.hex)
      } else {
        // 识别不到颜色 显示 mix
        activeColor.value = 'Mixed'
        currentColor.value = 'Mixed'
      }
    }
  },
  {
    immediate: true
  }
)

// 颜色选择器触发器属性
const triggerProps = ref({
  position: 'lt', //弹出位置
  popupTranslate: [-5, -100] //偏移位置，用于控制面板位置
})

// 拖拽状态变量
const isDragging = ref(false)
const startPosition = ref({ x: 0, y: 0 })
const panelPosition = ref({ x: -5, y: 0 })

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
  //
  if (isSystemUpdate) {
    return
  }
})

const setDebouncedProcessSvg = debounce((watchColor: string, list: any) => {
  editor.dateEdit(
    (e) => {
      const svgUrl = (e as any).fill[0].url as string
      const color = new GColor(watchColor)
      color.alpha = activeColorOpacity.value / 100
      // 更新色值显示
      const hex = color.hex.replace('#', '')
      currentColor.value = hex.toUpperCase()
      // 使用节流函数处理SVG解析和更新
      debouncedProcessSvg(svgUrl, hex, e.innerId)
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
//颜色选择器更改颜色
const handleColorChange = (newVal: string) => {
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
  handleCurrentChange()
}

// 失去焦点时才进行颜色转换
const handleCurrentChange = () => {
  // 防止输入框未移出焦点且切换对象导致元素被错误设置颜色
  if (currentColor.value === 'Mixed') {
    return
  }
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
//监听历史记录
watch(historyColors.value, (newVal) => {
  //保存前8条记录，如果历史记录长度大于8，删除第一个
  if (newVal.length > 8) {
    historyColors.value.pop()
  }
})

//当前操作模式 删除还是添加
const currentMode = ref<'delete' | 'add'>('add')

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
 * @param svgpreviewId 局部填充颜色的图层信息
 */
const parseSVGAndSetFilter = (
  svgText: string,
  fillColor?: string,
  hex?: string,
  svgpreviewId?: { id: string; content: LayerInfo[] },
  id?: number
) => {
  //  mix阻止填充
  if (hex === 'ffffff') return
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
    if (svgpreviewId && svgpreviewId.content) {
      // 获取选中的图层ID列表
      const selectedLayerIds = svgpreviewId.content.map((item) => item.id)
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
          }
        }
      })
    } else {
      // 全局填充，对所有图层应用滤镜
      contentLayers.forEach((layer) => {
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
      if (!result.data.fillColorInfo) {
        result.data.fillColorInfo = {}
      }

      // 初始化 childSvgColorInfo 数组（如果不存在）
      if (!result.data.fillColorInfo.childSvgColorInfo) {
        result.data.fillColorInfo.childSvgColorInfo = []
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
          const existingIndex = result.data.fillColorInfo.childSvgColorInfo.findIndex((item: { id: string }) => item.id === layerInfo.id)

          if (existingIndex !== -1) {
            // 如果存在，则更新颜色相关字段，保留其他字段（如饱和度）
            const existingItem = result.data.fillColorInfo.childSvgColorInfo[existingIndex]

            // 只更新颜色相关字段，保留其他字段
            existingItem.hex = hex
            existingItem.fillColor = fillColor
            // 不要覆盖 saturation 和 saturationFilterId 字段
          } else {
            // 如果不存在，则追加
            result.data.fillColorInfo.childSvgColorInfo.push(colorInfo)
          }
        })
      }
    }

    // 将修改后的 SVG 转换回字符串
    const serializer = new XMLSerializer()
    const modifiedSvgString = serializer.serializeToString(svgDoc)
    // 更新活动对象的 SVG
    result && updateSvgUrl(result as Image, modifiedSvgString)

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
 */
const debouncedProcessSvg = async (svgUrl: string, hex: string, id: number) => {
  // canvas.ref.isSvgpreview.value = false;

  const response = await fetch(svgUrl)

  const svgText = await response.text()
  const svgResult = optimize(svgText, {
    plugins: [
      'removeDoctype', // 移除DOCTYPE声明
      'removeXMLProcInst', // 移除XML处理指令
      'removeComments', // 移除注释
      'removeMetadata', // 移除元数据
      'removeEditorsNSData', // 移除编辑器特定数据
      'cleanupAttrs', // 清理属性
      'removeViewBox' // 移除 viewBox
    ]
  })

  // 检查优化结果是否成功
  if ('data' in svgResult) {
    const fillColor = hexToFeColorMatrix(hex)
    const imgData = canvas.findObjectById(id)

    if (canvas.ref.isSvgpreview.value) {
      parseSVGAndSetFilter(svgResult.data, fillColor, hex, canvas.ref.svgpreviewId.value, id)
      // 清除整体颜色记录
      imgData.data.fillColorInfo.svg = null
    } else {
      parseSVGAndSetFilter(svgResult.data, fillColor, hex, null, id)
      // 初始化或更新fillColorInfo，记录设置颜色并清除局部颜色记录
      imgData.data.fillColorInfo = imgData.data.fillColorInfo || {}
      imgData.data.fillColorInfo.svg = { hex, fillColor }
    }
  }
}

//style相关
const styleListAll = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
const showMore = ref(false)
//如果超出10个，默认展示9个，点击more显示全部
const styleList = computed(() => {
  if (styleListAll.value.length >= 10) {
    return showMore.value ? styleListAll.value : styleListAll.value.slice(0, 9)
  } else {
    showMore.value = true
    return styleListAll.value
  }
})
//点击more显示全部
const handleShowMore = () => {
  showMore.value = !showMore.value
}
onBeforeUnmount(() => {
  // 组件卸载时，清除事件监听
})
</script>

<template>
  <div class="p2 custom-box effect-attr" v-if="isSVg || canvas.activeObject.value.tag === 'SimulateElement'">
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
                class="color-picker-wrapper"
                @change="handleColorChange"
                @mousedown="handleMouseDown"
              >
                <a-input size="mini" v-model="currentColor" :max-length="6">
                  <template #prefix>
                    <div class="w18px h18px radius" :style="{ backgroundColor: activeColor }" v-if="activeColor != 'Mixed'"></div>
                    <img src="@/assets/images/color.jpg" alt="color" class="w18px h18px radius" v-else />
                  </template>
                </a-input>
              </custom-color-picker>
            </div>
          </a-col>
        </a-space>
        <a-col v-if="isSameChildren" :span="24" class="mt0px">
          <div class="title-text">Style</div>
        </a-col>
        <a-col v-if="isSameChildren" :span="24" class="flex items-center justify-between">
          <div class="style-list">
            <div class="style-item" v-for="(item, index) in styleList" :key="index">
              <img src="@/assets/images/dannang.svg" alt="style" class="style-img" />
            </div>
            <!-- 超过10个显示more，只展示9个，点击more显示全部 -->
            <div class="more-item" v-if="!showMore" @click="handleShowMore">
              <div class="more">More</div>
            </div>
          </div>
        </a-col>
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

  &:hover {
    border: 1px solid #868484;
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
</style>
