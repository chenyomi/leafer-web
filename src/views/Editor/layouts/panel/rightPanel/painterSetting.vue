<script setup lang="ts">
import { isDefined, useResizeObserver } from '@vueuse/core'
import { ref, computed, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'

import BaseAttr from './attrs/baseAttr.vue'
import CanvasAttr from './attrs/canvasAttr.vue'
import BoxAttr from './attrs/boxAttr.vue'
import TailorAttr from './attrs/tailorAttr.vue'
import VirtualElementAttr from './attrs/virtualElementAttr.vue'
import SvgAttr from './attrs/svgAttr.vue'
import PenAttr from './attrs/penAttr.vue'
import FillColorAttr from './attrs/fillColorAttr.vue'
import StrokeColorAttr from './attrs/strokeColorAttr.vue'
import StyleAttr from './attrs/styleAttr.vue'
import LineStyleAttr from './attrs/lineStyleAttr.vue'
import OaEffectAttr from './attrs/oaEffectAttr.vue'
import TextCommon from './attrs/textCommon.vue'
import ElementStrokeAttr from './attrs/elementStrokeAttr.vue'
import NameAttr from './attrs/nameAttr.vue'
import EffectCommonAttr from './attrs/effectCommonAttr.vue'
import PainterCommentAttr from './attrs/painterCommentAttr.vue'
import HistoryAttr from './attrs/historyAttr.vue'
import PainterTitleAttr from './attrs/painterTitleAttr.vue'
import Submit from '@/views/Editor/layouts/header/right/submit.vue'
import { appInstance, useEditor } from '@/views/Editor/app'
import { typeUtil } from '@/views/Editor/utils/utils'
import { useAppStore } from '@/store'
import { useUserStore } from '@/store/modules/user'
import { MaterialTypeEnum } from '@/enums/materalType'
import { useSaveCanvas } from '@/hooks/useSaveCanvas'
import { useRoute, useRouter } from 'vue-router'
import { auditMaterialApi } from '@/api/audit/material'
import { canvasApi } from '@/api/save/canvas'
import { svgUrlToBase64 } from '@/utils/analysisSvg'
import { isUrl, isLocalPath } from '@/utils/stringUtils'
import { Message } from '@arco-design/web-vue'
import emitter from '@/utils/eventBus'
import { unlockAllElements, restoreFromSavedState, type ElementLockState } from '@/utils/elementLockManager'
const route = useRoute()
const router = useRouter()
const outId = route.query.dashboardId ? route.query.dashboardId : route.query.id //画板外部id
const materialType = route.query?.materialType //当前素材类型

import { SimulateAttrController } from './SimulateTempAttr'
const simulateAttr = new SimulateAttrController()
provide('simulateAttr', simulateAttr)
const listBySimulate = simulateAttr.getList()

const userStore = useUserStore()
const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息
const teamId = computed(() => userInfo.value?.teamIds[0] || 0) //获取用户团队id
const projectId = computed(() => userInfo.value?.projectIds[0] || 0) //获取用户项目id

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

const activeObject = canvas.activeObject.value
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

import { useMaterialType } from '@/hooks/useMaterialType'

// 调用素材类型hooks
const { isShow } = useMaterialType()

const componentList = computed(() => {
  const activeObject = editor.activeObject.value
  console.log(typeUtil.isBottomCanvas(activeObject), activeObject)
  return [
    {
      name: 'CanvasAttr',
      component: CanvasAttr,
      visual: editor.activeObjectIsType('Frame')
    },
    {
      name: 'VirtualElementAttr',
      component: VirtualElementAttr,
      visual: typeUtil.isVirtualElement(activeObject)
    },
    {
      name: 'NameAttr',
      component: NameAttr,
      visual: !typeUtil.isVirtualOrBottom(activeObject) && !editor.activeObjectIsType('Frame'),
      props: {
        elementType: elementType.value
      }
    },
    {
      name: 'BaseAttr',
      component: BaseAttr,
      visual: !typeUtil.isVirtualOrBottom(activeObject) && !editor.activeObjectIsType('Frame') && isShow.value
    },
    // 文本组件
    {
      name: 'TextCommon',
      component: TextCommon,
      visual:
        isDefined(activeObject) &&
        !editor.activeObjectIsType('Frame') &&
        (editor.activeObjectIsType('Text', 'HTMLText') || canvas.activeObject.value?.name === 'Text')
    },
    // 填充颜色组件
    {
      name: 'FillColorAttr',
      component: FillColorAttr,
      visual:
        (isDefined(activeObject) &&
          !typeUtil.isVirtualOrBottom(activeObject) &&
          !editor.activeObjectIsType('Frame') &&
          activeObject.name !== 'Text' &&
          !editor.activeObjectIsType('Text', 'Image', 'Group', 'SimulateElement', 'Pen') &&
          activeObject?.tag !== 'Arrow' &&
          activeObject?.tag !== 'Line' &&
          activeObject?.tag !== 'ShapeLine' &&
          !activeObject?.findOne('ShapeLine') &&
          editor.getActiveMaterialType() !== MaterialTypeEnum.OFFICIAL_MATERIAL &&
          editor.getActiveMaterialType() !== MaterialTypeEnum.OFFICIAL_COMPONENT) ||
        (activeObject?.tag === 'Line' && activeObject?.closed)
    },
    // 描边颜色组件  line 和 arrow
    {
      name: 'StrokeColorAttr',
      component: StrokeColorAttr,
      visual:
        isDefined(activeObject) &&
        !typeUtil.isVirtualOrBottom(activeObject) &&
        !editor.activeObjectIsType('Frame') &&
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
          !editor.activeObjectIsType('Frame') &&
          !editor.activeObjectIsType('Image', 'Text', 'Group', 'SimulateElement', 'Pen', 'ClipImg', 'CustomCilpImg') &&
          activeObject?.tag !== 'Line' &&
          activeObject?.tag !== 'Arrow' &&
          activeObject?.tag !== 'ShapeLine' &&
          !activeObject?.findOne('ShapeLine') &&
          activeObject.name !== 'Text') ||
        ((activeObject?.tag === 'ClipImg' || activeObject?.tag === 'CustomCilpImg') && canvas.ref.isClip.value)
    },
    // style组件，用于形状的fill跟stroke
    {
      name: 'StyleAttr',
      component: StyleAttr,
      visual:
        (isDefined(activeObject) &&
          !typeUtil.isVirtualOrBottom(activeObject) &&
          !editor.activeObjectIsType('Frame') &&
          activeObject.name !== 'Text' &&
          !editor.activeObjectIsType('Text', 'Image', 'Group', 'SimulateElement', 'Pen') &&
          activeObject?.tag !== 'Arrow' &&
          activeObject?.tag !== 'Line' &&
          activeObject?.tag !== 'ShapeLine' &&
          !activeObject?.findOne('ShapeLine') &&
          editor.getActiveMaterialType() !== MaterialTypeEnum.OFFICIAL_MATERIAL &&
          editor.getActiveMaterialType() !== MaterialTypeEnum.OFFICIAL_COMPONENT) ||
        (activeObject?.tag === 'Line' && activeObject?.closed)
    },
    // 线段相关style组件
    {
      name:'LineStyleAttr',
      component: LineStyleAttr,
      visual:
        isDefined(activeObject) &&
        !typeUtil.isVirtualOrBottom(activeObject) &&
        !editor.activeObjectIsType('Frame') &&
        !editor.activeObjectIsType('Image', 'Text', 'Group', 'SimulateElement', 'Pen') &&
        (activeObject?.tag == 'Line' || activeObject?.tag === 'Arrow' || activeObject?.tag === 'ShapeLine' || activeObject?.findOne('ShapeLine'),
        activeObject?.tag === 'ShapeLine' || activeObject?.findOne('ShapeLine') || activeObject?.tag === 'Line' || activeObject?.tag === 'Arrow')
    },
    // Effect组件 === style
    {
      name: 'OaEffectAttr',
      component: OaEffectAttr,
      visual:
        isDefined(activeObject) &&
        !typeUtil.isVirtualOrBottom(activeObject) &&
        !editor.activeObjectIsType('Frame') &&
        (editor.activeObjectIsType('Image') || editor.activeObjectIsType('ClipImg') || editor.activeObjectIsType('CustomCilpImg')) &&
        isShow.value
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
      name: 'PenAttr',
      component: PenAttr,
      visual: activeTool.value === 'pen' || activeTool.value === 'penDrawToLine'
    },
    {
      name: 'TailorAttr',
      component: TailorAttr,
      visual: editor.activeObjectIsType('ClipImg', 'CustomCilpImg')
    },
    {
      name: 'EffectCommonAttr',
      component: EffectCommonAttr,
      visual: editor.activeObjectIsType('ClipImg', 'CustomCilpImg', 'Image') && isShow.value
    }
  ]
})

