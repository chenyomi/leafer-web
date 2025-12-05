<template>
  <div class="p2 custom-box">
    <a-space direction="vertical" style="width: 100%" v-if="!canvas.ref.isSvgpreview.value">
      <a-row :gutter="[4, 4]" align="center">
        <a-col :span="18">
          <div class="title-text">Effect</div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between" v-if="isSVg">
          <div class="effect-item">Saturation</div>
          <div class="effect-content flex items-center justify-between">
            <a-slider
              :default-value="svgSaturation"
              v-model="svgSaturation"
              style="margin-right: 10px"
              :min="0"
              :max="200"
              size="mini"
              @change="(e: number) => handleChangeSvg(e, 'saturation')"
            />
            <div class="effect-item">{{ svgSaturationStr }}</div>
          </div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between mt5px">
          <div class="effect-item">Shadow</div>
          <div class="effect-content flex items-center justify-between">
            <a-slider
              :default-value="0"
              v-model="shadow"
              style="margin-right: 10px"
              :step="1"
              :min="0"
              :max="100"
              size="mini"
              @change="() => canvas.undoRedo.save(61)"
            />
            <div class="effect-item">{{ shadowStr }}</div>
          </div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between mt5px">
          <div class="effect-item">Transparency</div>
          <!-- 用于调整svg素材透明度 -->
          <div class="effect-content flex items-center justify-between" v-if="isSVg">
            <a-slider
              :default-value="svgTransparency"
              v-model="svgTransparency"
              style="margin-right: 10px"
              :step="1"
              :min="0"
              :max="100"
              size="mini"
              @change="(e: number) => handleChangeSvg(e, 'transparency')"
            />
            <div class="effect-item">{{ svgTransparencyStr }}</div>
          </div>
          <div class="effect-content flex items-center justify-between" v-else>
            <a-slider
              :default-value="elementOpacity"
              style="margin-right: 10px"
              :step="1"
              :min="0"
              :max="100"
              size="mini"
              @change="(e: number) => handleChangeSvg(e, 'elementOpacity')"
            />
            <div class="effect-item">{{ elementOpacity }}%</div>
          </div>
        </a-col>
      </a-row>
    </a-space>
    <!-- 设置 svg子图层的饱和度和透明度 -->
    <a-space direction="vertical" style="width: 100%" v-else>
      <a-row :gutter="[4, 4]" align="center">
        <a-col :span="18">
          <div class="title-text">Effect</div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between">
          <div class="effect-item">Saturation</div>
          <div class="effect-content flex items-center justify-between">
            <a-slider
              :default-value="childerSaturation"
              v-model="childerSaturation"
              class="m-r-2"
              :min="0"
              :max="200"
              size="mini"
              @change="(e: number) => handleChange(e, 'saturation')"
            />
            <div class="effect-item">{{ childerSaturation }}%</div>
          </div>
        </a-col>
        <a-col :span="24" class="flex items-center justify-between mt5px">
          <div class="effect-item">Transparency</div>
          <div class="effect-content flex items-center justify-between">
            <a-slider
              :default-value="childerTransparency"
              v-model="childerTransparency"
              class="m-r-2"
              :step="1"
              :min="0"
              :max="100"
              size="mini"
              @change="(e: number) => handleChange(e, 'transparency')"
            />
            <div class="effect-item">{{ childerTransparency }}%</div>
          </div>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<script setup lang="ts">
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel'
import { useEditor } from '@/views/Editor/app'
import { watch, watchEffect, unref, onMounted, onBeforeUnmount } from 'vue'
import { Image } from 'leafer-ui'
import { UI } from 'leafer-ui'
import { changeSaturation, changeSvgSaturation, changeSvgTransparency, changeTransparency } from '@/utils/analysisSvg'
import _, { isNumber } from 'lodash'
import NP from 'number-precision'

const { canvas, editor } = useEditor()

const debounceChangeSvgSaturation = _.debounce((num: number) => {
  changeSvgSaturation(num)
}, 200)

const debounceChangeSaturation = _.debounce((num: number) => {
  changeSaturation(num)
}, 200)

const debounceChangeSvgTransparency = _.debounce((num: number) => {
  changeSvgTransparency(num)
}, 200)

