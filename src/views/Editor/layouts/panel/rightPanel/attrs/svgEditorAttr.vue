<script setup lang="ts">
import Panel from './panel.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { MaterialTypeEnum } from '@/enums/materalType'
import { optimize } from 'svgo'
import { ref, computed, onMounted, watch } from 'vue'
import { Group, Image, IUI, Resource } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'
import { HierarchyService, IHierarchyService } from '@/views/Editor/core/layer/hierarchyService'
import { changeLayerVisibility } from '@/utils/analysisSvg'
import { useSvgCacheStore } from '@/store/modules/svgCache'
import { useUserStore } from '@/store/modules/user'
import { useMaterialType } from '@/hooks/useMaterialType'
import emitter from '@/utils/eventBus'

const { isShow } = useMaterialType()

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息
const role = userInfo.value.roles[0].roleKey

// 定义图层信息接口
interface LayerInfo {
  id: string
  name: string
  type: string
  childCount: number
  paths: number
  visible?: boolean // 添加可见性字段
}

// 扩展IUI接口，添加url属性
interface IUIWithUrl extends IUI {
  url?: string
}

// 扩展合并后的图层接口
interface GroupedLayer {
  name: string
  id: string
  content?: LayerInfo[]
  visible?: boolean // 添加可见性字段
}

const { canvas, editor } = useEditor()
const svgPreviewGroup = ref(null)
const childrenRef = ref<LayerInfo[]>([])
// 记录元素的原始状态
const originalState = ref({
  visible: true,
  locked: false
})

// 高亮状态锁
const isHighlighting = ref(false)

// 使用Pinia store替代Map缓存
const svgCacheStore = useSvgCacheStore()

