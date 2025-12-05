<script setup lang="ts">
import { ref, watch, onUnmounted, computed, onMounted } from 'vue'
import SwipeNumber from '@/components/swipeNumber'
import SvgIcon from '@/components/svgIcon'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useObjectModel } from '@/views/Editor/hooks/useObjectModel'
import { EditorScaleEvent, InnerEditorEvent } from '@leafer-in/editor'
import { throttle } from 'lodash'
import TipContentKey from '@/components/tooltip/tipContentKey.vue'
import { useEditor } from '@/views/Editor/app'
import { isDefined } from '@vueuse/core'

import useUnitStore from '@/store/modules/unit'
import { Group, BoundsEvent } from 'leafer-ui'
import { failResponseWrap } from '@/utils/setup-mock'
import { SimulateAttrController } from '../SimulateTempAttr'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
simulateAttr.updateState()
const isShowCornerStyle = computed(() => {
  return simulateAttr.isShowCornerStyle.value
})
const isShowCountStyle = computed(() => {
  return simulateAttr.isShowCountStyle.value
})
const isShowInnerRadius = computed(() => {
  return simulateAttr.isShowInnerRadius.value
})
const isShowText = computed(() => {
  return simulateAttr.isShowText.value
})
const { canvas, editor } = useEditor()

import { useRoleTheme } from '@/hooks/useRoleTheme'
import { toFile } from 'qrcode'
import { toFixed } from '@/plugins/snapPlugin/snap/utils'
const { themeColor } = useRoleTheme()

const element = canvas.app.editor.element
//监听控制点的操作
const lineWidth = ref(0)
const lineHeight = ref(0)
const handleScale = throttle((arg) => {
  if (canvas.ref.isClip.value) return

  const active = canvas.activeObject.value
  if (['ShapeLine', 'Line', 'CustomCilpImg'].includes(active.tag) || active.name === 'Text') {
    lineWidth.value = active.__layout.boxBounds.width
    active.width = active.__layout.boxBounds.width
    lineHeight.value = active.__layout.boxBounds.height
    active.height = active.__layout.boxBounds.height
  }

  if (active.tag === 'Box' && active.findOne('ShapeLine')) {
    const line = active.findOne('ShapeLine')
    lineWidth.value = Number(line.path[3]) * 2
    lineHeight.value = Number(line.path[4]) * 2
  }
}, 50) // 每50ms最多触发一次
canvas.app.editor.on(EditorScaleEvent.SCALE, handleScale)

//引入单位store
const unitStore = useUnitStore()

const width = useActiveObjectModel('width')
const height = useActiveObjectModel('height')
// const rx = useActiveObjectModel('skewX');
// const ry = useActiveObjectModel('skewY');
const cornerRadius = useActiveObjectModel('cornerRadius', 0) //圆角
const corners = useActiveObjectModel('corners', 0) // Star数量
const sides = useActiveObjectModel('sides', 0) // 多边形边数

const innerRadius = useActiveObjectModel('innerRadius', 0) //内半径
const innerRadius_ = computed(() => {
  return (Number(innerRadius.value.modelValue) * 100).toFixed(0)
})
const islockRatio = ref(true) // 框选元素是否锁定比例
const disText = computed(() => {
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    return isShowText.value
  } else {
    const text = canvas.activeObject.value.findOne('Text')
    if (canvas.activeObject.value.name === 'Text' && text && canvas.app.editor.innerEditing) {
      return true
    } else if (canvas.activeObject.value.tag === 'Text' && !text.data.canChangeBox) {
      return true
    } else {
      return false
    }
  }
})

//获取当前选中元素类型
const tag = computed(() => {
  return canvas.activeObject.value.tag
})

//计算切换单位后的x
const convertedX = computed(() => {
  const obj = canvas.activeObject.value
  // 监听的x，width，height属性的变化，有变化就更新最新数据
  obj.proxyData['x']
  obj.proxyData['width']
  obj.proxyData['height']
  let localX = obj.__local.x
  // 至于这里为什么要加这个发射因为 输入框组件里面只监听的选框的操作，这里是为了多选的情况下点击对齐触发的update:swipeNumber更新是否是Mixed
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    canvas.app.editor.emit('update:swipeNumber')
  }
  if (Math.abs(localX) < 1e-2) localX = 0 // 小于 0.0001 的都视为 0
  return Number(canvas.ruler.convertPxToUnits(localX, unitStore.unit).toFixed(2))
})
const convertedY = computed(() => {
  const obj = canvas.activeObject.value
  obj.proxyData['y']
  obj.proxyData['width']
  obj.proxyData['height']
  let localY = obj.__local.y
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    canvas.app.editor.emit('update:swipeNumber')
  }
  if (Math.abs(localY) < 1e-2) localY = 0 // 小于 0.0001 的都视为 0
  return Number(canvas.ruler.convertPxToUnits(localY, unitStore.unit).toFixed(2))
})
const rotationC = ref(0)
watchEffect(() => {
  // 如果是多选的情况需要统一显示数据
  if (editor.isMultiSelect()) {
    lineWidth.value = editor.getAttributeValue('width')
    lineHeight.value = editor.getAttributeValue('height')
    rotationC.value = editor.getAttributeValue('rotation')
  } else if (canvas.activeObject.value.tag === 'Group' && editor.app.editor.name === 'rotateGroup') {
    // rotateGroup 是在旋转的时候 假编组更新的 如果旋转结束 这个参数也就为空了
    // 这个group判断暂定是用于在多选的时候旋转 之前旋转逻辑里面有 多选旋转编组结束解组 这里判断的group在这个情况下
    // Group的情况下显示组内第一个的rotation 无所谓对错 如果错的就会被 mix覆盖点看不到的
    canvas.activeObject.value.proxyData['rotation']
    rotationC.value = Number((canvas.activeObject.value.children[0].rotation + canvas.activeObject.value.proxyData['rotation']).toFixed(2))
  } else {
    // 新加判断曲线的时候需要到子元素的layout里面的获取宽高进行赋值宽高
    if (
      ['ShapeLine', 'Line', 'CustomCilpImg'].includes(canvas.activeObject.value.tag) ||
      canvas.activeObject.value.name === 'Text' ||
      (canvas.activeObject.value.tag === 'Box' && canvas.activeObject.value.findOne('ShapeLine'))
    ) {
      // 这个加载一次 就用来放初次的宽高ShapeLine吧
      lineWidth.value = canvas.activeObject.value.__layout.boxBounds.width
      lineHeight.value = canvas.activeObject.value.__layout.boxBounds.height
    }
    // 监听rotation，但是更新的值不是在proxyData里面的
    canvas.activeObject.value.proxyData['rotation']
    rotationC.value = Number(canvas.activeObject.value.rotation.toFixed(2))
  }
  // 如果是弧形文字 在圆弧生成以后默认 都开启锁定比例且无法关闭
  if (editor.activeObject.value.name === 'Text') {
    const text = canvas.activeObject.value.findOne('Text')
    if (!(text as any).curveAmount) {
      canvas.activeObject.value.lockRatio = false
    } else {
      canvas.activeObject.value.lockRatio = true
    }
  }
})

