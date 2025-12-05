import Dialog from '@/components/dialog'
import _ColorPicker from './colorPicker.vue'
import { DialogReturn } from '@/components/dialog/interface'
// import { Color as FabricColor, Gradient, Pattern, GradientCoords } from '@fabric'
import { appInstance } from '@/views/Editor/app'
import { ColorPoint, ColorType } from '@/components/colorPicker/interface'
import { fabricGradientToPoints, gradAngleToCoords, pointsToColorStops } from '@/views/Editor/utils/fill'
import { isDefined } from '@vueuse/core'
import { IMLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'
import { ServicesAccessor } from '@/views/Editor/core/instantiation/instantiation'
import { ColorPickerOption, Props } from './interface'
import GColor from '@/utils/color/g-color'
import { useEditor } from '@/views/Editor/app'
import { replaceElementToNewArr, calculatePoints, calculateAngle } from '@/utils/utils'
import { useColorStore } from '@/store/modules/color'

let dialog: DialogReturn | undefined

/**
 * 关闭dialog
 */
const dialogClose = () => {
  dialog && dialog.close()
  dialog = undefined
}

/**
 * 打开颜色选择器弹窗
 * @param accessor - 服务访问器
 * @param option - 颜色选择器选项，包含对象、属性、索引、初始颜色等
 * @returns DialogReturn 弹窗关闭函数
 */
const openDialog = (
  accessor: ServicesAccessor,
  { object, attr, index, dialogOption, initialColor, ...props }: ColorPickerOption & Partial<Props>
) => {
  const { editor } = useEditor()
  let points: ColorPoint[]
  let type: ColorType = 'color'
  let degree: number = 0 //默认90度
  // 确保 colorArr 始终有值

  const defaultColor = { type: 'solid', color: 'Mixed' }
  const colorArr = <[]>(object && attr ? object.proxyData[attr] || [defaultColor] : [initialColor || defaultColor])
  const colorValue: any = colorArr[index] || defaultColor
  // 渐变
  if (colorValue.type === 'linear' || colorValue.type === 'radial') {
    // console.log('colorValue',colorValue)
    points = fabricGradientToPoints(colorValue)
    type = colorValue.type
    // 坐标转角度
    const { from, to } = colorValue
    degree = calculateAngle(from.x, from.y, to.x, to.y)
  }
  // 图案
  else if (colorValue.type === 'image') {
    points = [
      {
        left: 0,
        red: 255,
        green: 255,
        blue: 255,
        alpha: 1
      },
      {
        left: 100,
        red: 255,
        green: 255,
        blue: 255,
        alpha: 0
      }
    ]
    type = 'pattern'
  }
  // 纯色
  else if (colorValue) {
    // 当当前色为 'Mixed' 或空值时，使用传入的 initialColor 或默认黑色，避免内部默认 HSV=100 导致 55FF00
    const seed = (() => {
      const ic = typeof initialColor === 'string' ? initialColor : initialColor?.color
      const cv = colorValue?.color
      if (!cv || cv === 'Mixed') return ic || '#000000'
      return cv
    })()
    const color = new GColor(seed)
    const { r, g, b, a } = color.getRgba()
    points = [
      {
        left: 0,
        red: r,
        green: g,
        blue: b,
        alpha: a
      },
      {
        left: 100,
        red: Math.round(r * 0.52),
        green: Math.round(g * 0.52),
        blue: Math.round(b * 0.52),
        alpha: a
      }
    ]
  }

  return Dialog.open({
    width: 240,
    // top: window.innerHeight / 2 - 202,
    top: window.innerHeight / 2 - 350,
    left: window.innerWidth - 240 - 310,
    title: '颜色',
    clickOutsideToClose: true, // 点击外部关闭弹窗
    ...dialogOption,
    body: () =>
      h(_ColorPicker, {
        onChange(data: any) {
          editor.dateEdit((e) => {
            if (!isDefined(e) || !isDefined(attr)) return
            // 获取对象的数值 ，并将数值转成数组方便后续的操作处理，以前只对color进行处理，导致一开始的时候渐变不生效
            const colorArr = e[attr]
            if (data.points.length < 1) return
            const [{ red, green, blue, alpha }] = data.points
            const colorStr = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha})`
            // 保存到历史记录
            useColorStore().addHistoryColor(colorStr)
            // 这里使用新数组，因为leafer是浅监听的 修改数组值无法监听到并重新渲染
            const newColor = {
              type: 'solid',
              color: colorStr
            }
            // 确保colorArr是一个数组
            const arr = Array.isArray(colorArr) ? colorArr : [colorArr]
            // 确保新数组中的每个元素都是正确的格式
            const newArr = arr.map((item, i) => {
              if (i === index) {
                return newColor
              }
              return typeof item === 'string' ? { type: 'solid', color: item } : item
            })
            e[attr] = newArr
            if (data.type === 'linear' || data.type === 'radial') {
              const colorStops = pointsToColorStops(data.points)
              if (e.tag === 'Text' && data.type === 'radial') return
              const angle = data.degree // 渐变角度
              const [to, from] = calculatePoints(angle, data.type) // 角度转换成坐标，并传递渐变类型
              // 这里使用新数组，因为leafer是浅监听的 修改数组值无法监听到并重新渲染

              e[attr] = replaceElementToNewArr(e[attr], index, {
                type: data.type,
                stops: colorStops,
                from: { x: from.x, y: from.y, type: 'percent' },
                to: { x: to.x, y: to.y, type: 'percent' }
              })
            } else if (data.type === 'pattern') {
              // 这里使用新数组，因为leafer是浅监听的 修改数组值无法监听到并重新渲染
              e[attr] = replaceElementToNewArr(colorArr, index, {
                type: 'image',
                url: ''
              })
            }
          }, 1)
        },
        onEndChange(data: any) {
          const [{ red, green, blue, alpha }] = data.points
          const colorStr = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha})`
          // 保存到历史记录
          useColorStore().addHistoryColor(colorStr)
        },
        attr: attr,
        index: index,
        ...props,
        degree,
        gradient: {
          type,
          points
        },
        disabledFlag: props.disabledFlag || false
      }),
    onClose() {
      dialog = undefined
      dialogOption?.onClose?.()
    }
  })
}

const open = (option: ColorPickerOption & Partial<Props>) => {
  if (!dialog) {
    dialog = appInstance.editor.service.invokeFunction(openDialog, option)
  }
  return dialogClose
}

const ColorPicker = Object.assign(_ColorPicker, { open, close: dialogClose })

export default ColorPicker