// 切换活动对象时，更新图层信息
watch(
  () => canvas.activeObject.value,
  async (newActiveObject) => {
    // 当选中为空或选中对象不是 ClipImg 时，清空图层信息以隐藏面板
    if (!newActiveObject || !editor.activeObjectIsType('ClipImg', 'CustomCilpImg')) {
      childrenRef.value = []
      return
    }

    const svgImg = newActiveObject as Image
    const svgUrl = svgImg.fill[0].url as string
    const elementId = newActiveObject.id as string // 获取元素ID

    // 非 SVG 链接（包含普通 .svg 与 base64 data:image/svg+xml）则清空
    const isSvgUrl = typeof svgUrl === 'string' && (svgUrl.toLowerCase().endsWith('.svg') || svgUrl.startsWith('data:image/svg+xml'))
    if (!isSvgUrl) {
      childrenRef.value = []
      return
    }

    // 检查缓存 - 使用URL和元素ID
    if (svgCacheStore.hasCachedSvg(svgUrl, elementId)) {
      childrenRef.value = svgCacheStore.getCachedSvg(svgUrl, elementId)! as any
      //如果有缓存，将图层数据传递到submit页面
      emitter.emit('updateLayerInfo', childrenRef.value)
      // 从图像数据中恢复可见性状态
      if (newActiveObject.data?.visibilityInfo?.childVisibilityInfo) {
        const visibilityInfo = newActiveObject.data.visibilityInfo.childVisibilityInfo
        childrenRef.value.forEach((item) => {
          const info = visibilityInfo.find((info: { id: string }) => info.id === item.id)
          if (info) {
            item.visible = info.visibility
          }
        })
      }

      return
    }

    // 处理SVG
    try {
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
        // 预先创建图层信息数组
        const layerInfos: LayerInfo[] = []
        // 解析 SVG
        const parsedSvg = parseSVGAndSetOpacity(svgResult.data)
        if (!parsedSvg) return

        // 获取所有内容层级的元素
        const layerElements: Element[] = []
        Array.from(parsedSvg.doc.documentElement.children).forEach((child) => {
          const foundLayers = findContentGroups(child)
          layerElements.push(...foundLayers) // 使用展开运算符添加到列表
        })
        layerElements.forEach((element, index) => {
          // 遍历 layerElements
          try {
            // 检查元素是否有我们添加的特殊标识
            const scipixaHidden = element.getAttribute('data-scipixa-hidden')

            // 如果有特殊标识，使用它判断可见性
            let isVisible = scipixaHidden === 'true' ? false : true
            // 解码函数：将类似 _xFF08_ 的编码转换为对应的Unicode字符
            const decodeLayerName = (name: string): string => {
              if (!name) return name

              // 匹配 _x[十六进制]_ 格式的编码
              return name.replace(/_x([0-9A-Fa-f]+)_/g, (match, hex) => {
                try {
                  // 将十六进制转换为十进制，然后转换为对应的Unicode字符
                  const codePoint = parseInt(hex, 16)
                  return String.fromCharCode(codePoint)
                } catch (error) {
                  // 如果转换失败，返回原始字符串
                  return match
                }
              })
            }

            // 获取图层信息
            const rawName = element.getAttribute('data-name') || `未知图层`
            const info = {
              name: decodeLayerName(rawName), // 解码图层名称
              id: element.id || `未知图层`, // 使用元素的 id
              type: element.tagName,
              childCount: element.children.length,
              paths: element.querySelectorAll('path').length,
              visible: isVisible // 根据特殊标识或样式判断可见性
            }

            // 添加到图层信息列表
            layerInfos.push(info as any)
          } catch (err) {}
        })

        // 一次性更新DOM - 重复图层合并并倒序，然后按特定规则排序
        let svgList = groupDataByIdPrefix(layerInfos).reverse() as any
        console.log(svgList, '---svgList11111111')

        // 定义特殊图层的排序顺序
        const specialLayerOrder = ['意-高光', '意-背景', '意-描边']

        // 分离特殊图层和普通图层
        const specialLayers: any[] = []
        const normalLayers: any[] = []

        svgList.forEach((item: any) => {
          if (specialLayerOrder.includes(item.name)) {
            specialLayers.push(item)
          } else {
            normalLayers.push(item)
          }
        })

        // 对特殊图层按指定顺序排序
        specialLayers.sort((a, b) => {
          const indexA = specialLayerOrder.indexOf(a.name)
          const indexB = specialLayerOrder.indexOf(b.name)
          return indexA - indexB
        })

        // 合并数组：普通图层在前，特殊图层在后
        svgList = [...normalLayers, ...specialLayers]
        console.log(svgList, '---svgList')
        childrenRef.value = svgList
        emitter.emit('updateLayerInfo', childrenRef.value)

        // 从图像数据中恢复可见性状态
        if (newActiveObject.data?.visibilityInfo?.childVisibilityInfo) {
          const visibilityInfo = newActiveObject.data.visibilityInfo.childVisibilityInfo
          childrenRef.value.forEach((item) => {
            const info = visibilityInfo.find((info: { id: string }) => info.id === item.id)
            if (info) {
              item.visible = info.visibility
            }
          })
        }

        // 缓存结果到Pinia store，同时保存元素ID
        svgCacheStore.cacheSvg(svgUrl, childrenRef.value, elementId)
      }
    } catch (error) {}
  },
  { immediate: true }
)

// 将重名图层合并
const groupDataByIdPrefix = (data: LayerInfo[]) => {
  const result: GroupedLayer[] = []
  const idMap = new Map()

  data.forEach((item) => {
    // 检查是否已存在该前缀的分组
    if (!idMap.has(item.name)) {
      // 创建新分组对象
      const group: GroupedLayer = {
        name: item.name,
        id: item.id,
        content: [item],
        visible: item.visible // 初始化可见性状态为第一个子图层的状态
      }
      result.push(group)
      idMap.set(item.name, group)
    } else {
      // 获取已存在的分组
      const group = idMap.get(item.name)

      // 将当前项添加到已存在的分组
      group.content.push(item)

      // 如果当前图层是隐藏的，则更新分组的可见性状态
      // 只要有一个子图层是隐藏的，整个分组就标记为隐藏
      if (item.visible === false) {
        group.visible = false
      }
    }
  })

  // 再次遍历所有分组，确保可见性状态正确
  result.forEach((group) => {
    // 检查是否所有子图层都是隐藏的
    const allHidden = group.content.every((item) => item.visible === false)
    // 检查是否有任何子图层是隐藏的
    const anyHidden = group.content.some((item) => item.visible === false)

    // 如果所有子图层都是隐藏的，则整个分组隐藏
    if (allHidden) {
      group.visible = false
    }
    // 如果有任何子图层是隐藏的，则整个分组标记为部分隐藏
    else if (anyHidden) {
      group.visible = false // 或者可以使用一个特殊值表示部分隐藏
    }
    // 否则，所有子图层都是可见的，整个分组可见
    else {
      group.visible = true
    }
  })

  return result
}
const children = computed(() => childrenRef.value)