//计算切换单位后的width
const convertedWidth = computed(() => {
  if (canvas.activeObject.value.tag === 'SimulateElement') {
    // 使用poxyData中的width，避免频繁调用getAttributeValue
    const width = editor.getAttributeValue('width')
    canvas.activeObject.value.proxyData['width']
    return canvas.ruler.convertPxToUnits(width, unitStore.unit).toFixed(2)
  } else {
    if (['ShapeLine', 'Line', 'CustomCilpImg'].includes(canvas.activeObject.value.tag) || canvas.activeObject.value.name === 'Text')
      return canvas.ruler.convertPxToUnits(lineWidth.value, unitStore.unit).toFixed(2)
    if (canvas.activeObject.value.tag === 'Box' && canvas.activeObject.value.findOne('ShapeLine')) return Number(lineWidth.value).toFixed(2)
    if (!width.value?.modelValue) return 0
    const pxValue = Number(width.value.modelValue)
    return canvas.ruler.convertPxToUnits(pxValue, unitStore.unit).toFixed(2)
  }
})

//计算切换单位后的height
const convertedHeight = computed(() => {
  if (canvas.activeObject.value.app.editor.multiple) {
    // 使用poxyData来显示多选的高度
    const height = editor.getAttributeValue('height')
    canvas.activeObject.value.proxyData['height']
    return canvas.ruler.convertPxToUnits(height, unitStore.unit).toFixed(2)
  } else {
    if (['ShapeLine', 'Line', 'CustomCilpImg'].includes(canvas.activeObject.value.tag) || canvas.activeObject.value.name === 'Text')
      return canvas.ruler.convertPxToUnits(lineHeight.value, unitStore.unit).toFixed(2)
    if (canvas.activeObject.value.tag === 'Box' && canvas.activeObject.value.findOne('ShapeLine')) return Number(lineHeight.value).toFixed(2)
    if (!height.value?.modelValue) return 0
    const pxValue = Number(height.value.modelValue)
    return canvas.ruler.convertPxToUnits(pxValue, unitStore.unit).toFixed(2)
  }
})

// x变更事件
const handleXChange = (value: number) => {
  editor.dateEdit((e) => {
    const bounds = getElementBounds(e)
    if (!bounds) {
      console.warn('handleAlign: 无法获取元素边界')
      return
    }
    const offsetX = value - bounds.minX
    e.x += offsetX
  })
  canvas.undoRedo.save(25)
}

// y变更事件
const handleYChange = (value: number) => {
  editor.dateEdit((e) => {
    const bounds = getElementBounds(e)
    if (!bounds) {
      console.warn('handleAlign: 无法获取元素边界')
      return
    }
    const offsetY = value - bounds.minY
    e.y += offsetY
  })
  canvas.undoRedo.save(23)
}

const rotationChange = (value: number) => {
  if (editor.isMultiSelect()) {
    editor.dateEdit((e) => {
      e.rotateOf('center', Number(value - e.rotation))
    })
  } else {
    editor.dateEdit((e) => {
      canvas.app.editor.rotateOf('center', Number(value - e.rotation))
    })
  }

  canvas.undoRedo.save(26)
}

const changeCornerRadius = (value: number) => {
  editor.dateEdit((e) => {
    e.cornerRadius = Number(value)
  }, 1)
  canvas.undoRedo.save(27)
}

// 宽度变更事件
const handleWidthChangeForLine = (value: number) => {
  editor.dateEdit((e) => {
    if (['ShapeLine', 'Line', 'CustomCilpImg'].includes(e.tag) || e.name === 'Text') {
      const widthValue = canvas.ruler.convertUnitsToPx(value, unitStore.unit)
      e.resizeWidth(widthValue)
      canvas.app.editor.emit('update:swipeNumber')
    } else {
      const widthValue = canvas.ruler.convertUnitsToPx(value, unitStore.unit)
      const r = e.width / e.height
      if (e.tag == 'Box') {
        e.width = widthValue
        e.children[0].width = widthValue
        // 如果box内部是线性圆
        isShapeLineCir(e.children[0], widthValue / 2, 'x')
        if (e.lockRatio) {
          e.height = widthValue / r
          e.children[0].height = widthValue / r
          isShapeLineCir(e.children[0], widthValue / (r * 2), 'y')
          canvas.app.editor.emit('update:swipeNumber')
        }
      } else {
        e.width = widthValue
        if (e.lockRatio) {
          e.height = widthValue / r
          canvas.app.editor.emit('update:swipeNumber')
        }
      }
    }
  })
  // 保存历史操作
  canvas.undoRedo.save(21)
}