const pluginSolts = appInstance.editor.getPluginSlots('rightPanel')

//历史记录按钮拖拽相关状态
const isDragging = ref(false)
const wasDragged = ref(false) // 用于跟踪是否发生了实际的拖拽移动
const historyBtnPosition = ref({
  bottom: 20,
  right: 20
})

//画布更新相关参数
const formData = reactive({
  name: '',
  categoryIds: [],
  tagIds: [],
  outId: '',
  materialVersion: '',
  status: '',
  cnDescription: '',
  enDescription: '',
  awsVersion: '',
  materialType: ''
})

const id = ref('') //当前画布id
const pageOutId = ref('') //当前页面id
const meterialType = ref('1') //当前是否是素材
const meterialOutId = ref('') //当前素材id
onMounted(() => {
  // 更新tree组件的高度
  useResizeObserver(splitRef.value as HTMLDivElement, (entries) => {
    const [entry] = entries
    const { height } = entry.contentRect
    treeHeight.value = height - 43
  })

  //获取素材相关参数
  emitter.on('getMaterialDetail', (res) => {
    console.log(res, '素材信息')
    formData.name = (res as { name: string }).name || 'Page'
    id.value = (res as { boardOutId: string }).boardOutId
    pageOutId.value = (res as { pageOutId: string }).pageOutId
    meterialType.value = (res as { materialType: string }).materialType
    formData.outId = (res as { outId: string }).outId || ''
    formData.materialVersion = (res as { materialVersion: string }).materialVersion || ''
    formData.awsVersion = (res as { awsVersion: string }).awsVersion || ''
    formData.cnDescription = (res as { cnDescription: string }).cnDescription || ''
    formData.enDescription = (res as { enDescription: string }).enDescription || ''
    formData.categoryIds = (res as { categoryList: any[] }).categoryList.map((item: any) => item.id) || []
    formData.tagIds = (res as { tagList: any[] }).tagList.map((item: any) => item.id) || []
    formData.materialType = (res as { materialType: string }).materialType || ''
    console.log(formData, '表单提交数据')
  })
})