/**
 * @description 解析 SVG
 * @param svgText SVG 文本内容
 */
const parseSVGAndSetOpacity = (svgText: string) => {
  try {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')

    // 获取所有内容层级的元素
    let contentLayers: Element[] = []

    // 从 SVG 根元素的子元素开始查找可能的内容层包裹层
    Array.from(svgDoc.documentElement.children).forEach((child) => {
      // 调用 findContentGroups 来找到内容层列表
      const foundLayers = findContentGroups(child)
      // 将找到的层级添加到总列表中
      contentLayers = contentLayers.concat(foundLayers)
    })

    // 将修改后的 SVG 文档转换回字符串
    const serializer = new XMLSerializer()
    const modifiedSvgString = serializer.serializeToString(svgDoc)

    return {
      doc: svgDoc,
      string: modifiedSvgString
    }
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
      // 可以在这里过滤掉不想要的子元素类型
      return children.filter((child) => {
        const childTagName = child.tagName.toLowerCase()
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
  return []
}

/**
 * @description: 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间
 * @returns {Function}
 */
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null
  return function (this: any, ...args: any[]) {
    const context = this
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

// svg图层高亮预览
const _handleSelect = async (data: any) => {
  if (isHighlighting.value) return
  isHighlighting.value = true

  try {
    const selectedId = data.content
    // 记录高亮图层 修改图层颜色需要使用
    canvas.ref.svgpreviewId.value = data

    const svgBox = canvas.activeObject.value as Image

    const svgImg = svgBox as any

    // 记录元素的原始状态
    if (!canvas.ref.isSvgpreview.value) {
      originalState.value = {
        visible: svgBox.visible as boolean,
        locked: svgBox.locked
      }
    }
    // 进入预览模式
    canvas.ref.isSvgpreview.value = true

    // 添加失焦事件监听器
    const handleBlur = () => {
      // 删除克隆的SVG
      const existingClone = editor.contentFrame.findOne('.modified-svg')
      if (existingClone) {
        canvas.undoRedo.withoutListen(() => {
          editor.contentFrame.remove(existingClone)
        })
      }
      // 恢复原始SVG状态
      svgBox.visible = originalState.value.visible
      if (!isShow.value) {
        console.log('显示123456')
        svgBox.locked = true
        canvas.ref.isSvgpreview.value = true
      } else {
        console.log('789')
        svgBox.locked = true
        canvas.ref.isSvgpreview.value = true
        // svgBox.locked = originalState.value.locked
        // 退出预览模式
        // canvas.ref.isSvgpreview.value = false
      }

      // 移除失焦事件监听器
      canvas.app.editor.off(EditorEvent.SELECT, handleBlur)
    }

    // 监听失焦事件
    canvas.app.editor.on(EditorEvent.SELECT, handleBlur)

    // 获取SVG内容
    const response = await fetch((svgImg.fill as any[])[0].url)
    const svgText = await response.text()

    // 使用SVGO优化和解析SVG
    const result = optimize(svgText, {
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

    if ('data' in result) {
      // 解析SVG
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(result.data, 'image/svg+xml')

      // 获取所有内容层级的元素
      let contentLayers: Element[] = []
      Array.from(svgDoc.documentElement.children).forEach((child) => {
        const foundLayers = findContentGroups(child)
        contentLayers = contentLayers.concat(foundLayers)
      })

      // 检查是否已存在 defs 元素，如果不存在则创建
      let defsElement = svgDoc.querySelector('defs')
      if (!defsElement) {
        defsElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs')
        svgDoc.documentElement.appendChild(defsElement)
      }

      // 创建一个带透明度的白色滤镜
      const grayFilterId = 'gray-filter-' + Date.now()
      const grayFilterHTML = `
      <filter id="${grayFilterId}" color-interpolation-filters="sRGB">
        <!-- 创建一个接近白色的版本 -->
        <feColorMatrix type="matrix" values="
          0.2 0.2 0.2 0 0.8
          0.2 0.2 0.2 0 0.8
          0.2 0.2 0.2 0 0.8
          0   0   0   1 0
        " result="whitened"/>

        <!-- 混合原始图像和白色版本 -->
        <feBlend in="SourceGraphic" in2="whitened" mode="normal" result="blended"/>

        <!-- 控制混合比例，数值越小原始颜色越明显 -->
        <feComponentTransfer in="blended">
          <feFuncR type="linear" slope="0.3" intercept="0.7"/>
          <feFuncG type="linear" slope="0.3" intercept="0.7"/>
          <feFuncB type="linear" slope="0.3" intercept="0.7"/>
          <feFuncA type="linear" slope="1" intercept="0"/>
        </feComponentTransfer>
      </filter>
    `
      defsElement.innerHTML += grayFilterHTML

      // 应用高亮效果 - 只应用滤镜，不移动图层位置
      if (selectedId) {
        // 为所有图层处理
        contentLayers.forEach((layer) => {
          const layerId = layer.getAttribute('id')
          // 检查当前图层是否在选中列表中
          const isSelected = selectedId.some((item: any) => item.id === layerId)

          if (!isSelected) {
            // 非选中图层应用灰白色滤镜，但保留原有颜色滤镜
            // 保存原始样式
            const currentStyle = (layer as SVGElement).getAttribute('style') || ''

            // 提取现有的filter属性（如果有）
            let existingFilter = ''
            const filterMatch = currentStyle.match(/filter:\s*([^;]+)/)
            if (filterMatch && filterMatch[1]) {
              existingFilter = filterMatch[1]
            }

            // 移除现有的filter属性
            const styleWithoutFilter = currentStyle
              .split(';')
              .filter((style) => !style.trim().startsWith('filter:'))
              .join(';')

            // 组合现有滤镜和新滤镜
            let newFilter = ''
            if (existingFilter && !existingFilter.includes(grayFilterId)) {
              // 如果已有滤镜且不包含当前灰度滤镜，则组合使用
              newFilter = `url(#${grayFilterId}) ${existingFilter}`
            } else {
              // 否则只使用灰度滤镜
              newFilter = `url(#${grayFilterId})`
            }

            // 应用新滤镜
            const newStyle = `${styleWithoutFilter}; filter: ${newFilter}; isolation: isolate;`.trim()
            ;(layer as SVGElement).setAttribute('style', newStyle)

            // 保存原始滤镜信息，以便恢复
            if (currentStyle.includes('filter:')) {
              layer.setAttribute('data-original-filter', currentStyle)
            }
          }
        })
      }

      // 将修改后的SVG转换为字符串
      const serializer = new XMLSerializer()
      const highlightedSvgString = serializer.serializeToString(svgDoc)

      // 克隆原始图片
      const points = svgBox.getLayoutPoints('box', canvas.app.tree)
      //  获取顶层 zIndex
      const topLevel = canvas.hierarchyService.getTopLevel().zIndex
      const modifiedImage = svgImg.clone({
        rotation: svgBox.rotation,
        x: points[0].x,
        y: points[0].y,
        className: 'modified-svg',
        id: 'modified-svg-' + Date.now(),
        draggable: false,
        editable: false,
        visible: true,
        zIndex: topLevel + 1
      })

      const url = 'data:image/svg+xml;base64,' + utf8ToBase64(highlightedSvgString)

      await Resource.loadImage(url).then(() => {
        ;(modifiedImage.fill as any[])[0].url = url
        modifiedImage.set({
          fill: [...(modifiedImage.fill as any[])]
        })

        if (svgBox.scaleX === -1) {
          modifiedImage.scaleX = -1
        }
        // 删除克隆的SVG
        const existingClone = editor.contentFrame.findOne('.modified-svg')
        if (existingClone) {
          canvas.undoRedo.withoutListen(() => {
            editor.contentFrame.remove(existingClone)
          })
        }
        if (!canvas.ref.isSvgpreview.value) return
        // 忽略记录历史操作
        canvas.undoRedo.withoutListen(() => {
          editor.contentFrame.add(modifiedImage)
        })
        //等待渲染完成
        canvas.app.nextRender(() => {
          svgBox.visible = false
          svgBox.locked = true
        })
      })
    }
  } finally {
    isHighlighting.value = false
  }
}

const handleSelect = debounce(_handleSelect, 300)

/**
 * @description 将字符串转换为 base64
 * @param str 要编码的字符串
 */
const utf8ToBase64 = (str: string) => {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt('0x' + p1))
      })
    )
  } catch (e) {
    return ''
  }
}

// 格式化图层ID函数
const formatLayerId = (id: string): string => {
  return id.startsWith('_') ? id.slice(1) : id
}

//=========== 修改图层名称 ==============
// 图层名称编辑
const editInput = ref<HTMLInputElement[]>([])

/**
 * 设置输入框引用的函数
 * @param el 输入框元素
 * @param index 图层索引
 */
const setInputRef = (el: HTMLInputElement | null, index: number) => {
  if (el) {
    // 确保数组长度足够
    while (editInput.value.length <= index) {
      editInput.value.push(null as unknown as HTMLInputElement)
    }
    // 设置对应索引的引用
    editInput.value[index] = el
  }
}

// 自定义指令：自动聚焦
const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
}