// 高度变更事件2 用于Line
const handleHeightChangeForLine = (value: number) => {
  editor.dateEdit((e) => {
    if (['ShapeLine', 'Line', 'CustomCilpImg'].includes(e.tag) || e.name === 'Text') {
      const heightValue = canvas.ruler.convertUnitsToPx(value, unitStore.unit)
      e.resizeHeight(heightValue)
      canvas.app.editor.emit('update:swipeNumber')
    } else {
      const heightValue = canvas.ruler.convertUnitsToPx(value, unitStore.unit)
      const r = e.width / e.height
      if (e.tag == 'Box') {
        e.height = heightValue
        e.children[0].height = heightValue
        // 如果box内部是线性圆
        isShapeLineCir(e.children[0], heightValue / 2, 'y')
        if (e.lockRatio) {
          e.width = heightValue * r
          e.children[0].width = heightValue * r
          isShapeLineCir(e.children[0], (heightValue * r) / 2, 'x')
          canvas.app.editor.emit('update:swipeNumber')
        }
      } else {
        e.height = heightValue
        if (e.lockRatio) {
          e.width = heightValue * r
          canvas.app.editor.emit('update:swipeNumber')
        }
      }
    }
  })
  // 保存历史操作
  canvas.undoRedo.save(24)
}


const isShapeLineCir = (e: any, val: number, key: 'x' | 'y') => {
  if (!['圆环1', '圆环2', '圆环3', '圆环4'].includes(e?.name)) return

  // 安全转换 path => 数组
  let pointArr = Array.isArray(e.path) ? [...e.path] : String(e.path).split(' ')

  // map key 到坐标索引
  const indexMap: Record<'x' | 'y', number> = {
    x: 3,
    y: 4
  }
  if(key === 'x') {
    lineWidth.value = val * 2
  }
  if(key === 'y') {
    lineHeight.value = val * 2
  }
  const idx = indexMap[key]
  pointArr[idx] = val

  // 更新对象坐标
  e[key] = val

  // 写回 path
  e.path = Array.isArray(e.path) ? pointArr : pointArr.join(' ')
}

/**
 * 更新编组尺寸信息
 *
 * @description
 * 获取当前活动对象（编组）的布局边界，并更新 groupW 和 groupH 的值
 * 用于在界面上显示编组的实际宽高
 *
 * 由于编组的宽高不是响应式的，需要手动获取并更新到响应式变量中
 * 这样在UI中才能正确显示编组的尺寸
 */
const changeSizeGroup = () => {
  // 获取包围盒尺寸
  const { width, height } = canvas.activeObject.value?.getLayoutBounds('box', 'local', true)
  canvas.activeObject.value.proxyData.width = +width.toFixed(2)
  canvas.activeObject.value.proxyData.height = +height.toFixed(2)
}

// 对齐方式
/**
 * 获取元素的实际边界（考虑旋转变换）
 *
 * 解决问题：
 * - 旋转元素使用基本属性（x, y, width, height）进行对齐计算时不准确
 * - 需要基于元素的实际视觉边界（OBB - Oriented Bounding Box）进行对齐
 *
 * 实现原理：
 * - 使用 Leafer.js 的 getLayoutPoints('box', tree) 方法获取元素的四个角点
 * - 这些角点已经考虑了所有变换（包括旋转、缩放、倾斜等）
 * - 通过角点计算出实际的边界框，确保对齐操作基于真实的视觉边界
 *
 * @param {any} element - Leafer.js 元素对象，需要计算边界的元素
 * @returns {Object|null} 包含实际边界信息的对象，如果计算失败返回null
 * @returns {number} returns.minX - 实际边界的最小X坐标
 * @returns {number} returns.maxX - 实际边界的最大X坐标
 * @returns {number} returns.minY - 实际边界的最小Y坐标
 * @returns {number} returns.maxY - 实际边界的最大Y坐标
 * @returns {number} returns.width - 实际边界的宽度
 * @returns {number} returns.height - 实际边界的高度
 * @returns {number} returns.centerX - 实际边界的中心X坐标
 * @returns {number} returns.centerY - 实际边界的中心Y坐标
 *
 * @example
 * // 获取旋转元素的实际边界
 * const element = canvas.activeObject.value
 * const bounds = getElementBounds(element)
 * if (bounds) {
 *   console.log(`元素实际宽度: ${bounds.width}, 高度: ${bounds.height}`)
 * }
 */
const getElementBounds = (element: any) => {
  // 安全检查：确保元素存在且具有必要的方法
  if (!element || typeof element.getLayoutPoints !== 'function') {
    console.warn('getElementBounds: 无效的元素对象或缺少getLayoutPoints方法')
    return null
  }

  try {
    // 获取元素的四个角点（考虑旋转变换）
    const layoutPoints = element.getLayoutPoints('box', canvas.app.tree)

    // 验证返回的角点数据
    if (!layoutPoints || !Array.isArray(layoutPoints) || layoutPoints.length < 4) {
      console.warn('getElementBounds: 获取的布局点数据无效')
      return null
    }

    // 验证每个点都有有效的x和y坐标
    const validPoints = layoutPoints.filter(
      (point) => point && typeof point.x === 'number' && typeof point.y === 'number' && !isNaN(point.x) && !isNaN(point.y)
    )

    if (validPoints.length < 4) {
      console.warn('getElementBounds: 布局点坐标数据无效')
      return null
    }

    // 计算实际边界
    const xs = validPoints.map((point: any) => point.x)
    const ys = validPoints.map((point: any) => point.y)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // 验证计算结果的有效性
    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
      console.warn('getElementBounds: 边界计算结果无效')
      return null
    }

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  } catch (error) {
    console.error('getElementBounds: 计算元素边界时发生错误', error)
    return null
  }
}

