<template>
  <div class="color-preview-area">
    <a-space>
      <a-select :model-value="localMode" @update:model-value="handleModeChange" size="mini" class="w-75px">
        <a-option value="hex">HEX</a-option>
        <a-option value="rgb">RGB</a-option>
      </a-select>
      <Hex v-if="localMode === 'hex'" :red="props.red" :green="props.green" :blue="props.blue" :alpha="props.alpha"
        :disabledFlag="disabledFlag" :update-color="props.updateColor" />
      <RGB v-else-if="localMode === 'rgb'" :red="props.red" :green="props.green" :blue="props.blue" :alpha="props.alpha"
        :disabledFlag="disabledFlag" :update-color="props.updateColor" />
    </a-space>
    <!-- 颜色历史记录 -->
    <div class="system-color-item-title">最近使用颜色</div>
    <div class="system-color-list">
      <div class="system-color-item" v-for="(item, index) in historyColors" :key="index">
        <div class="system-color-item-color" :style="{ backgroundColor: item }" @click="handleHistoryColorClick(item)">
        </div>
      </div>
    </div>
    <!-- 系统预设颜色 -->
    <div class="system-color-item-title">色卡</div>
    <div class="system-color-list">
      <div class="system-color-item" v-for="(item, index) in systemColors" :key="index">
        <div class="system-color-item-color" :style="{ backgroundColor: item }" @click="handleSystemColorClick(item)">
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Hex from './Hex/index.vue'
import RGB from './RGB/index.vue'
import { Mode, UpdateColor } from '@/components/colorPicker/interface'
import { Color } from '@/utils/color/color'
import { RGBA } from '@/utils/color/color'
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useColorUpdate } from '@/store/modules/colorUpdate'
import { useEditor } from '@/views/Editor/app'
import { useColorStore } from '@/store/modules/color'
const { canvas } = useEditor()
// 颜色选择器的判断条件
const disabledFlag = ref(false);
console.log(canvas.activeObject.value.__tag);
const historyColorStore = useColorStore() //颜色历史记录
const historyColors = computed(() => historyColorStore.historyColors)

// 判断选中的元素类型
if (canvas.activeObject.value.__tag == 'Frame') {
  disabledFlag.value = true;
}
const props = withDefaults(defineProps<{
  mode?: Mode
  red: number
  green: number
  blue: number
  alpha: number
  updateColor: UpdateColor,
  disabledFlag?: boolean
}>(), {
  disabledFlag: false
})

const emit = defineEmits<{
  (e: 'update:mode', value: Mode): void
}>()

const colorStore = useColorUpdate() //输入框颜色变化触发颜色选择器更新
const localMode = ref<Mode>(props.mode || 'hex')

// 监听 store 中的颜色变化
watch(() => colorStore.currentColor, (newColor) => {
  console.log(newColor.rgba)
  //将rgba的颜色转化为r g b a
  const { r, g, b, a } = newColor.getRgba()
  props.updateColor({
    r,
    g,
    b,
    a,
    hue: newColor.states.h,
    saturation: newColor.states.s,
    value: newColor.states.v,
  })
}, { deep: true })

const handleModeChange = (value: Mode) => {
  localMode.value = value
  emit('update:mode', value)
}

const color = computed(() => ({
  red: props.red,
  green: props.green,
  blue: props.blue,
  alpha: props.alpha
}))

//系统预设颜色
// const systemColors = ref([
//   '#00B42A',
//   '#3C7EFF',
//   '#FF7D00',
//   '#F76965',
//   '#F7BA1E',
//   '#F5319D',
//   '#D91AD9',
//   '#9FDB1D',
//   '#FADC19',
//   '#722ED1',
//   '#3491FA',
//   '#393C8B'
// ])

