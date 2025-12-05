<template>
  <div class="collect-item-preview" v-if="isShowPreview" :style="{ width: width + 'px', right: right + 'px', top: top + 'px' }">
    <div class="collect-item-preview-content">
      <div class="preview-name">{{ currentName }}</div>
      <div class="preview-icon">
        <img :src="currentIcon" alt="" class="preview-icon-img" :style="{ width: ImgWidth + 'px', height: imgHeight + 'px' }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  //预览图显示状态
  isShowPreview: {
    type: Boolean,
    default: false
  },
  //当前预览图片
  currentIcon: {
    type: String,
    default: ''
  },
  //当前icons名称
  currentName: {
    type: String,
    default: ''
  },
  //外部盒子宽度
  width: {
    type: Number,
    default: 140
  },
  right: {
    type: Number,
    default: -145
  },
  top: {
    type: Number,
    default: 30
  },
  //预览图宽度
  ImgWidth: {
    type: Number,
    default: 120
  },
  //预览图高度
  imgHeight: {
    type: Number,
    default: 120
  }
})
</script>

<style lang="less" scoped>
.collect-item-preview {
  position: absolute;
  top: 30px;
  right: -145px;
  width: 120px;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  padding: 10px 0;
  box-sizing: border-box;
  .preview-name {
    padding: 0 2px;
    text-align: center;
    font-size: 12px;
    color: #767676;
    font-weight: bold;
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
  }
  .preview-icon {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    .preview-icon-img {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }
  }
}
</style>