const debounceChangeChildTransparency = _.debounce((num: number) => {
  changeTransparency(num)
}, 200)
// 元素阴影
const shadowModel = useActiveObjectModel('shadow')
// 元素透明度
const transparencyModel = useActiveObjectModel('opacity')
/**
 * 转换为百分比透明度
 * @description 使用 NP.times 进行精确乘法运算，避免浮点数乘法精度误差
 * 例如：避免 0.57 * 100 = 56.99999999999999 的精度问题
 */
const elementOpacity = computed(() => {
  return NP.times(Number(transparencyModel.value.modelValue), 100)
})
const childerSaturation = ref(100) //子图层饱和度默认值
const childerTransparency = ref(100) //子图层透明度默认值
const svgSaturation = ref(100) //饱和度默认值
const svgSaturationStr = ref<any>('100') //饱和度默认值
const svgTransparency = ref(100) //透明度默认值
const svgTransparencyStr = ref<any>('100')
const svgShadow = ref(0) //阴影默认值
const isSVg = ref(false) // 是否是svg图片

//每次进入页面，获取当前选中的元素的阴影，通过computed计算出阴影的blur
const shadowStr = ref<any>('0')
const shadow = computed<number>({
  get: () => {
    if (canvas.activeObject.value.tag === 'SimulateElement') {
      let s = editor.getAttributeValue('shadow', 0)
      if (s === false) {
        // false 返回意思是不同的存在 就是Mixed
        shadowStr.value = 'Mixed'
        return s
      } else if (s === 0) {
        // 0 返回意思是存在这个相同的0还有就是默认没有设置的 默认值也是0的情况
        shadowStr.value = s + '%'
        return s
      } else {
        // 正常切换的 时候显示的数值
        shadowStr.value = s[0].spread + '%'
        return s && s[0] ? s[0].spread : 0
      }
    } else {
      const s = (canvas.activeObject.value as any).shadow
      // 正常切换的 时候显示的数值
      if(s) {
        shadowStr.value = s[0].spread + '%'
        return s && s[0] ? s[0].spread : 0
      } else {
      shadowStr.value = 0+ '%'
      return 0
      }

    }
  },
  set: (newVal: number) => {
    editor.dateEdit((e) => {
      const newShadow = {
        x: 0,
        y: 0,
        blur: 10,
        spread: newVal,
        color: 'rgba(151,151,151,0.2)',
        box: false,
        visible: true
      }
      if (newVal > 0) {
        e.shadow = [newShadow]
      } else {
        e.shadow = []
      }
    })
  }
})