/**
 * 处理元素对齐操作（已重构以支持旋转元素的精确对齐）
 *
 * 修复内容：
 * - 原实现使用元素的轴对齐边界框（AABB）进行计算，旋转后不准确
 * - 新实现使用 getElementBounds 函数获取考虑旋转变换的实际边界（OBB）
 * - 通过偏移量（offset）方式调整元素位置，而非直接设置坐标
 *
 * 功能特性：
 * 1. 单元素对齐：相对于画布边界进行对齐
 * 2. 多元素对齐：以最边缘元素为基准进行对齐
 * 3. 分布操作：在保持首尾元素位置不变的前提下，均匀分布中间元素
 * 4. 旋转支持：所有操作都基于元素的实际视觉边界
 *
 * 算法说明：
 * - 对齐操作：计算目标位置与当前位置的偏移量，通过修改元素的 x/y 属性实现
 * - 分布操作：按位置排序元素，计算总空间和元素占用空间，均匀分配剩余空间
 *
 * @param {string} align - 对齐类型
 *   - 'left': 左对齐 - 将元素的左边界对齐
 *   - 'center': 水平居中对齐 - 将元素的水平中心对齐
 *   - 'right': 右对齐 - 将元素的右边界对齐
 *   - 'top': 上对齐 - 将元素的上边界对齐
 *   - 'middle': 垂直居中对齐 - 将元素的垂直中心对齐
 *   - 'bottom': 下对齐 - 将元素的下边界对齐
 *   - 'distribute_vertical': 垂直等距分布 - 在垂直方向上均匀分布元素（需要至少3个元素）
 *   - 'distribute_horizontal': 水平等距分布 - 在水平方向上均匀分布元素（需要至少3个元素）
 *
 * @example
 * // 左对齐选中的元素
 * handleAlign('left')
 *
 * // 垂直等距分布（需要选中至少3个元素）
 * handleAlign('distribute_vertical')
 *
 * @throws {void} 分布操作在元素数量少于3个时会直接返回，不执行任何操作
 */
// 用于存储固定的选框边界，避免连续对齐操作时边界变化
let fixedBounds: any = null

// 监听选择变化事件，重置固定边界
const resetFixedBounds = () => {
  fixedBounds = null
}

// 在组件挂载时添加选择事件监听
onMounted(() => {
  if (canvas?.app?.editor) {
    canvas.app.editor.on('select', resetFixedBounds)
  }
})

// 在组件卸载时移除事件监听
onUnmounted(() => {
  if (canvas?.app?.editor) {
    canvas.app.editor.off('select', resetFixedBounds)
  }
})

