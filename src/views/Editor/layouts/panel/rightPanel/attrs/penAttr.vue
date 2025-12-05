<script setup lang="ts">
import Panel from './panel.vue'
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import SwipeNumber from '@/components/swipeNumber'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { watch } from 'vue'
import { parseStrokeOrFill } from '@/views/Editor/utils/jsonParse'

const { canvas } = useEditor()

const stroke = useActiveObjectModel('stroke')

const { formatValue, colorBlock, changeColor, closeColorPicker, openColorPicker, readonly } = useColor(
  computed(() => stroke.value.modelValue),
  {
    attr: 'stroke',
    onChange() {
      stroke.value.onChange(strokeArray.value)
    }
  }
)

watch(canvas.activeObject, () => closeColorPicker())

const options = reactive([
  {
    value: 'inside',
    label: '内部'
  },
  {
    value: 'center',
    label: '居中'
  },
  {
    value: 'outside',
    label: '外部'
  }
])

const strokeJoinOptions = reactive([
  {
    value: 'miter',
    label: '直角'
  },
  {
    value: 'bevel',
    label: '平角'
  },
  {
    value: 'round',
    label: '圆角'
  }
])
const strokeCapOptions = reactive([
  {
    value: 'none',
    label: '无'
  },
  {
    value: 'round',
    label: '圆形'
  },
  {
    value: 'square',
    label: '方形'
  }
])

const strokeArray = ref([])
watchEffect(() => {
  if (stroke.value.modelValue) {
    strokeArray.value = parseStrokeOrFill(stroke.value.modelValue)
    // strokeArray.value = <any>stroke.value.modelValue
  } else {
    strokeArray.value = []
  }
})

const refreshStroke = () => {
  stroke.value.onChange(strokeArray.value.length <= 0 ? [] : strokeArray.value)
}
</script>

<template>
  <div class="p2 pen-attr">
    <a-row :gutter="[4, 4]" align="center">
      <a-col :span="24" style="width: 100%; display: flex; justify-content: space-between">
        <a-col :span="10">
          <div class="title-text">Weight</div>
          <SwipeNumber size="nini" v-model="canvas.ref.penDrawConfig.config.strokeWidth" :step="1" :min="1"> </SwipeNumber>
        </a-col>
        <a-col :span="14">
          <div class="title-text">Stroke</div>
          <a-color-picker v-model="canvas.ref.penDrawConfig.config.stroke" size="mini">
            <a-input size="mini" v-model="canvas.ref.penDrawConfig.config.stroke">
              <template #prefix>
                <div class="w18px h18px ml2px" :style="{ backgroundColor: canvas.ref.penDrawConfig.config.stroke }"></div>
              </template>
            </a-input>
          </a-color-picker>
        </a-col>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped lang="less">
.pen-attr {
  position: relative;
}
.pen-attr::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10px;
  right: 10px;
  height: 1px;
  background-color: rgb(var(--gray-3));
}
</style>