// 切换活动对象时，更新图层信息
watch(
  () => canvas.activeObject.value,
  async (newActiveObject) => {
    if (canvas.activeObject.value.tag === 'SimulateElement') {
      isSVg.value = true
      const globalSaturation = editor.getAttributeValue('data.saturationInfo.globalSaturation', 100)
      if (globalSaturation === false) {
        svgSaturation.value = 0
        svgSaturationStr.value = 'Mixed'
      } else {
        svgSaturation.value = globalSaturation
        svgSaturationStr.value = svgSaturation.value + '%'
      }
      const globalTransparency = editor.getAttributeValue('data.transparencyInfo.globalTransparency', 100)
      if (globalTransparency === false) {
        svgTransparency.value = 0
        svgTransparencyStr.value = 'Mixed'
      } else {
        svgTransparency.value = globalTransparency
        svgTransparencyStr.value = svgTransparency.value + '%'
      }
    } else {
      if (!editor.activeObjectIsType('ClipImg', 'CustomCilpImg')) return
      const svgObj = newActiveObject as any
      const svgUrl = svgObj.fill[0].url as string
      // 不是svg 图片
      if (!svgUrl?.toLowerCase().includes('.svg') && !svgUrl?.toLowerCase().includes('data:image/svg+xml')) {
        isSVg.value = false
        return
      }
      isSVg.value = true
      // 获取 svg图层整体饱和度
      if (svgObj.data.saturationInfo?.globalSaturation) {
        svgSaturation.value = svgObj.data.saturationInfo.globalSaturation
        svgSaturationStr.value = svgSaturation.value + '%'
      } else {
        svgSaturation.value = 100
        svgSaturationStr.value = 100 + '%'
      }
      // 获取 svg图层整体透明度
      if (svgObj.data.transparencyInfo?.globalTransparency) {
        svgTransparency.value = svgObj.data.transparencyInfo.globalTransparency
        svgTransparencyStr.value = svgObj.data.transparencyInfo.globalTransparency + '%'
      } else {
        svgTransparency.value = 100
        svgTransparencyStr.value = 100 + '%'
      }
    }
  },
  {
    immediate: true
  }
)
// 监听svgpreviewId，当有值时，获取当前选中的id子图层的的饱和度和透明度
watch(
  () => canvas.ref.svgpreviewId.value,
  async (newVal) => {
    if (newVal) {
      const activeObject = canvas.activeObject.value as any
      const svgData = activeObject.data
      // 获取当前选中的图层的饱和度
      if (svgData.saturationInfo?.childSaturationInfo) {
        // 匹配查找设置过的子图层的饱和度
        const svgInfo = svgData.saturationInfo?.childSaturationInfo.find((item: { id: string }) => item.id === newVal.id)
        // 设置过则设置饱和度
        if (svgInfo) {
          childerSaturation.value = svgInfo.saturation
        } else {
          // 没有设置过显示整体的饱和度
          childerSaturation.value = svgData.saturationInfo?.globalSaturation || 100
        }
      } else {
        // 没有设置过显示整体的饱和度
        childerSaturation.value = svgData.saturationInfo?.globalSaturation || 100
      }

      // 获取当前选中的图层的透明度
      if (svgData.transparencyInfo?.childTransparencyInfo) {
        // 匹配查找设置过的子图层的透明度
        const svgInfo = svgData.transparencyInfo?.childTransparencyInfo.find((item: { id: string }) => item.id === newVal.id)
        // 设置过则设置透明度
        if (svgInfo) {
          childerTransparency.value = svgInfo.transparency
        } else {
          // 没有设置过显示整体的透明度
          childerTransparency.value = svgData.transparencyInfo?.globalTransparency || 100
        }
      } else {
        // 没有设置过显示整体的透明度
        childerTransparency.value = svgData.transparencyInfo?.globalTransparency || 100
      }
    }
  },
  { deep: true }
)

// svg图片修改整体饱和度和透明度，记录修改的数值
const handleChangeSvg = (num: number, type: string) => {
  switch (type) {
    case 'saturation':
      debounceChangeSvgSaturation(num)
      svgSaturation.value = num
      svgSaturationStr.value = num + '%'
      break
    case 'transparency':
      debounceChangeSvgTransparency(num)
      svgTransparency.value = num
      svgTransparencyStr.value = num + '%'
      break
    case 'elementOpacity':
      /**
       * 使用 NP.divide 进行精确除法运算，避免浮点数精度误差
       * @description 将百分比透明度值 (0-100) 转换为内部透明度值 (0-1)
       * 例如：避免 1/100 = 0.010000000000000002 的精度问题
       */
      transparencyModel.value.onChange(NP.divide(num, 100))
      console.log(transparencyModel.value, '---transparencyModel.value')
      break
  }
  // 记录操作添加到历史
  canvas.undoRedo.save(62)
}

// 子图层改变透明度和饱和度，记录修改的数值
const handleChange = (num: number, type: string) => {
  switch (type) {
    case 'saturation':
      debounceChangeSaturation(num)
      childerSaturation.value = num
      break
    case 'transparency':
      debounceChangeChildTransparency(num)
      childerTransparency.value = num
      break
  }
}

//监听阴影
const shadowArray = ref([])
watchEffect(() => {
  if (shadowModel.value.modelValue) {
    // 确保 shadowArray.value 是一个数组
    if (Array.isArray(shadowModel.value.modelValue)) {
      shadowArray.value = [...shadowModel.value.modelValue]
    } else {
      // 如果不是数组，创建一个新数组
      shadowArray.value = []
    }
  } else {
    shadowArray.value = []
  }
})
</script>

<style scoped lang="less">
.effect-item {
  font-size: 12px;
  color: #515151;
  margin-right: 10px;
}
.effect-content {
  width: 180px;
}
:deep(.arco-slider-btn::after) {
  border: 1px solid #727272;
  z-index: 100;
}
:deep(.arco-slider-bar) {
  background-color: #727272;
}
</style>
