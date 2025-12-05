
<template>
  <a-row :wrap="false" :gutter="4">
    <a-col :span="5">
      <a-input-number size="mini" v-model="R" :maxlength="3" hide-button="true" @change="changeValue('red', R)"/>
    </a-col>
    <a-col :span="5">
      <a-input-number size="mini" v-model="G" :maxlength="3" hide-button="true" @change="changeValue('green', G)"/>
    </a-col>
    <a-col :span="5">
      <a-input-number size="mini" v-model="B" :maxlength="3" hide-button="true" @change="changeValue('blue', B)"/>
    </a-col>
    <a-col :span="10">
      <a-inputNumber
        size="mini"
        v-model="alpha"
        hide-button
        :min="0"
        :max="100"
        :disabled=props.disabledFlag
        @change="changeValue('alpha', alpha)"
      >
        <template #suffix>%</template>
      </a-inputNumber>
    </a-col>
  </a-row>
</template>

<script lang="ts" setup>
import {UpdateColor} from '@/components/colorPicker/interface'
import {Color, RGBA} from '@/utils/color/color'
import {toFixed} from '@/utils/math'
import {isDefined} from '@vueuse/core'
import { useState } from '@/hooks/useState'
import { ref } from 'vue'


const R = ref<number>(0)
const G = ref<number>(0)
const B = ref<number>(0)
const alpha = ref<number>(0)

const props = defineProps<{
  red: number
  green: number
  blue: number
  alpha: number
  updateColor: UpdateColor,
  disabledFlag: boolean
}>()
console.log(props.disabledFlag);

const {red, green, blue} = toRefs(props)
const hex = ref()

watchEffect(() => {
  R.value = Number(red.value)
  G.value = Number(green.value)
  B.value = Number(blue.value)
  alpha.value = toFixed(toRefs(props).alpha.value * 100)
  const color = new Color(new RGBA(red.value, green.value, blue.value))
  hex.value = Color.Format.CSS.formatHex(color).replace('#', '').toLocaleUpperCase()
})


//修改rgb数值
const changeValue = (field: string, newValue: string | number) => {
  const numValue = Number(newValue)
  if (isNaN(numValue)) return
  
  if (field === 'alpha') {
    props.updateColor({ a: numValue / 100 })
    return
  }
  
  const color = new Color(new RGBA(
    field === 'red' ? numValue : props.red,
    field === 'green' ? numValue : props.green,
    field === 'blue' ? numValue : props.blue,
    props.alpha
  ))
  
  const { h: hue, s: saturation, v } = color.hsva
  props.updateColor({
    ...color.rgba,
    hue,
    saturation,
    value: v,
  })
}

</script>

<style scoped lang="less">
:deep(.arco-input-wrapper){
  padding-left: 5px !important;
  padding-right: 5px !important;
}
</style>

