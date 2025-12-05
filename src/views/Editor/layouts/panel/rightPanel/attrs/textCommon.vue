<script setup lang="ts">
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { watch, watchEffect, unref } from 'vue'
import { parseStrokeOrFill } from '@/views/Editor/utils/jsonParse'
import GColor from '@/utils/color/g-color'
import { useColorStore } from '@/store/modules/color'
import { Modal, Message } from '@arco-design/web-vue'
import SwipeNumber from '@/components/swipeNumber/swipeNumber.vue'
import '@leafer-in/motion-path'
import { formatColor } from '@/views/Editor/utils/formatColor'
import { useColorUpdate } from '@/store/modules/colorUpdate'
import { cloneDeep, throttle } from 'lodash'
import { useFontStore } from '@/store/modules/font/font'
const { fontList, skipLoadFonts } = storeToRefs(useFontStore())
// console.log(fontList.value,skipLoadFonts.value,'字体列表')
import FontFaceObserver from 'fontfaceobserver'
import {
  handleShowCurve,
  superscriptMapVal,
  subscriptMapVal,
  toSuperscript,
  toSubscript,
  toNormal,
  replaceSelectedTextInEditor
} from '@/components/text-editor/TextEditTool/utils'
import emitter from '@/utils/eventBus'
import { SimulateAttrController } from '../SimulateTempAttr'
const simulateAttr: SimulateAttrController = inject('simulateAttr')
simulateAttr.updateState()
const isSimulateElement = computed(() => {
  return simulateAttr.isSimulateElement.value
})
import { useRoleTheme } from '@/hooks/useRoleTheme'
const { themeColor } = useRoleTheme()

const { canvas, editor } = useEditor()
const fill = useActiveObjectModel('fill') //颜色
const opacity = useActiveObjectModel('opacity') //透明度

const curveAmount = useActiveObjectModel('curveAmount') as any //下标

const activeColor = ref('#FFFFFF') //颜色选择选中颜色
const activeColorOpacity = ref(100) //颜色选择选中透明度
const currentSelectColor = ref<string>('') //当前展示颜色
const historyColors = ref<string[]>(useColorStore().historyColors) //颜色历史记录
const isGradient = ref(false) //是否是渐变色
const currentSelectGradient = ref<string>('linear') //当前展示渐变色
// Amount 默认数据default
const curve = computed(() => {
  return editor.getAttributeValue('curveAmount') || 0
})
// 是select 是否弧形文字
const canCurve = ref(null)
const isMixed = ref(false)
watchEffect(() => {
  simulateAttr.selectCount.value
  canCurve.value = curve.value ? 1 : 0
  !editor.dataIsSame('curveAmount') ? ((isMixed.value = true), (canCurve.value = '')) : (isMixed.value = false)
})
const changeCanCurve = (e: any) => {
  canCurve.value = e
  editor.dateEdit((e) => {
    const text = e.findOne('Text')
    const box = e.findOne('Box')
    text.curveAmount = 0
    text.opacity = 1
    text.visible = true
    box && box.remove()
    canvas.activeObject.value.tag !== 'SimulateElement' && clearSomeWrong(e)
  })
}

const fontFamily_ = computed(() => {
  // 作为准确的监听依据勿删
  simulateAttr.selectCount.value
  return editor.getAttributeValue('fontFamily') || ''
})

const fontWeight_ = computed(() => {
  return editor.getAttributeValue('fontWeight') || 0
})

const italic_ = computed(() => {
  return editor.getAttributeValue('italic') || false
})

const textDecoration_ = computed(() => {
  return editor.getAttributeValue('textDecoration') || ''
})

const textCase_ = computed(() => {
  return editor.getAttributeValue('textCase') || ''
})

const superscript_ = computed(() => {
  return selectText.value ? selectText.value.text.split('').every((e: string) => superscriptMapVal.includes(e)) : false
})

const subscript_ = computed(() => {
  return selectText.value ? selectText.value.text.split('').every((e: string) => subscriptMapVal.includes(e)) : false
})

const fontSize_ = computed(() => {
  const result = Number(editor.getAttributeValue('fontSize')) * (72 / 96)
  return Number(result.toFixed(2))
})

const textAlign_ = computed(() => {
  return editor.getAttributeValue('textAlign') || ''
})

const verticalAlign_ = computed(() => {
  return editor.getAttributeValue('verticalAlign') || ''
})