//选择图层定时器，阻止双击时会触发单击事件
const clickTimer = ref<number | null>(null)

/**
 * 开始编辑图层名称
 * @param item 当前图层项
 * @param index 图层索引
 * @param e 事件对象
 */
const startEditing = (item: GroupedLayer, index: Number, e: Event) => {
  // 清除已存在的定时器
  if (clickTimer.value) {
    clearTimeout(clickTimer.value)
    clickTimer.value = null
  }
  // 阻止事件冒泡
  e.stopPropagation()

  // 先重置所有图层的编辑状态
  children.value.forEach((layer) => {
    if ((layer as GroupedLayer).isEditing) {
      ;(layer as GroupedLayer).isEditing = false
    }
  })

  // 设置当前图层为编辑状态
  item.isEditing = true

  // 不再重置整个editInput数组，而是通过setInputRef函数动态维护
  // 在nextTick中聚焦当前输入框
  nextTick(() => {
    // 确保输入框元素已经被正确引用
    if (editInput.value && editInput.value[index as number]) {
      editInput.value[index as number].focus()
    } else {
      console.warn('编辑输入框未找到，索引:', index)
    }
  })
}

// 指定不能删除的保护前缀
const protectedPrefix = '意-'
// 检查值是否包含保护字符
const hasProtectedChar = (value: string) => {
  return value.includes(protectedPrefix)
}