const handleAlign = (align: string) => {
  if (isTextInnerEditor.value) return
  // 获取当前选中的对象
  const activeObject = editor.getActiveObject()
  // 获取所有选中的对象
  const selectedObjects = editor.getActiveObjects()

  // 安全检查：确保有选中的对象
  if (!selectedObjects || selectedObjects.length === 0) {
    console.warn('handleAlign: 没有选中的对象')
    return
  }

  // 如果是新的选择操作或者没有固定边界，则重新获取并固定边界
  // 这里通过检查选中对象的数量变化来判断是否为新的选择
  const currentSelectionKey = selectedObjects
    .map((obj) => obj.innerId || obj.id)
    .sort()
    .join(',')
  const storedSelectionKey = fixedBounds?.selectionKey

  if (!fixedBounds || currentSelectionKey !== storedSelectionKey) {
    // 获取当前选框的边界并固定它
    const currentBounds = canvas.app.editor.selector.getBounds()
    if (!currentBounds) {
      console.warn('handleAlign: 无法获取选框边界')
      return
    }

    // 深拷贝边界对象，避免引用问题
    fixedBounds = {
      x: currentBounds.x,
      y: currentBounds.y,
      width: currentBounds.width,
      height: currentBounds.height,
      selectionKey: currentSelectionKey
    }
  }

  // 使用固定的边界进行对齐计算
  const bounds = fixedBounds

  // 获取画布宽高
  const canvasWidth = canvas.contentFrame.width
  const canvasHeight = canvas.contentFrame.height

  // 验证画布尺寸
  if (!canvasWidth || !canvasHeight || canvasWidth <= 0 || canvasHeight <= 0) {
    console.warn('handleAlign: 画布尺寸无效')
    return
  }

  switch (align) {
    // 左对齐
    case 'left':
      //单个元素左对齐
      if (selectedObjects.length === 1) {
        if (!activeObject) {
          console.warn('handleAlign: 单个元素对齐时activeObject为空')
          return
        }
        const bounds = getElementBounds(activeObject)
        if (!bounds) {
          console.warn('handleAlign: 无法获取元素边界')
          return
        }
        const offsetX = 0 - bounds.minX
        activeObject.x += offsetX
      } else {
        //多个元素左对齐 - 基于固定选框边界
        if (!bounds) {
          console.warn('handleAlign: 无法获取选框边界')
          return
        }
        const pos = canvas.app.tree.getInnerPoint({
          x: bounds.x,
          y: bounds.y
        })
        const targetX = pos.x

        // 将所有元素的左边与选框左边对齐
        for (const element of selectedObjects) {
          if (!element) continue // 跳过空元素

          const elementBounds = getElementBounds(element)
          if (!elementBounds) {
            console.warn('handleAlign: 跳过无法获取边界的元素')
            continue
          }

          const offsetX = targetX - elementBounds.minX
          element.x += offsetX
        }
      }
      break
    // 水平居中对齐
    case 'center':
      //单个元素水平居中对齐
      if (selectedObjects.length === 1) {
        if (!activeObject) {
          console.warn('handleAlign: 单个元素对齐时activeObject为空')
          return
        }
        const bounds = getElementBounds(activeObject)
        if (!bounds) {
          console.warn('handleAlign: 无法获取元素边界')
          return
        }
        const canvasCenterX = canvasWidth / 2
        const offsetX = canvasCenterX - bounds.centerX
        activeObject.x += offsetX
      } else {
        //多个元素水平居中对齐 - 基于固定选框边界
        if (!bounds) {
          console.warn('handleAlign: 无法获取选框边界')
          return
        }
        const pos = canvas.app.tree.getInnerPoint({
          x: bounds.x,
          y: bounds.y
        })
        const targetCenterX = pos.x + bounds.width / canvas.getZoom() / 2

        // 将所有元素的中心与选框中心对齐
        for (const element of selectedObjects) {
          if (!element) continue // 跳过空元素

          const elementBounds = getElementBounds(element)
          if (!elementBounds) {
            console.warn('handleAlign: 跳过无法获取边界的元素')
            continue
          }

          const elementCenterX = elementBounds.width / 2
          const offsetX = targetCenterX - elementCenterX
          element.x = offsetX
        }
      }
      break
    // 右对齐
    case 'right':
      //单个元素右对齐
      if (selectedObjects.length === 1) {
        if (!activeObject) {
          console.warn('handleAlign: 单个元素对齐时activeObject为空')
          return
        }
        const bounds = getElementBounds(activeObject)
        if (!bounds) {
          console.warn('handleAlign: 无法获取元素边界')
          return
        }
        const offsetX = canvasWidth - bounds.maxX
        activeObject.x += offsetX
      } else {
        //多个元素右对齐 - 基于固定选框边界
        if (!bounds) {
          console.warn('handleAlign: 无法获取选框边界')
          return
        }
        const pos = canvas.app.tree.getInnerPoint({
          x: bounds.x,
          y: bounds.y
        })
        const targetRightX = pos.x + bounds.width / canvas.getZoom()

        // 将所有元素的右边与选框右边对齐
        for (const element of selectedObjects) {
          if (!element) continue // 跳过空元素

          const elementBounds = getElementBounds(element)
          if (!elementBounds) {
            console.warn('handleAlign: 跳过无法获取边界的元素')
            continue
          }

          const offsetX = targetRightX - elementBounds.width
          element.x = offsetX
        }
      }
      break
    // 上对齐
    case 'top':
      //单个元素上对齐
      if (selectedObjects.length === 1) {
        if (!activeObject) {
          console.warn('handleAlign: 单个元素对齐时activeObject为空')
          return
        }
        const bounds = getElementBounds(activeObject)
        if (!bounds) {
          console.warn('handleAlign: 无法获取元素边界')
          return
        }
        const offsetY = 0 - bounds.minY
        activeObject.y += offsetY
      } else {
        //多个元素上对齐 - 基于固定选框边界
        if (!bounds) {
          console.warn('handleAlign: 无法获取选框边界')
          return
        }
        const pos = canvas.app.tree.getInnerPoint({
          x: bounds.x,
          y: bounds.y
        })
        const targetY = pos.y

        // 将所有元素的上边与选框上边对齐
        for (const element of selectedObjects) {
          if (!element) continue // 跳过空元素

          const elementBounds = getElementBounds(element)
          if (!elementBounds) {
            console.warn('handleAlign: 跳过无法获取边界的元素')
            continue
          }

          const offsetY = targetY - elementBounds.minY
          element.y += offsetY
        }
      }
      break
    // 垂直居中对齐
    case 'middle':
      //单个元素垂直居中对齐
      if (selectedObjects.length === 1) {
        if (!activeObject) {
          console.warn('handleAlign: 单个元素对齐时activeObject为空')
          return
        }
        const bounds = getElementBounds(activeObject)
        if (!bounds) {
          console.warn('handleAlign: 无法获取元素边界')
          return
        }
        const canvasCenterY = canvasHeight / 2
        const offsetY = canvasCenterY - bounds.centerY
        activeObject.y += offsetY
      } else {
        //多个元素垂直居中对齐 - 基于固定选框边界
        if (!bounds) {
          console.warn('handleAlign: 无法获取选框边界')
          return
        }
        const pos = canvas.app.tree.getInnerPoint({
          x: bounds.x,
          y: bounds.y
        })
        const targetCenterY = pos.y + bounds.height / canvas.getZoom() / 2

        // 将所有元素的中心与选框垂直中心对齐
        for (const element of selectedObjects) {
          if (!element) continue // 跳过空元素

          const elementBounds = getElementBounds(element)
          if (!elementBounds) {
            console.warn('handleAlign: 跳过无法获取边界的元素')
            continue
          }

          const elementCenterY = elementBounds.height / 2
          const offsetY = targetCenterY - elementCenterY
          element.y = offsetY
        }
      }
      break
    // 下对齐
    case 'bottom':
      //单个元素下对齐
      if (selectedObjects.length === 1) {
        if (!activeObject) {
          console.warn('handleAlign: 单个元素对齐时activeObject为空')
          return
        }
        const bounds = getElementBounds(activeObject)
        if (!bounds) {
          console.warn('handleAlign: 无法获取元素边界')
          return
        }
        const offsetY = canvasHeight - bounds.maxY
        activeObject.y += offsetY
      } else {
        //多个元素下对齐 - 基于固定选框边界
        if (!bounds) {
          console.warn('handleAlign: 无法获取选框边界')
          return
        }
        const pos = canvas.app.tree.getInnerPoint({
          x: bounds.x,
          y: bounds.y
        })
        const targetBottomY = pos.y + bounds.height / canvas.getZoom()
        // 将所有元素的下边与选框下边对齐
        for (const element of selectedObjects) {
          if (!element) continue // 跳过空元素

          const elementBounds = getElementBounds(element)
          if (!elementBounds) {
            console.warn('handleAlign: 跳过无法获取边界的元素')
            continue
          }

          const offsetY = targetBottomY - elementBounds.height
          element.y = offsetY
        }
      }
      break
    // 垂直等距分布
    case 'distribute_vertical':
      if (selectedObjects.length < 3) {
        console.warn('handleAlign: 垂直分布至少需要3个对象')
        return // 至少需要3个对象才能进行分布
      }

      // 获取所有元素的实际边界并按Y坐标排序
      const elementsWithBoundsV = selectedObjects
        .map((element) => {
          if (!element) return null
          const bounds = getElementBounds(element)
          return bounds ? { element, bounds } : null
        })
        .filter((item) => item !== null) // 过滤掉无效元素

      if (elementsWithBoundsV.length < 3) {
        console.warn('handleAlign: 有效元素数量不足，无法进行垂直分布')
        return
      }

      const sortedElementsV = elementsWithBoundsV.sort((a, b) => a.bounds.minY - b.bounds.minY)

      // 计算总高度和间距
      const firstMinY = sortedElementsV[0].bounds.minY
      const lastMaxY = sortedElementsV[sortedElementsV.length - 1].bounds.maxY
      const totalHeight = lastMaxY - firstMinY

      // 计算所有元素的总高度
      const elementsHeight = sortedElementsV.reduce((sum, item) => sum + item.bounds.height, 0)

      // 计算间距
      const spacing = (totalHeight - elementsHeight) / (sortedElementsV.length - 1)

      // 重新分布元素
      let currentY = firstMinY
      for (const item of sortedElementsV) {
        const offsetY = currentY - item.bounds.minY
        item.element.y += offsetY
        currentY += item.bounds.height + spacing
      }
      break
    // 水平等距分布
    case 'distribute_horizontal':
      if (selectedObjects.length < 3) {
        console.warn('handleAlign: 水平分布至少需要3个对象')
        return // 至少需要3个对象才能进行分布
      }

      // 获取所有元素的实际边界并按X坐标排序
      const elementsWithBoundsH = selectedObjects
        .map((element) => {
          if (!element) return null
          const bounds = getElementBounds(element)
          return bounds ? { element, bounds } : null
        })
        .filter((item) => item !== null) // 过滤掉无效元素

      if (elementsWithBoundsH.length < 3) {
        console.warn('handleAlign: 有效元素数量不足，无法进行水平分布')
        return
      }

      const sortedElementsH = elementsWithBoundsH.sort((a, b) => a.bounds.minX - b.bounds.minX)

      // 计算总宽度和间距
      const firstMinX = sortedElementsH[0].bounds.minX
      const lastMaxX = sortedElementsH[sortedElementsH.length - 1].bounds.maxX
      const totalWidth = lastMaxX - firstMinX

      // 计算所有元素的总宽度
      const elementsWidth = sortedElementsH.reduce((sum, item) => sum + item.bounds.width, 0)

      // 计算间距
      const spacingH = (totalWidth - elementsWidth) / (sortedElementsH.length - 1)

      // 重新分布元素
      let currentX = firstMinX
      for (const item of sortedElementsH) {
        const offsetX = currentX - item.bounds.minX
        item.element.x += offsetX
        currentX += item.bounds.width + spacingH
      }
      break
    default:
      console.warn(`handleAlign: 未知的对齐类型: ${align}`)
      break
  }

  // 对齐操作完成后，更新选框边界
  try {
    canvas.app.editor.updateEditBox()

    // 对齐操作完成后，更新固定边界以反映新的选框状态
    // 这样下次对齐操作将基于当前的选框边界
    const newBounds = canvas.app.editor.selector.getBounds()
    if (newBounds && fixedBounds) {
      fixedBounds.x = newBounds.x
      fixedBounds.y = newBounds.y
      fixedBounds.width = newBounds.width
      fixedBounds.height = newBounds.height
    }
  } catch (error) {
    console.warn('handleAlign: 更新选框边界失败', error)
  }

  // 保存操作历史（如果需要）
  try {
    canvas.undoRedo.save(30) // 使用适当的操作类型ID
  } catch (error) {
    console.warn('handleAlign: 保存操作历史失败', error)
  }
}