// 行高
const lineHeightActive = computed({
  get() {
    const obj = editor.getAttributeValue('lineHeight')
    return obj.value * 100
  },
  set(newVal) {}
})

// 字间距
const letterSpacing_ = computed({
  get() {
    return editor.getAttributeValue('letterSpacing') || 0
  },
  set(newVal) {}
})

const changeFontSize = (val: any) => {
  editor.dateEdit((e) => {
    const result = Number(val) * (96 / 72)
    e.fontSize = Number(result.toFixed(2))
    if (e.parent.tag === 'Group' && e.parent.findOne('Text') && e.parent.findOne('Box')) {
      handleShowCurve(e.parent, false)
    }
  }, 1)
  // 记录操作添加到历史
  canvas.undoRedo.save(111)
}

//切换字体
/**
 * 切换字体并加载所选字体，确保画布刷新
 * @param {string | {name?: string, code?: string}} record 选择器返回的字体记录或字体名称
 * @returns {Promise<void>} 异步执行，不返回值
 */
type FontRecord = string | { name?: string; code?: string }
const changeFontFamily = async (record: FontRecord): Promise<void> => {
  //
  const fontFamilyName = (typeof record === 'string' ? record : record.name) || (record as string)

  if (skipLoadFonts.value.includes(fontFamilyName)) {
    // 先更新当前对象与选择器的字体值，以便 UI 立即反映选择
    editor.dateEdit(async (e) => {
      await document.fonts.load(`${(fontSize_.value * 96) / 72}px ${fontFamilyName}`)
      e.fontFamily = fontFamilyName
    }, 1)
    // 记录操作添加到历史
    canvas.undoRedo.save(112)
    return
  } else {
    const font = new FontFaceObserver(fontFamilyName)
    //
    font
      .load(null, 150000)
      .then(() => {
        // loading.close()
        canvas.activeObject.value?.forceUpdate()
        // 记录操作添加到历史
        canvas.undoRedo.save(113)
      })
      .catch((err) => {
        // loading.close()
        Message.error({
          content: `加载字体【${fontFamilyName}】失败 ${err}`
        })
      })
  }
}

const fillArray = ref([])
watchEffect(() => {
  if (fill.value.modelValue) {
    fillArray.value = parseStrokeOrFill(fill.value.modelValue)
  } else {
    fillArray.value = [
      {
        type: 'solid',
        color: ''
      }
    ]
  }
})

const colorStore = useColorUpdate()

const { colorBlock, openColorPicker, changeColor } = useColor(
  computed(() => fillArray.value),
  {
    attr: 'fill',
    onChange() {
      fill.value.onChange(fillArray.value)
    }
  }
)

// 监听对象透明度变化
watchEffect(() => {
  if (opacity.value.modelValue !== undefined) {
    activeColorOpacity.value = Math.round(Number(opacity.value.modelValue) * 100)
  }
})

// 监听对象颜色变化
watchEffect(() => {
  //
  //当前颜色为纯色
  if (fill.value.modelValue && fillArray.value[0]?.type == 'solid') {
    isGradient.value = false
    if (fillArray.value[0].color == '') {
      currentSelectColor.value = 'Mixed'
      activeColor.value = ''
    } else {
      const color = new GColor(fillArray.value[0].color)
      activeColor.value = color.rgba
      //更新透明度
      activeColorOpacity.value = Math.round(color.alpha * 100)
      // 更新输入框显示
      const hex = color.hex.replace('#', '')
      currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
    }
  } else if (fill.value.modelValue && (fillArray.value[0]?.type == 'linear' || fillArray.value[0]?.type == 'radial')) {
    //当前选择颜色为线性渐变
    const color = new GColor(fillArray.value[0].stops[0].color)
    activeColor.value = color.rgba
    //更新透明度
    activeColorOpacity.value = Math.round(color.alpha * 100)
    // 更新输入框显示
    const hex = color.hex.replace('#', '')
    currentSelectColor.value = color.hex.replace('#', '').toUpperCase()
    isGradient.value = true
    currentSelectGradient.value = fillArray.value[0].type
  } else if (fill.value.modelValue == undefined || fill.value.modelValue == '' || fill.value.modelValue == null) {
    //没有填充颜色
    currentSelectColor.value = 'Mixed'
    isGradient.value = false
    activeColor.value = ''
  }
  // 保存历史操作 - 只有弹出颜色选择器才保存 避免不必要的保存
  nextTick(() => {
    // 弹出颜色选择器且不处于内部编辑模式则保存 (因为全局已经针对退出内部编辑做了保存操作)
    if (document.querySelector('.overlay-dialog') && !canvas.app.editor.innerEditing) {
      canvas.undoRedo.save(214)
    }
  })
})