//键盘事件
/**
 * 处理键盘事件
 * @param e 键盘事件对象
 * @param item 当前图层项
 * @param index 图层索引
 */
const handleKeydown = (e: KeyboardEvent, item: GroupedLayer, index: Number) => {
  // 检查editInput数组和对应索引的元素是否存在
  if (!editInput.value || !editInput.value[index as number]) {
    console.warn('编辑输入框未找到，索引:', index)
    return
  }

  // 监听删除键（Backspace 和 Delete）
  if ((e as KeyboardEvent).key === 'Backspace' || (e as KeyboardEvent).key === 'Delete') {
    // 获取光标位置
    const target = e.target as HTMLInputElement
    const { selectionStart, selectionEnd } = target

    // 检查删除操作是否会影响保护字符
    const willRemoveProtected = editInput.value[index as number].value.substring(selectionStart, selectionEnd).includes(protectedPrefix)

    // 如果删除操作会移除保护字符，则阻止默认行为
    if (willRemoveProtected) {
      e.preventDefault()
      return
    }

    // 预计算删除后的结果
    let newValue
    if (e.key === 'Backspace') {
      newValue =
        editInput.value[index as number].value.substring(0, selectionStart - 1) + editInput.value[index as number].value.substring(selectionEnd)
    } else {
      newValue =
        editInput.value[index as number].value.substring(0, selectionStart) + editInput.value[index as number].value.substring(selectionEnd + 1)
    }

    // 如果删除后会丢失保护字符，则阻止删除
    if (!hasProtectedChar(newValue)) {
      e.preventDefault()
    }
  }
}
/**
 * 实时监听输入变化，阻止在"意-"前缀前输入内容
 * @param e 输入事件对象
 * @param item 当前图层项
 * @param index 图层索引
 */