/**
 * 打开历史记录
 */
const openHistory = () => {
  if (activeTool.value !== 'history') {
    activeTool.value = 'history'
  } else {
    activeTool.value = 'select'
  }
}

/**
 * 开始拖拽历史记录按钮
 * @param {MouseEvent} e - 鼠标事件对象
 */
const startDrag = (e: MouseEvent) => {
  e.stopPropagation() // 阻止事件冒泡，避免触发按钮点击事件
  isDragging.value = true
  wasDragged.value = false // 重置拖拽状态

  // 添加鼠标移动和松开事件监听
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

/**
 * 拖拽过程中更新按钮位置
 * @param {MouseEvent} e - 鼠标事件对象
 */
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  const container = splitRef.value as HTMLDivElement
  if (!container) return

  // 标记已经发生了实际的拖拽移动
  wasDragged.value = true

  const rect = container.getBoundingClientRect()
  const btnSize = 40 // 按钮大小

  // 计算相对于容器的位置
  const right = Math.max(0, rect.right - e.clientX - btnSize / 2)
  const bottom = Math.max(0, rect.bottom - e.clientY - btnSize / 2)

  // 限制在容器内
  const maxRight = rect.width - btnSize
  const maxBottom = rect.height - btnSize

  // 拖拽后的位置
  historyBtnPosition.value = {
    right: Math.min(maxRight, Math.max(0, right)),
    bottom: Math.min(maxBottom, Math.max(0, bottom))
  }
}

/**
 * 结束拖拽，保存按钮位置
 */
const stopDrag = () => {
  isDragging.value = false

  // 移除事件监听
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}
const submitVisible = ref(false) //提交弹窗
const previewUrl = ref('') //提交图片
const isActiveElement = ref(false) //是否为选中元素提交

/**
 * 提交画布，生成并展示预览图
 * 逻辑：临时解锁所有元素 -> 条件编组/直接导出 -> 还原锁定与画布状态。
 * @function handleSubmit
 * @returns {Promise<void>} 无返回值；预览图 URL 写入 `previewUrl`
 */
