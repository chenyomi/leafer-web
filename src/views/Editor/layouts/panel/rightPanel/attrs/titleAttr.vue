<template>
  <div class="title-attr p2">
    <div class="title-info" v-if="elementType === Tag.Group">
      {{ group }}
    </div>
    <div class="title-info" v-else-if="elementType === Tag.ClipImg || elementType === Tag.CustomCilpImg || elementType === Tag.Image">
      {{ image }}
    </div>
    <div class="title-info" v-else-if="elementType === Tag.SimulateElement">Design —— {{ selectedCount }} Selected</div>
    <div class="title-info" v-else>Design —— {{ elementType }}</div>
  </div>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import { ref } from 'vue'
import { EditorEvent } from '@leafer-in/editor'

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
const selectFn = () => {
  selectedCount.value = editor.getActiveObjects().length
}
onMounted(() => {
  //监听画布框选事件 获取当前选中元素个数
  editor.app.editor.on(EditorEvent.SELECT, selectFn)
})
onUnmounted(() => {
  editor.app.editor.off(EditorEvent.SELECT, selectFn)
})
watchEffect(() => {
  if (canvas.activeObject.value.app.editor.multiple) {
    selectFn()
  }
})
</script>

<style scoped lang="less">
.title-info {
  font-size: 14px;
  color: #000000;
  font-weight: bold;
}
</style>