const handleInputChange = (e: InputEvent, item: GroupedLayer, index: Number) => {
  // 检查editInput数组和对应索引的元素是否存在
  if (!editInput.value || !editInput.value[index as number]) {
    console.warn('编辑输入框未找到，索引:', index)
    return
  }

  const input = editInput.value[index as number]
  const value = input.value
  const prefixIndex = value.indexOf(protectedPrefix)

  // 如果输入内容中不包含保护前缀，则恢复为"意-"
  if (prefixIndex === -1) {
    input.value = protectedPrefix
    // 将光标设置在"意-"后面
    setTimeout(() => {
      input.setSelectionRange(protectedPrefix.length, protectedPrefix.length)
    }, 0)
    return
  }

  // 如果在"意-"前面输入了内容，则移除前面的内容
  if (prefixIndex > 0) {
    input.value = value.substring(prefixIndex)
    // 将光标设置在"意-"后面
    setTimeout(() => {
      input.setSelectionRange(protectedPrefix.length, protectedPrefix.length)
    }, 0)
  }
}

// 新增：取消编辑时恢复原始值（针对用户未完成编辑的情况）
const cancelEditing = (item: GroupedLayer) => {
  item.isEditing = false
}

/**
 * 完成编辑图层名称
 * @param item 当前图层项
 */
const finishEditing = async (item: GroupedLayer) => {
  // 移除编辑标记
  item.isEditing = false

  // 清理预览状态
  const existingClone = editor.contentFrame.findOne('.modified-svg')
  if (existingClone) {
    canvas.undoRedo.withoutListen(() => {
      editor.contentFrame.remove(existingClone)
    })
  }

  // 恢复原始SVG状态
  const svgBox = canvas.activeObject.value as Group
  if (!svgBox) {
    console.error('无效的 SVG 对象')
    return
  }
  if (canvas.ref.isSvgpreview.value) {
    svgBox.visible = originalState.value.visible
    svgBox.locked = true
    canvas.ref.isSvgpreview.value = true
  }

  const svgImg = svgBox as any
  console.log(svgImg)
  if (!svgImg || !svgImg.fill[0].url) {
    console.error('无效的 SVG 图像或 URL')
    return
  }

  try {
    // 获取 SVG 内容
    const response = await fetch(svgImg.fill[0].url)
    const svgText = await response.text()

    // 解析 SVG
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    // 更新所有相关图层的名称
    item.content.forEach((layer) => {
      const targetElement = svgDoc.getElementById(layer.id)
      if (targetElement) {
        targetElement.setAttribute('data-name', item.name)
        // 同时更新 layer 对象的 name
        layer.name = item.name
      }
    })

    // 将修改后的 SVG 转换回字符串
    const serializer = new XMLSerializer()
    const modifiedSvgString = serializer.serializeToString(svgDoc)

    const url = 'data:image/svg+xml;base64,' + utf8ToBase64(modifiedSvgString)
    // 更新 SVG 图像
    Resource.loadImage(url).then(() => {
      svgImg.fill[0].url = url
      // 定义特殊图层的排序顺序
      const specialLayerOrder = ['意-高光', '意-背景', '意-描边']

      // 分离特殊图层和普通图层
      const specialLayers: any[] = []
      const normalLayers: any[] = []

      childrenRef.value.forEach((item: any) => {
        if (specialLayerOrder.includes(item.name)) {
          specialLayers.push(item)
        } else {
          normalLayers.push(item)
        }
      })

      // 对特殊图层按指定顺序排序
      specialLayers.sort((a, b) => {
        const indexA = specialLayerOrder.indexOf(a.name)
        const indexB = specialLayerOrder.indexOf(b.name)
        return indexA - indexB
      })

      // 合并数组：普通图层在前，特殊图层在后
      const info = [...normalLayers, ...specialLayers]

      // 更新缓存
      svgCacheStore.cacheSvg(svgImg.fill[0].url, info, svgBox.id)
      console.log(info, '---info')
    })
  } catch (error) {
    console.error('更新图层名称失败:', error)
  }
}

