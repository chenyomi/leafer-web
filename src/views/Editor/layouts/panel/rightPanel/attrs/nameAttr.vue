<template>
  <div class="title-attr p2">
    <div class="title-info">
      <!-- 非编辑态展示名称 -->
      <div class="flex items-center" v-if="!isEditing">
        <span>{{ activeName }}</span>
        <img src="@/assets/images/material-edit.png" alt="icon" class="icon-edit" @click="startEdit" v-if="canShow"/>
      </div>
      <!-- 编辑态输入框 -->
      <input
        v-else
        ref="nameInputRef"
        type="text"
        class="title-edit-input"
        v-model="activeNameEdit"
        @blur="saveEdit"
        @keydown.enter.prevent="saveEdit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { EditorEvent } from '@leafer-in/editor'
import emitter from '@/utils/eventBus'
import { useComAndTemp } from '@/hooks/useMaterialType'

const { canShow } = useComAndTemp() // 是否可以编辑文件名

const props = defineProps<{
  elementType: string
}>()

//元素类型
enum Tag {
  Text = 'Text',
  Image = 'Image',
  Group = 'Group',
  SimulateElement = 'SimulateElement',
  Line = 'Line',
  Arrow = 'Arrow',
  Rect = 'Rect',
  Circle = 'Circle',
  Ellipse = 'Ellipse',
  Polygon = 'Polygon',
  Star = 'Star',
  ClipImg = 'ClipImg',
  CustomCilpImg = 'CustomCilpImg'
}

const group = ref('Group')
const image = ref('Image')
const { editor, canvas } = useEditor()
const selectedCount = ref(0)

//监听画布框选事件 获取当前选中元素个数
editor.app.editor.on(EditorEvent.SELECT, (arg: EditorEvent) => {
  selectedCount.value = editor.getActiveObjects().length
})

//获取当前选中元素的name
const activeName = ref('') //当前svg元素的name
const activeNameEdit = ref('') // 编辑态的名称
const isEditing = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

// 添加详情名称状态
const detailName = ref('') // 来自详情的名称（优先级最高）

/**
 * 获取最终显示的名称
 * @description 根据优先级获取名称：详情名称（绝对优先） > 活动对象名称 > 默认名称
 * @returns {string} 最终显示的名称
 */
const getDisplayName = (): string => {
  const activeObject = canvas.activeObject.value
  let objectName = activeObject?.name || ''
  if(activeObject?.tag == 'Line'){
    objectName = 'Line'
  } else if(activeObject?.tag =='ShapeLine'){
    objectName = 'Brackets'
  } else if((activeObject.tag == 'Box') && activeObject.children?.[0]?.tag == 'ShapeLine'){
    objectName = 'Circular'
  } else if(activeObject.tag == 'Group' && activeObject.children?.[0]?.children?.[0]?.tag == 'ShapeLine'){
    objectName = 'Circular'
  }
  const detail = detailName.value || ''
  const defaultName = ''

  console.log('getDisplayName - 名称获取详情:', {
    detailName: detail,
    objectName: objectName,
    defaultName: defaultName,
    activeObject: activeObject,
    elementType: props.elementType
  })

  // 详情名称具有绝对优先级，如果存在详情名称，始终使用详情名称
  if (detail) {
    console.log('getDisplayName - 使用详情名称（绝对优先）:', detail)
    return detail
  }

  // 只有在没有详情名称的情况下，才考虑使用活动对象名称
  if (objectName) {
    console.log('getDisplayName - 无详情名称，使用活动对象名称:', objectName)
    return objectName
  }

  // 最后使用默认名称
  console.log('getDisplayName - 使用默认名称:', defaultName)
  return defaultName
}

/**
 * 更新显示名称
 * @description 调用getDisplayName获取最新名称并更新activeName
 */
const updateDisplayName = (): void => {
  const newName = getDisplayName()
  console.log('【名称更新跟踪】updateDisplayName - 更新前activeName:', activeName.value)
  console.log('【名称更新跟踪】updateDisplayName - 获取到的新名称:', newName)
  console.log('【名称更新跟踪】updateDisplayName - 当前详情名称:', detailName.value)
  activeName.value = newName
  console.log('【名称更新跟踪】updateDisplayName - 更新后activeName:', activeName.value)
  // 如果不在编辑状态，同步编辑态的值
  if (!isEditing.value) {
    activeNameEdit.value = newName
    console.log('【名称更新跟踪】updateDisplayName - 同步编辑态名称:', activeNameEdit.value)
  }
}

/**
 * 监听来自submit.vue的名称变更事件
 * @description 当submit.vue中的formData.name变化时，同步更新本地显示和活动对象
 */