//手动修改颜色
const handleCurrentChange = () => {
  const result = formatColor(currentSelectColor.value || '', activeColor.value)

  // 更新颜色值
  if (result.color !== currentSelectColor.value) {
    currentSelectColor.value = result.color
  }

  // 更新透明度
  if (result.opacity !== undefined) {
    activeColorOpacity.value = result.opacity
  }

  // 创建新的颜色对象
  const newColorObj = new GColor('#' + result.color)
  newColorObj.alpha = activeColorOpacity.value / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  fill.value.onChange(fillArray.value)
  // 记录操作添加到历史
  canvas.undoRedo.save(114)
}

//手动修改透明度
const changeOpacity = () => {
  const result = formatColor(currentSelectColor.value || '', activeColor.value)
  // 更新颜色值
  if (result.color !== currentSelectColor.value) {
    currentSelectColor.value = result.color
  }
  // 创建新的颜色对象
  const newColorObj = new GColor('#' + result.color)
  newColorObj.alpha = activeColorOpacity.value / 100
  // 更新全局颜色
  colorStore.updateColor(newColorObj)
  // 更新颜色选择器的值
  activeColor.value = newColorObj.rgba
  // 使用 changeColor 方法更新颜色
  changeColor(newColorObj.hex.replace('#', ''))
  // 同步更新颜色选择器的颜色
  fill.value.onChange(fillArray.value)
}

//监听历史记录
watch(historyColors.value, (newVal) => {
  //保存前8条记录，如果历史记录长度大于8，删除第一个
  if (newVal.length > 8) {
    historyColors.value.pop()
  }
})

// font格式化
const handleFormat = (value: string) => {
  switch (value) {
    case 'bold':
      //字体粗细
      const isSameBold = editor.dataIsSame('fontWeight')
      editor.dateEdit((e) => {
        if (isSameBold) {
          e.fontWeight = e.fontWeight === 'bold' ? 'normal' : 'bold'
        } else {
          e.fontWeight = 'bold'
        }
        handleShowCurve(e.parent, false)
      }, 1)
      break
    case 'italic':
      //斜体
      const isSameItalic = editor.dataIsSame('italic')
      editor.dateEdit((e) => {
        if (isSameItalic) {
          e.italic = e.italic === true ? false : true
        } else {
          e.italic = true
        }
        handleShowCurve(e.parent, false)
      }, 1)
      break
    case 'underline':
      //下划线
      const isSameTextDecoration = editor.dataIsSame('textDecoration')
      editor.dateEdit((e) => {
        if (isSameTextDecoration) {
          e.textDecoration = e.textDecoration === 'under' ? 'none' : 'under'
        } else {
          e.textDecoration = 'under'
        }
        handleShowCurve(e.parent, false)
      }, 1)
      break
    case 'underline-wave':
      //下划线波浪
      const isSameTextDecorationWave = editor.dataIsSame('textDecoration')
      editor.dateEdit((e) => {
        if (isSameTextDecorationWave) {
          e.textDecoration = e.textDecoration === 'wavy' ? 'none' : 'wavy'
        } else {
          e.textDecoration = 'wavy'
        }
        handleShowCurve(e.parent, false)
      }, 1)
      break
    case 'strikethrough':
      //删除线
      const isSameTextDecorationDelete = editor.dataIsSame('textDecoration')
      editor.dateEdit((e) => {
        if (isSameTextDecorationDelete) {
          e.textDecoration = e.textDecoration === 'delete' ? 'none' : 'delete'
        } else {
          e.textDecoration = 'delete'
        }
        handleShowCurve(e.parent, false)
      }, 1)
      break
    case 'textCase':
      //大小写切换
      const isSameTextCase = editor.dataIsSame('textDecoration')
      editor.dateEdit((e) => {
        if (isSameTextCase) {
          e.textCase = e.textCase === 'upper' ? 'lower' : 'upper'
        } else {
          e.textCase = 'upper'
        }
        handleShowCurve(e.parent, false)
      }, 1)
      break
    case 'superscript':
      //上标
      if (selectText.value) {
        const editDom = document.querySelector('#textInnerEditor')
        replaceSelectedTextInEditor(editDom, selectText.value, superscript_.value, toSuperscript, toNormal)
        if (canvas.activeObject.value.parent.name === 'Group') {
          const old = canvas.activeObject.value.findOne('Text')
          canvas.app.editor.cancel()
          editor.selectObject(old)
        }
      }
      break
    case 'subscript':
      //下标
      if (selectText.value) {
        const editDom = document.querySelector('#textInnerEditor')
        replaceSelectedTextInEditor(editDom, selectText.value, subscript_.value, toSubscript, toNormal)
        if (canvas.activeObject.value.parent.name === 'Group') {
          const old = canvas.activeObject.value.findOne('Text')
          canvas.app.editor.cancel()
          editor.selectObject(old)
        }
      }
      break
  }

  // 弧形文字激活状态更新
  // updateCurveText(canvas.activeObject.value)
  // 记录操作添加到历史
  canvas.undoRedo.save(115)
}

