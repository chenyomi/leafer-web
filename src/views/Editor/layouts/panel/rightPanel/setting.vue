<script setup lang="ts">
import { isDefined, useResizeObserver } from '@vueuse/core'

import BaseAttr from './attrs/baseAttr.vue'
import CanvasAttr from './attrs/canvasAttr.vue'
import BoxAttr from './attrs/boxAttr.vue'
import TailorAttr from './attrs/tailorAttr.vue'
import VirtualElementAttr from './attrs/virtualElementAttr.vue'
import SvgAttr from './attrs/svgAttr.vue'
import FillColorAttr from './attrs/fillColorAttr.vue'
import StrokeColorAttr from './attrs/strokeColorAttr.vue'
import EffectAttr from './attrs/effectAttr.vue'
import TextCommon from './attrs/textCommon.vue'
import ElementStrokeAttr from './attrs/elementStrokeAttr.vue'
import TitleAttr from './attrs/titleAttr.vue'
import EffectCommonAttr from './attrs/effectCommonAttr.vue'
import CommentAttr from './attrs/commentAttr.vue'
import { appInstance, useEditor } from '@/views/Editor/app'
import { typeUtil } from '@/views/Editor/utils/utils'
import { useAppStore } from '@/store'
import { MaterialTypeEnum } from '@/enums/materalType'
import { useRuleStore } from '@/store/modules/rule'
import { SimulateAttrController } from './SimulateTempAttr'
const simulateAttr = new SimulateAttrController()
provide('simulateAttr', simulateAttr)
const listBySimulate = simulateAttr.getList()
const ruleStore = useRuleStore()
const ruleShow = computed(() => {
  return ruleStore.ruleShow
})
const { editor, canvas } = useEditor()
const { activeTool } = storeToRefs(useAppStore())
const splitRef = ref()
const treeHeight = ref(0)
const elementType = computed(() => {
  if (canvas.activeObject.value?.tag == 'Box' && canvas.activeObject.value?.findOne('ShapeLine')) {
    return canvas.activeObject.value?.findOne('ShapeLine').tag
  } else if (canvas.activeObject.value?.tag == 'Group' && canvas.activeObject.value?.name === 'Text') {
    return canvas.activeObject.value?.findOne('Text').tag || 'Text'
  } else {
    return canvas.activeObject.value?.tag
  }
})
// const activeObject = canvas.activeObject.value
onMounted(() => {
  // 更新tree组件的高度
  useResizeObserver(splitRef.value as HTMLDivElement, (entries) => {
    const [entry] = entries
    const { height } = entry.contentRect
    treeHeight.value = height - 43
  })
})
onUnmounted(() => {
  simulateAttr.dispose()
})