const handleSubmit = async (): Promise<void> => {
  isActiveElement.value = false // 提交整个画布
  const { editor } = useEditor()

  // 所有子元素（包含被锁定的元素）
  const allChildren = editor.contentFrame.children
  console.log(allChildren, '编组前的元素')

  // 画布为空时不能提交
  if (allChildren.length === 0) {
    Message.error('不能提交空素材')
    return
  }
  submitVisible.value = true

  // 保存当前选中状态和画布状态
  const originalActiveObjects = canvas.getActiveObjects()
  const originalCanvasState = editor.contentFrame.toJSON()

  // 临时解锁所有元素（修复素材类型为1从草稿/审核进入时被锁导致预览缺失）
  /**
   * 保存并解锁当前画布元素锁定状态
   * @type {ElementLockState[]}
   */
  const savedLockStates: ElementLockState[] = unlockAllElements(editor)

  // 临时编组/导出用于生成预览图
  /**
   * 根据元素数量选择导出策略：
   * - 单元素：直接导出该元素
   * - 多元素：编组后导出组节点
   */
  try {
    let result: any
    if (allChildren.length === 1) {
      // 仅一个元素，直接导出该元素
      result = await (allChildren[0] as any).export('png', {
        blob: true,
        trim: false,
        pixelRatio: 4,
        fill: 'transparent'
      })
    } else {
      // 多元素，先编组再导出组节点
      canvas.app.editor.select(allChildren)
      canvas.app.editor.group()
      const rootChildren: any[] = editor.contentFrame.children as any[]
      const groupedNode: any = rootChildren.find((c: any) => c?.tag === 'Group') || rootChildren[0]
      result = await groupedNode.export('png', {
        blob: true,
        trim: false,
        pixelRatio: 4,
        fill: 'transparent'
      })
    }

    if (result && result.data) {
      const url = URL.createObjectURL(result.data)
      previewUrl.value = url
    }
  } catch (error) {
    console.error('导出预览图失败:', error)
  } finally {
    // 恢复原始状态
    await nextTick()

    // 直接通过 set 还原画布 JSON（比先解组再 removeAll 更稳妥）
    canvas.contentFrame.set(originalCanvasState)

    // 恢复原始选中状态
    if (originalActiveObjects.length > 0) {
      try {
        // 安全检查：确保对象仍然有效
        const validObjects = originalActiveObjects.filter(obj => obj && obj.leafer);
        if (validObjects.length > 0) {
          canvas.setActiveObjects(validObjects);
        } else {
          // 如果没有有效对象，清除选中状态
          canvas.discardActiveObject();
          console.warn('无法恢复选中状态：所有对象引用已失效');
        }
      } catch (error) {
        // 捕获任何可能的错误，确保程序继续执行
        console.error('恢复选中状态时出错：', error);
        canvas.discardActiveObject();
      }
    } else {
      canvas.discardActiveObject()
    }

    // 恢复锁定状态，避免图标类素材在编辑器中被误解锁
    try {
      restoreFromSavedState(savedLockStates)
    } catch (e) {
      console.warn('恢复锁定状态失败：', e)
    }

    canvas.childrenEffect()
    console.log('已恢复原始画布状态并还原锁定状态')
  }
}

const imgUrl = ref('')

//保存画布
const handleSave = async () => {
  console.log(canvas, '---canvas')
  const pageId = localStorage.getItem('pageId')
  const isMeterial = localStorage.getItem('isMeterial')
  const materialId = localStorage.getItem('materialId')
  const materialType = localStorage.getItem('materialType')
  //如果是素材进来就调用更新素材
  if (isMeterial == '1') {
    const { editor, canvas } = useEditor()
    //提交素材获取签名
    let saveInfo
    if (materialId) {
      // 如果有素材id，调用接口时传递该参数
      saveInfo = await auditMaterialApi.getMaterialUploadSignature(id.value, pageOutId.value, materialId)
    } else {
      // 如果没有素材id，调用接口时不传该参数
      saveInfo = await auditMaterialApi.getMaterialUploadSignature(id.value, pageOutId.value)
    }
    console.log(saveInfo)
    const jsonUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.json')
    const coverUplod = saveInfo.presignList.find((item: any) => item.fileExtension === '.png')
    editor.contentFrame.name = formData.name
    editor.contentFrame.data.materialId = formData.outId || '' //添加materialId
    editor.contentFrame.data.materialMainVersion = formData.materialVersion + '_' + formData.awsVersion || '' //添加materialMainVersion

    // 获取画布JSON数据
    const dataUrl = editor.contentFrame.toJSON()
    //需要递归遍历jsonData的children，当tag为ClipImg的时候，需要将fill里面的url转换成base64
    const convertClipImgUrlToBase64 = async (obj: any) => {
      if (obj.tag === 'ClipImg' || obj.tag === 'CustomCilpImg') {
        if (obj.fill && obj.fill[0].url && (isUrl(obj.fill[0].url) || isLocalPath(obj.fill[0].url))) {
          obj.fill[0].url = await svgUrlToBase64(obj.fill[0].url)
        }
      }
      if (obj.children) {
        obj.children.forEach(convertClipImgUrlToBase64)
      }
    }
    await convertClipImgUrlToBase64(dataUrl)
    console.log(dataUrl, '转换后的jsonData')
    const jsonData = JSON.stringify(dataUrl, null, '\t')
    canvas.zoomToFit() //加载素材时，自适应画布大小

    dataUrl.name = formData.name //同步更新画布名称
    let result
    const group = editor.contentFrame.children //获取所有子元素
    console.log(group, '3232323232')
    canvas.app.editor.select(group)
    canvas.app.editor.group()
    console.log(group)

    result = await group[0].export('png', {
      blob: true,
      trim: false,
      pixelRatio: 4,
      fill: 'transparent'
    })
    // 同时触发两个上传接口
    await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
    try {
      const res = await auditMaterialApi.editMaterial(formData)
      console.log(res, '---提交')
      Message.success('提交成功')
      setTimeout(() => {
        router.back()
      }, 1000)
    } catch (error) {
      console.error('提交素材时出错:', error)
    } finally {
      // loading.value = false
      // 确保在导出完成后立即解组
      // 使用nextTick确保DOM更新完成后再解组
      await nextTick()
      // canvas.app.editor.ungroup()
      // 解组后取消框选
      canvas.discardActiveObject()
      canvas.childrenEffect()
    }
  } else {
    //如果是草稿箱进来的就调用page回调
    await useSaveCanvas(teamId.value, projectId.value, outId, pageId) //调用保存画布公共方法
    router.back() //返回到首页
  }
  const { editor } = useEditor()
  console.log(editor, '---editor')
  const result = await editor.contentFrame.export('json')
  console.log(result, '---result')
}
</script>