const systemColors = ref([
  '#000000','#282828','#424242','#585858','#6E6E6E','#838383','#979797','#ACACAC','#C1C1C1','#D5D5D5','#E6E6E6','#EEEEEE',
  '#7B0000','#980A0A','#B01A1A','#BD3535','#D04B4B','#E26464','#EC8282','#F69C9C','#FFB7B7','#FFC6C6','#FFDFDF','#FFEFEF',
  '#6F1F01','#862505','#A2340F','#B94318','#CB552A','#DA663F','#E17F5B','#ED9A7E','#F9BAA6','#FCCEBE','#FFDDD2','#FFEFE9',

  '#6E3B00','#8B4B02','#A55B0B','#B76C0A','#C87F25','#E29B44','#F1B05B','#F9BE77','#FBCF94','#FFDFB4','#FFE8CD','#FFF1E0',
  '#575000','#796D00','#918300','#A29A05','#B0A50B','#C3B539','#D0C44B','#DBD457','#E7E16F','#F6EF8B','#FDFAB8','#FFFDDA',
  '#2E5102','#3A6A07','#467A11','#578B18','#669F1A','#7AB533','#8ECA51','#A3D46F','#C0E39D','#D9F3BF','#E6FFCD','#F1FFE2',

  '#01493E','#005E4D','#0D7062','#167F6F','#2B947F','#42AC99','#5FCDBE','#7CE1D5','#98EADB','#B6EFE3','#D3F7F1','#E9FFFA',
  '#012B41','#004164','#106085','#106E97','#2487B2','#3F9DC6','#62B3D9','#85C8E6','#A2D9ED','#C2E7F8','#D6F3FF','#EAF9FF',
  '#0B2476','#1C3A94','#3754AC','#4C6CC6','#617ED5','#7995E9','#8CA6F4','#A5BAF9','#C2D2FF','#D6E0FF','#E3EBFF','#F1F5FF',

  '#32196A','#4A2D87','#5A3B9C','#6E50B3','#8367CA','#9879DA','#AA8EE6','#BFA8F1','#D2C0FB','#E3D7FD','#EDE6FB','#F5F1FF',
  '#49095D','#602178','#793490','#8F45A8','#A35BBD','#B56ECE','#C889DD','#DAA2EF','#E8C4F4','#F7DDFF','#F8E4FF','#FBF2FF',
  '#56023F','#740857','#8A1D68','#A53180','#BD4B99','#CE69B3','#E188C5','#EFA1D7','#F6B5E2','#FECBED','#FEDCF5','#FDEBF7',
])

//应用系统颜色
const handleSystemColorClick = (color: string) => {
  const colorObj = Color.fromHex(`#${color.replace('#', '')}`)
  // colorStore.updateColor(colorObj)
  props.updateColor({
    r: colorObj.rgba.r,
    g: colorObj.rgba.g,
    b: colorObj.rgba.b,
    a: props.alpha,
    hue: colorObj.hsva.h,
    saturation: colorObj.hsva.s,
    value: colorObj.hsva.v,
  })
}

// 应用历史颜色
const handleHistoryColorClick = (color: string) => {
  const colorObj = Color.fromHex(`#${color.replace('#', '')}`)
  // colorStore.updateColor(colorObj)
  props.updateColor({
    r: colorObj.rgba.r,
    g: colorObj.rgba.g,
    b: colorObj.rgba.b,
    a: props.alpha,
    hue: colorObj.hsva.h,
    saturation: colorObj.hsva.s,
    value: colorObj.hsva.v,
  })
}


</script>

<style lang="less" scoped>
.system-color-item-title {
  font-size: 12px;
  font-weight: 400;
  color: #1d2129;
  margin-bottom: 6px;
  margin-top: 6px;
}

.system-color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.system-color-item {
  width: 16px;
  height: 16px;
  cursor: pointer;

  .system-color-item-color {
    width: 100%;
    height: 100%;
    border-radius: 2px;
  }

  &:hover {
    transform: scale(1.1);
  }
}
</style>