const componentList = computed(() => {
  const activeObject = editor.activeObject.value
  return [
    {
      name: 'CanvasAttr',
      component: CanvasAttr,
      visual: typeUtil.isBottomCanvas(activeObject)
    },
    {
      name: 'VirtualElementAttr',
      component: VirtualElementAttr,
      visual: typeUtil.isVirtualElement(activeObject)
    },
    {
      name: 'TitleAttr',
      component: TitleAttr,
      visual: !typeUtil.isVirtualOrBottom(activeObject),
      props: {
        elementType: elementType.value
      }
    },
    {
      name: 'BaseAttr',
      component: BaseAttr,
      visual: !typeUtil.isVirtualOrBottom(activeObject)
    },
    // 文本组件
    {
      name: 'TextCommon',
      component: TextCommon,
      visual: isDefined(activeObject) && (editor.activeObjectIsType('Text', 'HTMLText') || canvas.activeObject.value?.name === 'Text')
    },
    // 填充颜色组件
    {
      name: 'FillColorAttr',
      component: FillColorAttr,
      visual:
        (isDefined(activeObject) &&
          !typeUtil.isVirtualOrBottom(activeObject) &&
          activeObject.name !== 'Text' &&
          !editor.activeObjectIsType('Text', 'Image', 'Group', 'SimulateElement', 'Pen') &&
          activeObject?.tag !== 'Arrow' &&
          activeObject?.tag !== 'Line' &&
          activeObject?.tag !== 'ShapeLine' &&
          !activeObject?.findOne('ShapeLine') &&
          editor.getActiveMaterialType() !== MaterialTypeEnum.OFFICIAL_MATERIAL) ||
        (activeObject?.tag === 'Line' && activeObject?.closed)
    },
    // 描边颜色组件  line 和 arrow
    {
      name: 'StrokeColorAttr',
      component: StrokeColorAttr,
      visual:
        isDefined(activeObject) &&
        !typeUtil.isVirtualOrBottom(activeObject) &&
        !editor.activeObjectIsType('Image', 'Text', 'Group', 'SimulateElement', 'Pen') &&
        (activeObject?.tag == 'Line' || activeObject?.tag === 'Arrow' || activeObject?.tag === 'ShapeLine' || activeObject?.findOne('ShapeLine'),
        activeObject?.tag === 'ShapeLine' || activeObject?.findOne('ShapeLine') || activeObject?.tag === 'Line' || activeObject?.tag === 'Arrow')
    },
    // 元素描边组件
    {
      name: 'ElementStrokeAttr',
      component: ElementStrokeAttr,
      visual:
        (isDefined(activeObject) &&
          !typeUtil.isVirtualOrBottom(activeObject) &&
          !editor.activeObjectIsType('Image', 'Text', 'Group', 'SimulateElement', 'Pen', 'ClipImg', 'CustomCilpImg') &&
          activeObject?.tag !== 'Line' &&
          activeObject?.tag !== 'Arrow' &&
          activeObject?.tag !== 'ShapeLine' &&
          !activeObject?.findOne('ShapeLine') &&
          activeObject.name !== 'Text') ||
        ((activeObject?.tag === 'ClipImg' || activeObject?.tag === 'CustomCilpImg') && canvas.ref.isClip.value)
    },
    // Effect组件
    {
      name: 'EffectAttr',
      component: EffectAttr,
      visual: isDefined(activeObject) && !typeUtil.isVirtualOrBottom(activeObject) && editor.activeObjectIsType('Image', 'ClipImg', 'CustomCilpImg')
    },
    {
      name: 'BoxAttr',
      component: BoxAttr,
      visual:
        editor.activeObjectIsType('Box') &&
        !activeObject?.findOne('ShapeLine') &&
        !activeObject?.findOne('ShapeRect') &&
        !activeObject?.findOne('ShapePolygon') &&
        !activeObject?.findOne('ShapeEllipse') &&
        !activeObject.findOne('ShapeStar') &&
        activeObject.name !== 'Text'
    },
    {
      name: 'SvgAttr',
      component: SvgAttr,
      visual: editor.activeObjectIsType('ClipImg', 'CustomCilpImg')
    },
    {
      name: 'TailorAttr',
      component: TailorAttr,
      visual: editor.activeObjectIsType('ClipImg', 'CustomCilpImg')
    },
    // 阴影
    // 模糊
    {
      name: 'EffectCommonAttr',
      component: EffectCommonAttr,
      visual: editor.activeObjectIsType('ClipImg', 'CustomCilpImg', 'Image')
    }
  ]
})

const pluginSolts = appInstance.editor.getPluginSlots('rightPanel')
</script>

<template>
  <div
    ref="splitRef"
    class="ovf"
    :class="{ 'comment-atttr-box': activeTool === 'comment' }"
    style="transition: 0.2s all ease-in-out"
    :style="!ruleShow && 'height:calc(100vh - 100px);'"
  >
    <div v-if="activeTool !== 'comment'">
      <template v-for="(com, index) in canvas.activeObject.value?.tag === 'SimulateElement' ? listBySimulate : componentList" :key="com.name">
        <template v-if="com.visual">
          <component :is="com.component" :elementType="elementType" />
        </template>
      </template>
      <template v-for="(com, index) in pluginSolts" :key="index">
        <component :is="com" />
      </template>
    </div>
    <div v-else>
      <div class="title-tips p2">
        <div class="title-info">Comment</div>
      </div>
      <CommentAttr />
    </div>
  </div>
</template>

<style scoped lang="less">
.ovf {
  width: 286px;
  height: calc(100vh - 125px);
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: var(--chakra-shadows-touch);
  border-radius: 5px;
  background: #ffffff;
  box-sizing: border-box;
  border: 1px solid #cbcbcb;
}
.comment-atttr-box {
  overflow-y: hidden !important;
}
//隐藏滚动条
::-webkit-scrollbar {
  display: none;
}

.ovf .arco-divider-horizontal {
  width: 95%;
  max-width: 95%;
  min-width: 95%;
  margin: 0 0 0 2.5% !important;
}
.title-tips {
  padding-bottom: 0px !important;
}
.title-info {
  padding: 0px 0 8px 0;
  border-bottom: 1px solid #e5e6eb;
}
</style>