<template>
  <div ref="splitRef" class="ovf" :class="{ 'comment-atttr-box': activeTool === 'comment' }">
    <div class="hand-box flex items-center justify-between">
      <div class="hand-box-item submit-btn" @click="handleSubmit">
        <ali-icon type="icon-shangchuan" :size="16" />
        <span class="ml-5px">Submit</span>
      </div>
      <div class="hand-box-item save-btn" @click="handleSave" v-if="materialType != '3'">
        <ali-icon type="icon-save-line" :size="24" />
        <span class="ml-5px">Save</span>
      </div>
    </div>
    <div v-if="activeTool !== 'comment' && activeTool !== 'history'">
      <!-- 标题内容 - 只在没有选中元素时显示 -->
      <PainterTitleAttr v-if="canvas.activeObject.value?.tag == 'Frame'" />
      <template v-for="(com, index) in canvas.activeObject.value?.tag === 'SimulateElement' ? listBySimulate : componentList" :key="com.name">
        <template v-if="com.visual">
          <component :is="com.component" :elementType="elementType" />
        </template>
      </template>
    </div>
    <div v-else-if="activeTool === 'comment'">
      <PainterCommentAttr />
    </div>
    <div v-else-if="activeTool === 'history'">
      <HistoryAttr />
    </div>
    <!-- 历史记录按钮 -->
    <div
      class="histroty-btn"
      :class="activeTool == 'history' ? 'box-select' : 'box-history'"
      :style="{
        bottom: `${historyBtnPosition.bottom}px`,
        right: `${historyBtnPosition.right}px`,
        cursor: isDragging ? 'default' : 'default'
      }"
      @mousedown.prevent="startDrag"
      @click.stop="!wasDragged && openHistory()"
    >
      <ali-icon
        type="icon-jam_history"
        :size="20"
        class="history-icon"
        :class="activeTool == 'history' ? 'icon-select' : 'default-history'"
      ></ali-icon>
    </div>
    <!-- 提交弹窗 -->
    <Submit v-model:visible="submitVisible" v-model:previewUrl="previewUrl" :isActiveElement="isActiveElement" />
  </div>
</template>

<style scoped lang="less">
.ovf {
  width: 286px;
  height: calc(100vh - 20px);
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
.hand-box {
  padding: 20px 10px 10px 10px;
  user-select: none;
  .hand-box-item {
    width: 120px;
    height: 30px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }
  .submit-btn {
    background-color: var(--audit-color);
    color: #fff;
  }
  .save-btn {
    background-color: #fff;
    color: var(--audit-color);
    border: 2px solid var(--audit-color);
  }
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
.histroty-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border: 1px solid #76a2db;
  background-color: #f0f6fe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: box-shadow 0.2s ease;
  z-index: 100;
  &:hover {
    box-shadow: 0 0 5px rgba(118, 162, 219, 0.5);
  }
  &:active {
    cursor: grabbing;
  }
  img {
    width: 20px;
    height: 20px;
    object-fit: contain;
    background-size: 100% 100%;
  }
}
.default-history {
  color: #76a2db;
}
.icon-select {
  color: #ffffff !important;
}
.box-select {
  background-color: #76a2db;
}
</style>