// 等比拉伸缩放状态切换
const handleRatio = () => {
  const activeObject = editor.getActiveObject()
  // 弧形文字禁止修改isRatio
  if (activeObject.name === 'Text') {
    const text = activeObject.findOne('Text')
    if (text && ((text as any).curveAmount > 0 || (text as any).curveAmount < 0)) {
      return
    }
  }
  activeObject.lockRatio = !activeObject.lockRatio
  // console.log(activeObject.lockRatio, '---activeObject')
  // console.log(editor.activeObject.value.lockRatio, '---editor.activeObject.value.lockRatio')
  console.log(canvas.app.editor.element, '---activeObject.lockRatio!!!!!')
}
const isCirAndSimulate = computed(() => {
  const editor = canvas?.app?.editor
  const leaf = editor?.leafList?.list?.[0]
  const dom = leaf?.findOne?.('ShapeLine')
  return dom?.name === '圆环4'
})
/**
 * 监听活动group对象变化 因为 group宽高不是响应式需要手动更新
 * 当活动对象变化时，更新事件监听器和相关状态
 *
 * @description
 * 1. 移除旧活动对象的尺寸调整事件监听
 * 2. 如果新活动对象是编组类型，则添加尺寸调整事件监听
 * 3. 当编组尺寸变化时，通过 changeSizeGroup 函数更新尺寸显示
 *
 * @param {Object} newActiveObject - 新的活动对象
 * @param {Object} oldActiveObject - 旧的活动对象
 */