//文本对齐方式
const handleAlign = (value: string) => {
  editor.dateEdit((e) => {
    switch (value) {
      case 'left':
        //左对齐
        e.textAlign = 'left'
        break
      case 'center':
        //居中对齐
        e.textAlign = 'center'
        break
      case 'right':
        //右对齐
        e.textAlign = 'right'
        break
      case 'justify':
        //两端对齐
        e.textAlign = 'justify'
        break
      case 'align':
        //文本均匀分布
        e.textAlign = 'both'
        break
      case 'top':
        //顶部对齐
        e.verticalAlign = 'top'
        break
      case 'middle':
        //垂直居中
        e.verticalAlign = 'middle'
        break
      case 'bottom':
        //底部对齐
        e.verticalAlign = 'bottom'
        break
    }
  }, 1)

  // 记录操作添加到历史
  canvas.undoRedo.save(116)
}

const handleLineHeightChange = (value: number) => {
  //行高通过百分比设置
  const lineHeightObj = {
    type: 'percent',
    value: value / 100
  }
  editor.dateEdit((e) => {
    e.lineHeight = lineHeightObj
    // 弧形文字激活状态更新
    updateCurveText(e)
  }, 1)
  // 记录操作添加到历史
  canvas.undoRedo.save(117)
}
const updateCurveText = (e: any) => {
  if (e.parent.name === 'Text' && e.parent.findOne('Box')) {
    if ((e as any).curveAmount) {
      handleShowCurve(e.parent, false)
    }
  }
}
// 字间距
const handleLetterSpacingChange = (value: number) => {
  editor.dateEdit((e) => {
    e.letterSpacing = value
    // 弧形文字激活状态更新
    updateCurveText(e)
  }, 1)
  // 记录操作添加到历史
  canvas.undoRedo.save(118)
}

// 处理文字弧度变化
const handleCircleChange = throttle((value: number) => {
  editor.dateEdit((e) => {
    if (!e) return
    e.curveAmount = value
    if (e.parent.name === 'Text') {
      handleShowCurve(e.parent, false)
    }

    if (canvas.app.editor.innerEditing) {
      if (e.tag === 'Text' && e.parent.name === 'Text') {
        canvas.app.editor.closeInnerEditor()
        editor.selectObject(e.parent)
      }
    } else {
      canvas.activeObject.value.tag !== 'SimulateElement' && clearSomeWrong(e.parent)
    }
  }, 1)

  // 记录操作添加到历史
  canvas.undoRedo.save(119)
}, 150)
const clearSomeWrong = (e: any) => {
  requestAnimationFrame(() => {
    // 如果需要，可重新选中当前对象
    const old = e
    canvas.app.editor.cancel()
    editor.selectObject(old)
  })
}
//有序列表、无序列表
const listType = ref<'ordered' | 'unordered' | ''>('')

// 是否是弧形文字的激活状态
const isTextCurveElement = computed(() => {
  const text = canvas.activeObject.value.findOne('Text')
  return canvas.activeObject.value.name === 'Text' && (text as any).curveAmount
})

