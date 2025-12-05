import { useEditor } from '@/views/Editor/app'
import { isDefined } from '@vueuse/core'
import type { WritableComputedRef } from 'vue'
import { toFixed } from '@/utils/math'
import { isArray, isNumber, isObject, isString, isNull } from 'lodash'
import { ILeaf, IUI, IUIInputData, IUnitData } from '@leafer-ui/interface'
import { typeUtil } from '@/views/Editor/utils/utils'

/**
 * 值的格式转换方法类型
 * @type {Function | 'default' | 'preset' | null}
 * @description
 * - Function: 自定义转换函数
 * - 'default': 不转换，使用原始值
 * - 'preset': 使用内置转换方法
 * - null: 不进行转换
 */
type ParseType = Function | 'default' | 'preset' | null

/**
 * 活动对象属性模型 Hook
 * @description 用于处理编辑器中当前选中对象的属性双向绑定
 * @template K - ILeaf 的键类型
 * @template T - 属性值类型
 * @param {string} key - 要绑定的属性键名
 * @param {any} defaultValue - 属性的默认值
 * @param {ParseType} parseFun - 值的格式转换方法
 * @param {boolean} queryDataField - 是否查询并设置元素data字段内的属性，默认为false
 * @returns {WritableComputedRef} 返回包含 modelValue 和事件处理器的计算属性
 */