watch(
  () => canvas.activeObject.value,
  async (newActiveObject, oldActiveObject) => {
    if (oldActiveObject) {
      oldActiveObject.off(BoundsEvent.RESIZE, changeSizeGroup)
    }
    if (editor.activeObjectIsType('Group')) {
      changeSizeGroup()
      newActiveObject.on(BoundsEvent.RESIZE, changeSizeGroup)
    }
    // 临时框选 也需要默认锁定比例
    if (editor.activeObjectIsType('SimulateElement')) {
      if (isCirAndSimulate.value) return
      newActiveObject.set({
        lockRatio: true
      })
    }
  },
  {
    immediate: true
  }
)
const maxRedius = computed(() => {
  return canvas.ruler.convertPxToUnits((canvas.activeObject.value.findOne('ShapeRect') as any)?.maxRadius ?? 100, unitStore.unit)
})
const maxRediusValue = computed(() => {
  if (editor.isMultiSelect) {
    return canvas.ruler.convertPxToUnits(Number(editor.getAttributeValue('cornerRadius')) || 0, unitStore.unit)
  } else {
    return canvas.ruler.convertPxToUnits(Number(editor.getAttributeValue('cornerRadius')), unitStore.unit)
  }
})
const maxRediusChange = (val: any) => {
  if (editor.isMultiSelect) {
    editor.dateEdit((e) => {
      console.log(e)
      e.findOne('ShapePolygon') && (e.findOne('ShapePolygon').cornerRadius = Number(val)) //多边形修改圆角
      e.findOne('ShapeStar') && (e.findOne('ShapeStar').cornerRadius = Number(val)) // 五角星修改圆角
      e.findOne('ShapeRect') && (e.findOne('ShapeRect').cornerRadius = Number(val)) // 矩形修改圆角
    })
  } else {
    cornerRadius.value.onChange(canvas.ruler.convertUnitsToPx(val, unitStore.unit))
  }
  canvas.undoRedo.save(27)
}
const isTextInnerEditor = computed(() => {
  return canvas.activeObject.value.tag === 'Text' && canvas.app.editor.innerEditing
})