// 处理有序列表、无序列表
const handleList = (type: 'ordered' | 'unordered') => {
  editor.dateEdit((e) => {
    if (e.curveAmount) return
    // 获取目标 Text 对象
    if (e === 'Text') {
      canvas.app.editor.closeInnerEditor()
    }
    if (!e) return

    const otherType = type === 'ordered' ? 'unordered' : 'ordered'
    let splitArr = ((e as any).text.split('\n') || []) as string[]
    if (!splitArr.length) return

    // 如果当前文本属于另一种列表类型，先移除标记
    if (e.data[otherType]) {
      splitArr = splitArr.map((e: string) => (otherType === 'unordered' ? e.replace(/^•\s*/, '') : e.replace(/^\d+\.\s*/, '')))
      e.data[otherType] = false
    }

    let isAdding = !e.data[type] // 是否添加标记
    let str = splitArr
      .map((e: string, i: number) => {
        if (isAdding) {
          return type === 'unordered' ? `• ${e}` : `${i + 1}. ${e}`
        } else {
          return type === 'unordered' ? e.replace(/^•\s*/, '') : e.replace(/^\d+\.\s*/, '')
        }
      })
      .join('\n')

    e.set({
      text: str,
      data: {
        ...e.data,
        [type]: isAdding
      }
    })
  }, 1)
}
const rafId: any = ref(null)
const selectText = ref(null)
const onSelect = (): void => {
  if (canvas.activeObject.value.tag === 'Text' && canvas.app.editor.innerEditing) {
    const editDom = document.querySelector('#textInnerEditor')
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(editDom)
    preRange.setEnd(range.startContainer, range.startOffset)
    const start = preRange.toString().length
    const end = start + range.toString().length

    if (start !== end) {
      selectText.value = { start, end, text: range.toString() }
    }
  }
  rafId.value = requestAnimationFrame(onSelect)
}

onMounted(() => {
  // 安全检查：确保 canvas 和 editor 对象存在
  if (!canvas?.app?.editor) {
    return
  }
  // 选择光标监听
  rafId.value = requestAnimationFrame(onSelect)
  // 监听样式面板描边颜色变化
  emitter.on('apply-style-textColor', onApplyTextColor)
})
onUnmounted(() => {
  cancelAnimationFrame(rafId.value)
  rafId.value = null
  emitter.off('apply-style-textColor', onApplyTextColor)
})

// 从样式面板应用文字颜色
const onApplyTextColor = (payload: unknown) => handleLineStyleTextColor(String(payload || ''))

const handleLineStyleTextColor = (color: string) => {
  console.log(color)
  editor.dateEdit((e) => {
    if (!e) return
    e.fill = color
  }, 1)
}

</script>

