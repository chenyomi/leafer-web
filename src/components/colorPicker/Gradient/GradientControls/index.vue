<template>
  <div class="gradient-controls">
    <a-radio-group
      size="small"
      :model-value="type"
      type="button"
      @change="(type: any) => changeGradientControl(type as ColorType)"
    >
      <a-radio value="color">纯色</a-radio>
      <a-radio value="linear">线性渐变</a-radio>
      <a-radio value="radial" v-if="props.activeObject.name !== 'Text' && props.activeObject.tag !== 'Text'">径向渐变</a-radio>
      <!-- <a-radio value="pattern">图案</a-radio> -->
    </a-radio-group>
  </div>
</template>

<script lang="ts" setup>
  import { ColorType } from '@/components/colorPicker/interface'
  const props = defineProps<{
    type: ColorType
    activeObject: any
    changeGradientControl: (type: ColorType) => void
  }>()
</script>

<style lang="less" scoped>
  :deep(.arco-radio-group-button) {
    width: 100%;

    .arco-radio-button {
      flex: 1;
      text-align: center;

      .arco-radio-button-content {
        font-size: 12px;
      }
    }
  }
</style>
