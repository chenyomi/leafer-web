<template>
  <div class="picker-area-color">
    <div class="px10px py8px" v-if="['linear', 'radial'].includes(type)">
      <GradientPoints
        v-if="isGradient"
        :type="type"
        :points="points"
        :active-point-index="activePointIndex"
        :change-active-point-index="changeActivePointIndex"
        :update-gradient-left="updateGradientLeft"
        :add-point="addPoint"
        :remove-point="removePoint"
      />
    </div>

    <template v-if="['linear', 'radial'].includes(type)">
      <Degree :degree="degree" :update-color="updateColor" />
    </template>

    <Picker
      :red="red"
      :green="green"
      :blue="blue"
      :hue="hue"
      :alpha="alpha"
      :saturation="saturation"
      :type="type"
      :value="value"
      :update-color="updateColor"
    />

    <div class="preview">
      <!-- 吸管取色组件 -->
      <Straw @color-selected="(color: string) => updateColor(color)" :exclude-classes="['picker-area-color']" />
      <div class="color-hue-alpha">
        <Hue :hue="hue" :saturation="saturation" :value="value" :update-color="updateColor" />
        <Alpha :alpha="alpha" :red="red" :green="green" :blue="blue" :update-color="updateColor" :disabledFlag="disabledFlag" />
      </div>
      <Preview
        :red="red"
        :green="green"
        :blue="blue"
        :alpha="alpha"
        :is-gradient="isGradient"
        :points="points"
        :gradient-type="type"
        :degree="degree"
        :disabledFlag="disabledFlag"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import Picker from './Picker/index.vue'
  import Preview from './Preview/index.vue'
  import Hue from './Hue/index.vue'
  import Alpha from './Alpha/index.vue'
  import GradientPoints from './GradientPoints/index.vue'
  import { ColorPoint } from '@/components/colorPicker/interface'
  import Degree from './Degree/index.vue'
  import Straw from './Straw/straw.vue'
import { useEditor } from '@/views/Editor/app'
const { canvas } = useEditor()
// 颜色选择器的判断条件
const disabledFlag = ref(false);
console.log(canvas.activeObject.value.__tag);

// 判断选中的元素类型
if (canvas.activeObject.value.__tag == 'Frame') {
  disabledFlag.value = true;
  console.log(disabledFlag.value,'disabledFlag');
  
}
  const props = defineProps<{
    isGradient: boolean
    red: number
    green: number
    blue: number
    alpha: number
    hue: number
    saturation: number
    value: number
    updateColor: Function
    points: ColorPoint[]
    type: string
    activePointIndex: number
    changeGradientControl: Function
    changeActivePointIndex: Function
    updateGradientLeft: Function
    addPoint: Function
    removePoint: Function,
    degree: number,
    disabledFlag?: boolean
  }>()

</script>