<template>
  <div class="p2 custom-box text-common">
    <a-space direction="vertical">
      <a-row :gutter="8" align="center">
        <a-col :span="12">
          <div class="title-text">Font</div>
          <a-select
            size="small"
            :class="!fontFamily_ ? 'custom-placeholder' : ''"
            placeholder="Mixed"
            v-model="fontFamily_"
            :options="fontList"
            @change="changeFontFamily"
            allow-search
            :field-names="{
              label: 'code',
              value: 'name'
            }"
            :trigger-props="{ autoFitPopupMinWidth: true }"
          >
            <template #option="{ data }">
              <div class="font-preview-cls" style="padding: 0 25px 0 0">
                <span>{{ typeof data === 'object' ? data.code : data }}</span>
              </div>
            </template>
          </a-select>
        </a-col>
        <a-col :span="12">
          <div class="title-text">Size</div>
          <SwipeNumber
            size="small"
            sim-key="fontSize"
            :model-value="fontSize_"
            @change="
              (val: any) => {
                changeFontSize(val)
              }
            "
            :step="1"
            :min="8"
            :max="100"
            label-class="text-left"
          >
            <template #suffix>pt</template>
          </SwipeNumber>
        </a-col>
        <a-col :span="12" class="mt7px">
          <div class="title-text">Curve</div>
          <a-select
            size="small"
            :class="isMixed ? 'custom-placeholder' : ''"
            placeholder="Mixed"
            v-model="canCurve"
            :options="[
              {
                label: 'None',
                value: 0
              },
              {
                label: 'Circular',
                value: 1
              }
            ]"
            @change="changeCanCurve"
          ></a-select>
        </a-col>
        <a-col v-if="canCurve" :span="24" class="mt7px">
          <div class="title-text">Curve Amount</div>
          <div class="pl-1 pr-3">
            <a-slider :default-value="curve" :min="-100" :max="100" :style="{ width: '100%' }" show-input @change="handleCircleChange" />
          </div>
        </a-col>
        <a-col :span="24" class="mt7px">
          <div class="title-text">Formatting</div>
        </a-col>
        <a-col :span="24" class="flex">
          <div class="format-box">
            <ali-icon
              type="icon-humbleicons_bold"
              :class="fontWeight_ === 'bold' ? 'active' : ''"
              :style="{ color: fontWeight_ === 'bold' ? themeColor : '' }"
              :size="18"
              @click="handleFormat('bold')"
            ></ali-icon>
            <ali-icon
              type="icon-iconoir_italic"
              :class="italic_ === true ? 'active' : ''"
              :style="{ color: italic_ === true ? themeColor : '' }"
              :size="18"
              @click="handleFormat('italic')"
            ></ali-icon>
            <ali-icon
              type="icon-iconoir_underline"
              :class="textDecoration_ === 'under' ? 'active' : ''"
              :style="{ color: textDecoration_ === 'under' ? themeColor : '' }"
              :size="18"
              @click="handleFormat('underline')"
            ></ali-icon>
            <ali-icon
              type="icon-iconoir_strikethrough"
              :class="textDecoration_ === 'delete' ? 'active' : ''"
              :style="{ color: textDecoration_ === 'delete' ? themeColor : '' }"
              :size="18"
              @click="handleFormat('strikethrough')"
            ></ali-icon>
            <ali-icon
              type="icon-fluent_text-change-case-16-regular"
              :class="textCase_ === 'upper' ? 'active' : ''"
              :style="{ color: textCase_ === 'upper' ? themeColor : '' }"
              :size="18"
              @click="handleFormat('textCase')"
            ></ali-icon>
            <ali-icon
              type="icon-tabler_superscript"
              :class="superscript_ ? 'active' : ''"
              :style="{ color: superscript_ ? themeColor : '' }"
              :size="18"
              @click="handleFormat('superscript')"
            ></ali-icon>
            <ali-icon
              type="icon-tabler_subscript"
              :class="subscript_ ? 'active' : ''"
              :style="{ color: subscript_ ? themeColor : '' }"
              :size="18"
              @click="handleFormat('subscript')"
            ></ali-icon>
          </div>
        </a-col>
        <a-col v-if="!isTextCurveElement" :span="24" class="mt7px">
          <div class="title-text">Align</div>
        </a-col>
        <a-col v-if="!isTextCurveElement" :span="24" class="flex">
          <div class="format-box">
            <ali-icon
              type="icon-iconoir_align-left"
              :size="18"
              @click="handleAlign('left')"
              :class="textAlign_ === 'left' ? 'active' : ''"
              :style="{ color: textAlign_ === 'left' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-si_align-center-line"
              :size="18"
              @click="handleAlign('center')"
              :class="textAlign_ === 'center' ? 'active' : ''"
              :style="{ color: textAlign_ === 'center' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-iconoir_align-right"
              :size="18"
              @click="handleAlign('right')"
              :class="textAlign_ === 'right' ? 'active' : ''"
              :style="{ color: textAlign_ === 'right' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-quill_text-justify"
              :size="18"
              @click="handleAlign('justify')"
              :class="textAlign_ === 'justify' ? 'active' : ''"
              :style="{ color: textAlign_ === 'justify' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-material-symbols-light_vertical-align-top-rounded"
              :size="18"
              @click="handleAlign('top')"
              :class="verticalAlign_ === 'top' ? 'active' : ''"
              :style="{ color: verticalAlign_ === 'top' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-material-symbols-light_vertical-align-center-round"
              :size="18"
              @click="handleAlign('middle')"
              :class="verticalAlign_ === 'middle' ? 'active' : ''"
              :style="{ color: verticalAlign_ === 'middle' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-material-symbols-light_vertical-align-bottom-round"
              :size="18"
              @click="handleAlign('bottom')"
              :class="verticalAlign_ === 'bottom' ? 'active' : ''"
              :style="{ color: verticalAlign_ === 'bottom' ? themeColor : '' }"
            ></ali-icon>
          </div>
        </a-col>
        <a-divider :margin="8"></a-divider>
        <a-col :span="14">
          <div class="title-text">Color</div>
          <div class="color-picker-container">
            <a-input
              size="mini"
              v-model="currentSelectColor"
              @change="handleCurrentChange"
              :maxlength="6"
              @focus="openColorPicker(0)"
              v-if="!isGradient"
              class="pl3px!"
            >
              <template #prefix>
                <a-button size="mini" class="icon-btn" @click="openColorPicker(0)">
                  <template #icon>
                    <div v-bind="colorBlock(0)"></div>
                  </template>
                </a-button>
              </template>
            </a-input>
            <a-input
              size="mini"
              v-model="currentSelectGradient"
              @change="handleCurrentChange"
              class="pl3px!"
              :maxlength="6"
              @focus="openColorPicker(0)"
              v-if="isGradient"
              readonly
            >
              <template #prefix>
                <a-button size="mini" class="icon-btn" @click="openColorPicker(0)">
                  <template #icon>
                    <div v-bind="colorBlock(0)"></div>
                  </template>
                </a-button>
              </template>
            </a-input>
            <div class="flex items-center" style="margin-top: 0px; margin-left: -55px; z-index: 9">
              <a-input-number
                size="mini"
                v-model="activeColorOpacity"
                style="width: 53px; height: 23px !important; text-align: right"
                :hide-button="true"
                :min="0"
                :max="100"
                :step="1"
                @change="changeOpacity"
                @focus="openColorPicker(0)"
              >
                <template #suffix>%</template>
              </a-input-number>
            </div>
          </div>
        </a-col>
        <a-col :span="10">
          <div class="title-text">List</div>
          <div class="list-box">
            <ali-icon
              type="icon-a-Frame540"
              :size="20"
              @click="handleList('ordered')"
              :class="listType === 'ordered' ? 'active' : ''"
              :style="{ color: listType === 'ordered' ? themeColor : '' }"
            ></ali-icon>
            <ali-icon
              type="icon-list7"
              :size="20"
              @click="handleList('unordered')"
              :class="listType === 'unordered' ? 'active' : ''"
              :style="{ color: listType === 'unordered' ? themeColor : '' }"
            ></ali-icon>
          </div>
        </a-col>
        <a-col :span="20" class="flex items-center justify-between mt7px">
          <div class="stoke-item">
            <div class="stoke-item-title">Line Height</div>
            <SwipeNumber
              size="small"
              sim-key="lineHeight"
              v-model="lineHeightActive"
              :step="1"
              :min="0"
              :hide-button="false"
              class="mt5px"
              @change="handleLineHeightChange"
            >
              <template #suffix>
                <div class="absolute top-1 right-1">%</div>
              </template>
            </SwipeNumber>
          </div>
          <div class="stoke-item">
            <div class="stoke-item-title">Letter Spacing</div>
            <SwipeNumber
              size="small"
              sim-key="letterSpacing"
              v-model="letterSpacing_"
              :min="0"
              :hide-button="false"
              class="mt5px"
              @change="handleLetterSpacingChange"
            >
            </SwipeNumber>
          </div>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<style scoped lang="less">
