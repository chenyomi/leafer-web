<template>
    <a-row :wrap="false" :gutter="4">
        <a-col :span="12">
            <a-input size="mini" v-model="hex" :maxlength="6" @change="changeHex" />
        </a-col>
        <a-col :span="12">
            <a-inputNumber size="mini" v-model="alpha" hide-button :min="0" :max="100" @change="changeAlpha"
                :disabled=props.disabledFlag>
                <template #suffix>%</template>
            </a-inputNumber>
        </a-col>
    </a-row>
</template>

<script lang="ts" setup>
import { UpdateColor } from '@/components/colorPicker/interface'
import { Color, RGBA } from '@/utils/color/color'
import { toFixed } from '@/utils/math'
import { isDefined } from '@vueuse/core'
import { useState } from '@/hooks/useState'

const props =withDefaults(defineProps<{
    red: number
    green: number
    blue: number
    alpha: number
    updateColor: UpdateColor,
    disabledFlag: boolean
}>(),{
    disabledFlag: false
})

const { red, green, blue } = toRefs(props)
const hex = ref()
const alpha = ref()
const opacity = ref(100)
watchEffect(() => {
    const color = new Color(new RGBA(red.value, green.value, blue.value))
    hex.value = Color.Format.CSS.formatHex(color).replace('#', '').toLocaleUpperCase()
    alpha.value = toFixed(toRefs(props).alpha.value * 100)
})


const changeHex = (val: string) => {
    //如果输入不满足颜色格式或者输入为空，则还原为之前的值
    if (/[^#0-9A-Fa-f]/.test(val) || val.trim() === '') {
        // const color = Color.fromHex(`#${hex.replace('#', '')}`)
        // // rgba转成hex
        // hex = Color.Format.CSS.formatHex(color).replace('#', '')
        const color = new Color(new RGBA(red.value, green.value, blue.value))
        hex.value = Color.Format.CSS.formatHex(color).replace('#', '').toLocaleUpperCase()
        console.log(hex)
    }
    //如果输入1位数，则重复6次
    if (hex.value.length === 1) {
        hex.value = hex.value.repeat(6)
    }
    //如果输入2位数，则重复3次
    if (hex.value.length === 2) {
        hex.value = hex.value.repeat(3);
    }
    //如果输入是3位颜色，转换为6位
    if (hex.value.length === 3) {
        hex.value = hex.value.split('').map((c: string) => c + c).join('');
    }
    //如果输入是4位
    if (hex.value.length == 4) {
        const alphaHex = hex.value[3]
        const alphaValue = parseInt(alphaHex, 16) / 15
        opacity.value = Number.isInteger(alphaValue * 100)
            ? Math.round(alphaValue * 100)
            : Number((alphaValue * 100).toFixed(2))
        const colorPart = hex.value.slice(0, 3)
        alpha.value = opacity.value
        hex.value = colorPart.split('').map((c: string) => c + c).join('')
        // props.updateColor({
        //     a: opacity.value / 100, 
        // })
    }
    //如果输入是5位
    if (hex.value.length == 5) {
        const alphaHex = hex.value[4]
        const alphaValue = parseInt(alphaHex, 16) / 15
        opacity.value = Number.isInteger(alphaValue * 100)
            ? Math.round(alphaValue * 100)
            : Number((alphaValue * 100).toFixed(2))
        const colorPart = hex.value.slice(0, 4)
        hex.value = colorPart.split('').map((c: string) => c + c).join('')
        alpha.value = opacity.value
        // props.updateColor({
        //     a: opacity.value / 100, 
        // })
    }
    // console.log(hex.value)
    const color = Color.fromHex(`#${hex.value.replace('#', '')}`)
    const { h: hue, s: saturation, v: value } = color.hsva
    // console.log(color.rgba,props.alpha)
    props.updateColor({
        r: color.rgba.r,
        g: color.rgba.g,
        b: color.rgba.b,
        a: opacity.value / 100,
        hue,
        saturation,
        value,
    })
}

const changeAlpha = (alpha: number | undefined) => {
    if (!isDefined(alpha)) return
    props.updateColor({
        a: alpha / 100,
    })
}
</script>