const isLineInEdit = computed(() => {
  return canvas.activeObject.value.tag === 'Line' && canvas.ref.isInnerEditor.value
})
const count = computed(() => {
  return Number(editor.getAttributeValue('corners|sides', 0))
})
const countChange = (val: number) => {
  editor.dateEdit((e) => {
    console.log(e)
    e.findOne('ShapePolygon') && (e.findOne('ShapePolygon').sides = Number(val))
    e.findOne('ShapeStar') && (e.findOne('ShapeStar').corners = Number(val))
  })
  canvas.undoRedo.save(29)
}
const innerRadiusChange = (val: number) => {
  editor.dateEdit((e) => {
    e.findOne('ShapeStar') && (e.findOne('ShapeStar').innerRadius = Number(val / 100))
  })
  canvas.undoRedo.save(30)
}
</script>
<template>
  <div class="p2 custom-box base-attr" :style="{ '--role-theme-color': themeColor }">
    <a-row :gutter="[4, 4]" align="center">
      <!-- 位置 -->
      <a-col :span="18">
        <div class="title-text">Position and Rotate</div>
      </a-col>
      <a-col :span="24" class="input-container">
        <a-row :gutter="5">
          <a-col :span="8">
            <SwipeNumber
              size="mini"
              label="X"
              sim-key="x"
              :model-value="Number(convertedX)"
              @change="handleXChange"
              :is-unit="false"
              :disabled="canvas.ref.isClip.value || isTextInnerEditor || isLineInEdit"
              :hide-button="false"
            />
          </a-col>
          <a-col :span="8">
            <SwipeNumber
              size="mini"
              label="Y"
              sim-key="y"
              :model-value="Number(convertedY)"
              @change="handleYChange"
              :is-unit="false"
              :disabled="canvas.ref.isClip.value || isTextInnerEditor || isLineInEdit"
              :hide-button="false"
            />
          </a-col>
          <a-col :span="8">
            <SwipeNumber
              size="mini"
              sim-key="rotation"
              :model-value="Number(rotationC)"
              @change="rotationChange"
              :disabled="canvas.ref.isClip.value || isTextInnerEditor || isLineInEdit"
              :hide-button="false"
            >
              <template #label>
                <SvgIcon name="rotation" />
              </template>
              <template #suffix>
                <div class="absolute top-1 right-1">°</div>
              </template>
            </SwipeNumber>
          </a-col>
        </a-row>
      </a-col>
      <!-- 对齐方式 -->
      <a-col :span="18" class="mt5px" v-if="!editor.activeObjectIsType('Pen') && !isLineInEdit">
        <div class="title-text">Alignment</div>
      </a-col>
      <a-col :span="24" v-if="!editor.activeObjectIsType('Pen') && !isLineInEdit">
        <a-space size="mini" style="height: 20px; width: 100%; display: flex; justify-content: space-between">
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('left')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-align-left" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('center')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-align-center" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('right')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-align-right" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('top')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-align-top" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('middle')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-align-middle" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('bottom')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-align-bottom" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('distribute_vertical')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-center" :size="24" class="hover-active" />
            </template>
          </a-button>
          <a-button
            size="small"
            v-if="!editor.activeObjectIsType('Pen')"
            :disabled="!isDefined(editor.activeObject)"
            @click="handleAlign('distribute_horizontal')"
            class="hide-bg"
          >
            <template #icon>
              <ali-icon type="icon-horizontally" :size="24" class="hover-active" />
            </template>
          </a-button>
        </a-space>
      </a-col>
      <!-- 尺寸 -->
      <a-col :span="18" class="mt5px">
        <div class="title-text">Size</div>
      </a-col>
      <a-col :span="10" class="wh">
        <SwipeNumber
          size="small"
          :min="0.5"
          label="W"
          sim-key="width"
          :model-value="Number(convertedWidth)"
          @change="handleWidthChangeForLine"
          :is-unit="true"
          :disabled="canvas.ref.isClip.value || disText"
          :hide-button="false"
        />
      </a-col>
      <a-col :span="10" class="ml5px wh">
        <SwipeNumber
          size="small"
          :min="0.5"
          label="H"
          sim-key="height"
          :model-value="Number(convertedHeight)"
          @change="handleHeightChangeForLine"
          :is-unit="true"
          :disabled="canvas.ref.isClip.value || disText"
          :hide-button="false"
        />
      </a-col>
      <a-col :span="3" class="ml5px ratio" v-if="tag != 'Text' && !canvas.ref.isClip.value && tag != 'SimulateElement'">
        <ali-icon
          type="icon-a-suofang1"
          :size="24"
          @click="handleRatio"
          style="cursor: pointer"
          :class="{ 'text-active': editor.activeObject.value.lockRatio }"
          :style="{ color: editor.activeObject.value.lockRatio ? themeColor : '' }"
        />
      </a-col>
      <!-- TODO  框选元素使用响应式属性会导致框选元素后拉伸位置会偏移  后续需要优化 -->
      <a-col :span="3" class="ml5px ratio" v-if="tag === 'SimulateElement'">
        <ali-icon
          type="icon-a-suofang1"
          :size="24"
          @click="
            () => {
              islockRatio = !islockRatio
              editor.activeObject.value.lockRatio = islockRatio
            }
          "
          style="cursor: pointer"
          :class="{ 'text-active': islockRatio }"
        />
      </a-col>

      <!-- 圆角属性 -->
    </a-row>
    <template
      v-if="
        canvas.activeObject.value.app.editor.multiple ||
        tag == 'Line' ||
        tag == 'Arrow' ||
        tag == 'Rect' ||
        tag == 'Polygon' ||
        tag == 'Star' ||
        canvas.activeObject.value.findOne('ShapeRect') ||
        (canvas.activeObject.value.findOne('ShapePolygon') &&
          !['梯形', '扭曲矩形', '等腰三角形'].includes(canvas.activeObject.value.findOne('ShapePolygon').name)) ||
        canvas.activeObject.value.findOne('ShapeStar')
      "
    >
      <a-row :gutter="8" v-if="!(tag === 'Line' && canvas.activeObject.value.data.editInner !== 'curvedElbow')">
        <a-col v-if="isShowCornerStyle" class="mt7px" :span="8">
          <div class="title-text">Corner</div>
          <SwipeNumber
            size="small"
            sim-key="cornerRadius"
            :min="0"
            :max="maxRedius"
            :step="1"
            :model-value="maxRediusValue"
            @change="changeCornerRadius"
            :hide-button="false"
          >
            <template #prefix>
              <SvgIcon name="radius" :size="16" />
            </template>
          </SwipeNumber>
        </a-col>
        <a-col
          :span="8"
          v-if="
            isShowCountStyle ||
            tag == 'Polygon' ||
            tag == 'Star' ||
            (canvas.activeObject.value.findOne('ShapePolygon') &&
              !['梯形', '扭曲矩形', '等腰三角形'].includes(canvas.activeObject.value.findOne('ShapePolygon').name)) ||
            canvas.activeObject.value.findOne('ShapeStar')
          "
          class="mt7px"
        >
          <div class="title-text">Count</div>
          <SwipeNumber
            size="small"
            sim-key="corners"
            :min="3"
            :max="60"
            :step="1"
            :model-value="Number(corners.modelValue) || 0"
            @update:model-value="corners.onChange"
            @change="
              () => {
                canvas.undoRedo.save(28)
              }
            "
            :hide-button="false"
            v-if="tag == 'Star' || canvas.activeObject.value.findOne('ShapeStar')"
          >
            <template #prefix>
              <SvgIcon name="count" :size="16" />
            </template>
          </SwipeNumber>
          <SwipeNumber
            size="small"
            sim-key="sides"
            :min="3"
            :max="60"
            :step="1"
            :model-value="Number(sides.modelValue) || 0"
            @update:model-value="sides.onChange"
            @change="
              () => {
                canvas.undoRedo.save(29)
              }
            "
            :hide-button="false"
            v-if="tag == 'Polygon' || canvas.activeObject.value.findOne('ShapePolygon')"
          >
            <template #prefix>
              <SvgIcon name="polygon-count" :size="18" />
            </template>
          </SwipeNumber>
          <SwipeNumber
            size="small"
            sim-key="corners|sides"
            :min="3"
            :max="60"
            :step="1"
            :model-value="Number(count) || 0"
            @change="countChange"
            :hide-button="false"
            v-if="isShowCountStyle && canvas.activeObject.value.app.editor.multiple"
          >
            <template #prefix>
              <SvgIcon name="polygon-count" :size="18" />
            </template>
          </SwipeNumber>
        </a-col>
        <a-col :span="8" v-if="tag == 'Star' || canvas.activeObject.value.findOne('ShapeStar') || isShowInnerRadius" class="mt7px">
          <div class="title-text">Ratio</div>
          <SwipeNumber
            size="small"
            sim-key="innerRadius"
            :min="0"
            :max="100"
            :step="1"
            :model-value="Number(innerRadius_) || 0"
            @change="innerRadiusChange"
            :hide-button="false"
          >
            <template #suffix>%</template>
            <template #prefix>
              <SvgIcon name="xuanzhuan" :size="16" />
            </template>
          </SwipeNumber>
        </a-col>
      </a-row>
    </template>
  </div>
</template>

<style scoped lang="less">
.base-attr {
  position: relative;
}

.base-attr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
}

.arco-input-prefix {
  svg {
    display: inline-block;
    vertical-align: -3.5px;
  }
}

.custom-box {
  width: 286px;

  :deep(.arco-input-wrapper) {
    .arco-input-prefix,
    .arco-input-suffix {
      font-size: 12px !important;
      width: 20px !important;
    }
  }
}

.input-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.custom-box {
  :deep(.arco-input-wrapper) {
    .arco-input-prefix,
    .arco-input-suffix {
      font-size: 12px !important;
      width: 20px !important;
    }
  }
}

.ratio {
  display: flex;
  align-items: center;
}

.checked_active {
  color: #1ca6c5;
}

.hide-bg {
  background: transparent !important;
}

.wh {
  :deep(.arco-input-suffix) {
    margin-top: -3px !important;
  }
}

.text-active {
  color: #1ca6c5;
}

.hover-active {
  color: #6b6b6b;
  transition: all 0.3s ease;

  &:hover {
    color: var(--role-theme-color);
    transform: scale(1.15);
  }
}
</style>