// 扩展 GroupedLayer 接口
interface GroupedLayer {
  name: string
  id: string
  content?: LayerInfo[]
  visible?: boolean
  isEditing?: boolean // 添加编辑状态标记
}
</script>

<template>
  <div>
    <Panel hidden-add v-if="children.length && children.length > 1">
      <template #title>
        <div>元素图层</div>
      </template>
      <div class="svg-tree">
        <div
          class="svg-tree-item flex justify-between items-center"
          :class="{
            active: canvas.ref.svgpreviewId.value?.id === item.id && canvas.ref.isSvgpreview.value
          }"
          v-for="(item, index) in children"
          :key="index"
          @click.stop="handleSelect(item)"
        >
          <span @dblclick.stop="startEditing(item, index, $event)" v-if="!(item as any).isEditing">
            {{ item.name }}
          </span>

          <!-- 修改图层名称输入框 -->
          <input
            v-else
            type="text"
            v-model="item.name"
            @blur="finishEditing(item)"
            @keyup.enter="finishEditing(item)"
            @input="(e: any) => handleInputChange(e, item, index)"
            @keyup.esc="cancelEditing(item)"
            @keydown="(e: any) => handleKeydown(e, item, index)"
            :ref="(el: any) => setInputRef(el, index)"
            v-focus
            class="layer-name-input"
          />
          <label class="container" @click.prevent.stop="changeLayerVisibility(!item.visible, item)" v-if="role == 'Painter'">
            <svg
              class="eye"
              xmlns="http://www.w3.org/2000/svg"
              height="1em"
              viewBox="0 0 576 512"
              :style="{ display: item.visible !== false ? 'block' : 'none' }"
            >
              <path
                d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"
              />
            </svg>
            <svg
              class="eye-slash"
              xmlns="http://www.w3.org/2000/svg"
              height="1em"
              viewBox="0 0 640 512"
              :style="{ display: item.visible === false ? 'block' : 'none' }"
            >
              <path
                d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c5.2-11.8 8-24.8 8-38.5c0-53-43-96-96-96c-2.8 0-5.6 .1-8.4 .4c5.3 9.3 8.4 20.1 8.4 31.6c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zm223.1 298L373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9 .5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5z"
              />
            </svg>
          </label>
        </div>
      </div>
    </Panel>
  </div>
</template>

<style scoped lang="less">
.svg-tree {
  padding-left: 10px;

  &-item {
    line-height: 26px;
    cursor: pointer;
    box-sizing: border-box;
    padding: 0 4px;
    border-radius: 4px;

    &:hover {
      background: #f2f4f5;
    }
  }
}

.active {
  background: #f2f4f5;
}

.container {
  --color: #a5a5b0;
  --size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: var(--size);
  user-select: none;
  fill: var(--color);
  width: 30px;
}

.container .eye {
  animation: keyframes-fill 0.5s;
}

.container .eye-slash {
  animation: keyframes-fill 0.5s;
}

/* ------ Animation ------ */
@keyframes keyframes-fill {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  50% {
    transform: scale(1.2);
  }
}
.layer-name-input {
  background: transparent;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  padding: 0 4px;
  width: 120px;
  height: 24px;
  line-height: 24px;
  outline: none;

  &:focus {
    border-color: #165dff;
  }
}
</style>