onMounted(() => {
  // 主动获取当前名称状态
  //   console.log('【组件初始化】nameAttr组件初始化，主动获取名称状态')
  //   console.log('【组件初始化】初始详情名称:', detailName.value)
  //   console.log('【组件初始化】初始activeName:', activeName.value)
  updateDisplayName()
  //   console.log('【组件初始化】初始化完成后activeName:', activeName.value)

  emitter.on('submit-name-change' as any, (newName: string, isDetailMode?: boolean) => {
    try {
      console.log('nameAttr收到submit名称变更:', newName, '是否详情模式:', isDetailMode)
      console.log('当前详情名称状态:', detailName.value)
      
      // 只有在明确指定为详情模式时，才更新详情名称
      // 这可以确保只有真正从详情进入的场景才启用详情保护
      if (isDetailMode) {
        const previousDetailName = detailName.value
        detailName.value = newName || ''
        console.log('详情名称更新（仅详情模式）:', {
          previous: previousDetailName,
          current: detailName.value,
          newName: newName
        })
      } else {
        console.log('非详情模式，不更新详情名称，保持名称跟随活跃对象变化')
      }

      // 更新显示名称
      updateDisplayName()

      // 更新活动对象的名称（如果存在且名称不同）
      const obj: any = canvas.activeObject.value
      if (obj && obj.name !== newName && newName) {
        if (typeof obj.set === 'function') {
          obj.set({ name: newName })
        } else {
          obj.name = newName
        }
        console.log('nameAttr已同步活动对象名称:', newName)
      }
    } catch (e) {
      console.warn('nameAttr同步名称时发生异常:', e)
    }
  })

  // 主动请求当前名称（通过事件通知submit.vue发送当前名称）
  emitter.emit('request-current-name' as any)
})

/**
 * 组件卸载时清理事件监听
 */
onUnmounted(() => {
  emitter.off('submit-name-change' as any)
})

watch(
  () => canvas.activeObject.value,
  async (newVal, oldVal) => {
    console.log('活动对象变化:', {
      newName: newVal?.name,
      oldName: oldVal?.name,
      detailName: detailName.value,
      hasDetailName: !!detailName.value
    })

    // 如果有详情名称，保持显示详情名称（详情保护模式）
    if (detailName.value) {
      console.log('【详情名称保护】存在详情名称，活动对象变化不影响显示名称，保持详情名称:', detailName.value)
      activeName.value = detailName.value
      if (!isEditing.value) {
        activeNameEdit.value = detailName.value
      }
    } else {
      // 没有详情名称时，确保名称跟随当前活跃对象变化
      console.log('无详情名称，活动对象名称变化会影响显示名称')
      
      // 直接使用活跃对象的名称
      if (newVal) {
        console.log(newVal,newVal.tag)
        let objectName = newVal.name || ''
        if(newVal.tag == 'Line'){
          objectName = 'Line'
        } else if(newVal.tag == 'ShapeLine'){
          objectName = 'Brackets'
        } else if(newVal.tag == 'Box' && newVal.children?.[0]?.tag == 'ShapeLine'){
          objectName = 'Circular'
        } else if(newVal.tag == 'Group' && newVal.children?.[0]?.children?.[0]?.tag == 'ShapeLine'){
          objectName = 'Circular'
        } else {
          activeName.value = objectName
        }
        console.log('使用新活跃对象的名称:', objectName)
        // activeName.value = objectName
        if (!isEditing.value) {
          activeNameEdit.value = objectName
        }
      } else {
        // 如果没有活跃对象，清空名称
        console.log('没有活跃对象，清空名称显示')
        activeName.value = ''
        if (!isEditing.value) {
          activeNameEdit.value = ''
        }
      }
    }

    // 切换对象时退出编辑态，避免误编辑
    isEditing.value = false
  },
  { immediate: true }
)

/**
 * 开始编辑名称（双击触发）
 * @param {MouseEvent} e - 双击事件
 * @returns {void}
 */
function startEdit(e?: MouseEvent): void {
  //   if (!(props.elementType === Tag.ClipImg || props.elementType === Tag.Image)) return
  isEditing.value = true
  // 聚焦输入框
  nextTick(() => {
    nameInputRef.value?.focus()
    // 将光标移到末尾
    const el = nameInputRef.value
    if (el) {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  })
}

/**
 * 保存编辑后的名称
 * - 更新画布活动对象的 name
 * - 通过事件总线广播，供 submit.vue 同步 formData.name
 * @returns {void}
 */
function saveEdit(): void {
  const newName = (activeNameEdit.value || '').trim()
  // 空名称直接退出，不做修改
  if (!newName) {
    isEditing.value = false
    return
  }

  console.log('保存编辑名称:', newName)

  // 更新当前活动对象的名称
  const obj: any = canvas.activeObject.value
  if (obj) {
    // 优先使用 set 以触发内部更新
    if (typeof obj.set === 'function') {
      obj.set({ name: newName })
    } else {
      obj.name = newName
    }
    console.log('已更新活动对象名称:', newName)
  }

  // 不再自动设置详情名称，让名称能够跟随当前活跃对象变化
  // 只更新活动对象的name属性，不影响详情名称状态
  console.log('编辑名称后，不设置详情名称，保持名称跟随活跃对象变化')

  // 更新显示名称
  updateDisplayName()

  // 退出编辑态
  isEditing.value = false

  // 广播名称更新事件，供其他模块（如提交弹窗）同步
  /**
   * 事件：active-object-name-edit
   * @description 当标题处编辑名称后广播新名称
   * @type {string}
   */
  emitter.emit('active-object-name-edit' as any, newName)
  console.log('已广播名称编辑事件:', newName)
}
</script>

<style scoped lang="less">
.title-info {
  font-size: 14px;
  color: #000000;
  font-weight: bold;
}
.title-attr {
  box-sizing: border-box;
  border-bottom: 1px solid #eaeaea;
}
.title-edit-input {
  border: none;
  outline: none;
  width: 100%;
  height: 32px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 0 8px;
}
.icon-edit {
  width: 18px;
  height: 18px;
  margin-left: 10px;
  cursor: pointer;
}
</style>