export const useActiveObjectModel = <K extends keyof ILeaf, T = ILeaf[K] | undefined>(
  key: string,
  defaultValue?: any,
  parseFun: ParseType = 'preset',
  queryDataField: boolean = false
): WritableComputedRef<{
  modelValue: T
  onSwipe: (value: T) => void
  onChange: (value: T) => void
}> => {
  /** 获取编辑器实例和撤销重做管理器 */
  const { editor,canvas } = useEditor()
  /** 属性值的响应式引用 */
  const modelValue = ref()

  /**
   * 当前活动对象的引用
   * @description 用于解决输入框失焦问题：
   * 在编辑完一个组件后，如果输入框未失焦就点击下一个组件，
   * 会导致新组件被错误修改的问题
   */
  let activeObject: IUI = null

  /**
   * 修改锁定标志
   * @description 防止在 input 组件修改后未回车确认时，
   * 切换对象导致触发 onChange 事件修改错误对象的值
   */
  let lockChange = false

  /**
   * 监听活动对象变化
   * @description 当选中对象改变时，更新属性值
   */
  watchEffect(() => {
    // 如果没有选中对象，清空属性值
    if (!isDefined(editor.activeObject.value)) {
      modelValue.value = undefined
      return
    }

    // 更新当前活动对象
    if (editor.activeObject?.value.tag == 'Box' && editor.activeObject?.value.findOne('ShapeLine')) {
      activeObject = editor.activeObject?.value.findOne('ShapeLine')
    } else if (editor.activeObject?.value.tag == 'Box' && editor.activeObject?.value.findOne('ShapeRect')) {
      activeObject = editor.activeObject?.value.findOne('ShapeRect')
    } else if (editor.activeObject?.value.tag == 'Box' && editor.activeObject?.value.findOne('ShapePolygon')) {
      activeObject = editor.activeObject?.value.findOne('ShapePolygon')
    } else if (editor.activeObject?.value.tag == 'Box' && editor.activeObject?.value.findOne('ShapeEllipse')) {
      activeObject = editor.activeObject?.value.findOne('ShapeEllipse')
    } else if (editor.activeObject?.value.tag == 'Box' && editor.activeObject?.value.findOne('ShapeStar')) {
      activeObject = editor.activeObject?.value.findOne('ShapeStar')
    } else if (editor.activeObject?.value.name == 'Text' && editor.activeObject?.value.findOne('Text')) {
      activeObject = editor.activeObject?.value.findOne('Text')
    } else {
      activeObject = editor.activeObject?.value
    }

    // 检查是否是多选情况
    const isMultipleSelection = editor.app.editor.multiple

    // 锁定修改操作
    lockChange = true

    // 多选情况下的特殊处理
    if (isMultipleSelection) {
      // 对于多选情况，直接使用当前选框的属性值，不触发同步机制
      // if (
      //     key == 'x' || key == 'y' || key == 'width' || key == 'height'|| key == 'rotation'|| key == 'locked' || key == 'visible'|| key == 'fill'|| key == 'overflow' || key == 'opacity' || key == 'opacity'
      //     || key == 'stroke' || key == 'strokeWidth'|| key == 'dashPattern' || key == 'startSize' || key == 'endSize'
      //     || key == 'startArrow' || key == 'endArrow' || key == 'strokeAlign'
      // ) {
      //     const value = activeObject[key]
      //     modelValue.value = isNumber(value) ? toFixed(value) : value
      // } else {
      //     console.log(key, '---key');
      //     // 对于其他属性，仍然使用 proxyData 以保持响应式
      //     const value = activeObject.proxyData[key]
      //     modelValue.value = isNumber(value) ? toFixed(value) : value
      // }
      // const value = activeObject[key]
      // modelValue.value = isNumber(value) ? toFixed(value) : value
    } else {
      // 单选情况下，可以安全地使用属性值
      let value: any
      if (queryDataField && activeObject.data) {
        // 如果启用了data字段查询且data中存在该属性，则使用data中的值
        value = activeObject.data[key] || ''
      } else {
        // 否则使用proxyData中的值
        value = activeObject.proxyData[key]
      }
      // 解决线段退出内部编辑后 外部编辑器不正确
      if (activeObject.tag === 'Line') {
        activeObject.set({
          editOuter: (activeObject as any).points?.length > 4 ? 'EditTool' : 'LineEditTool'
        })
      }
      modelValue.value = isNumber(value) ? toFixed(value) : value
    
    }

    // 下一帧解除修改锁定
    requestAnimationFrame(() => (lockChange = false))
  })

  /**
   * 设置对象属性值
   * @param {any} obj - 目标对象
   * @param {any} newValue - 新的属性值
   */
  const setObjectValue = (obj: any, newValue: any) => {
    // 特殊处理渐变描边/填充
    if ((key === 'stroke' || key === 'fill') && newValue && typeof newValue === 'object') {
      const isGradient = newValue.type === 'linear' || newValue.type === 'radial'

      if (isGradient) {
        console.log(`Setting ${key} gradient:`, newValue)

        // 确保渐变对象格式正确
        if (isArray(newValue.stops)) {
          // 创建一个新的简单渐变对象，避免引用问题
          const gradientObj = {
            type: newValue.type,
            stops: [...newValue.stops]
          }

          // 直接设置属性
          obj[key] = gradientObj
          modelValue.value = gradientObj

          // 记录状态变化 saveState！
          return
        }
      }
    }

    // 检查是否是多选情况
    const isMultipleSelection = editor.app.editor.multiple

    // 多选情况下的特殊处理
    if (isMultipleSelection) {
      // 对于多选情况下的变换操作，使用编辑器提供的变换方法
      if (key === 'width') {
        // 计算缩放比例
        const scale = newValue / obj.width
        // 使用编辑器的缩放方法
        // editor.app.editor.scaleX(scale)
        // 直接设置属性值作为备选方案
        obj[key] = newValue
        // 更新模型值
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
        // 保存状态  saveState！
        return
      } else if (key === 'height') {
        const scale = newValue / obj.height
        // editor.app.editor.scaleY(scale)
        // 直接设置属性值作为备选方案
        obj[key] = newValue
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
                // 保存状态  saveState！

        return
      } else if (key === 'x') {
        const delta = newValue - obj.x
        // editor.app.editor.moveX(delta)
        // 直接设置属性值作为备选方案
        obj[key] = newValue
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
        // 保存状态  saveState！
       
        return
      } else if (key === 'y') {
        const delta = newValue - obj.y
        // editor.app.editor.moveY(delta)
        // 直接设置属性值作为备选方案
        obj[key] = newValue
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
        // 保存状态  saveState！
       
        return
      } else if (key === 'rotation') {
        // 计算旋转角度差值
        const deltaRotation = newValue - obj.rotation
        // 使用编辑器的旋转方法
        // editor.app.editor.rotate(deltaRotation)
        // 直接设置属性值作为备选方案
        obj[key] = newValue
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
                // 保存状态  saveState！

        return
      }
    }

    // 单选情况或其他属性的处理保持不变
    // 只有当值发生变化时才更新
    const currentValue = queryDataField && obj.data && obj.data[key] !== undefined ? obj.data[key] : obj[key]
    if (currentValue !== newValue) {
      // 如果启用了data字段查询，则设置到data中
      if (queryDataField) {
        if (!obj.data) {
          obj.data = {}
        }
        obj.data[key] = newValue
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
        // 保存编辑器状态，支持撤销/重做
                // 保存状态  saveState！

        return
      }

      // 如果是旋转属性，需要特殊处理
      if (key === 'rotation') {
        // 计算需要旋转的角度差值
        const deltaRotation = newValue - obj.rotation

        // 以对象自身的中心点为基准进行旋转
        obj.rotateOf(
          {
            x: obj.width / 2,
            y: obj.height / 2
          },
          deltaRotation
        )

        // 更新模型值
        modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
      } else {
        // 处理Group对象的宽度和高度变化 (group是自适应内容的需要通过resizeWidth和resizeHeight来设置)
        if (obj.tag === 'Group') {
          if (key === 'width') {
            obj.resizeWidth(newValue)
          } else if (key === 'height') {
            obj.resizeHeight(newValue)
          }
        }
        // console.log(canvas.ref.isDragging.value, '---obj');
        // 拖拽过程中可能会触发设置 需要禁止
        const isDragging = canvas.ref.isDragging.value 
        if (!isDragging) {
          // 对所有元素的x和y属性进行坐标转换处理
          let actualValue = newValue
          
          if (isArray(actualValue)) {
            obj[key] = [].concat(actualValue)
          } else {
            obj[key] = actualValue
          }
          modelValue.value = isNumber(newValue) ? toFixed(newValue) : newValue
        }
      }

    }
  }

  /**
   * 更改属性值
   * @param {T} newValue - 新的属性值
   * @param {'swipe' | 'change'} type - 更改类型：拖动或输入
   */
  const changeValue = (newValue: T, type: 'swipe' | 'change') => {
    // 如果处于锁定状态或没有活动对象，则不进行修改
    if (lockChange || !isDefined(activeObject)) return
    setObjectValue(activeObject, newValue)
  }

  // 创建一个可写的计算属性来返回
  const result = computed({
    get: () => ({
      disabled: !isDefined(editor.activeObject.value),
      modelValue: modelValue.value as T,
      onSwipe: (value: T) => {
        changeValue(value, 'swipe')
      },
      onChange: (value: T) => {
        changeValue(value, 'change')
      }
    }),
    set: (value) => {
      // 这里实际上不需要做任何事情，因为我们的更新是通过onChange和onSwipe来完成的
      // 但是WritableComputedRef需要一个setter
    }
  })

  return result as unknown as WritableComputedRef<{
    modelValue: T
    onSwipe: (value: T) => void
    onChange: (value: T) => void
  }>
}