.text-common {
  position: relative;
}
.text-common::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
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
:deep(.t-color-picker__trigger--default__color .color-inner) {
  width: 18px;
  height: 18px;
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
.stoke-item {
  width: 48%;
  margin-top: 5px;
}
.stoke-item-title {
  font-size: 12px;
  color: #515151;
}
.superscript {
  vertical-align: super;
  font-size: 0.7em;
  position: relative;
  top: -0.5em;
}
.subscript {
  vertical-align: sub;
  font-size: 0.7em;
  position: relative;
  bottom: -0.5em;
}
:deep(.arco-select-view-single) {
  height: 26px !important;
}
.format-box {
  width: 100%;
  height: 25px;
  border-radius: 5px;
  background: rgba(237, 237, 237, 0.9333);
  display: flex;
  gap: 13px;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  & svg:hover {
    cursor: pointer;
    background-color: #ffffff;
    border-radius: 5px;
  }
}
.active {
  border-radius: 5px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1ca6c5;
  padding: 1px;
}
.color-picker-container {
  display: flex;
  align-items: center;
}
.icon-btn {
  width: 18px !important;
  height: 18px !important;
}
.icon-btn:not(.arco-btn-disabled):active {
  background-color: transparent !important;
}
.list-box {
  width: 100%;
  height: 25px;
  border-radius: 5px;
  background: rgba(237, 237, 237, 0.9333);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  & svg:hover {
    cursor: pointer;
    background-color: #ffffff;
    border-radius: 5px;
  }
}
:deep(.arco-slider-bar) {
  background-color: var(--primary-color);
}
:deep(.arco-slider-btn::after) {
  border-color: var(--primary-color);
}
:deep(.custom-placeholder .arco-select-view-input::placeholder) {
  color: #000000;
  font-size: 12px;
}
</style>
