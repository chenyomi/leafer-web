<template>
  <!-- 评论操作弹窗 -->
  <div class="opration-box">
    <div class="opration-item flex items-center" v-for="(k, v) in filterOprationList" :key="v" @click.stop="handleBasicOpration(k, v)">
      <ali-icon :type="k.icon" :size="18" />
      <div class="opration-item-name ml6px">{{ k.name }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  filterOprationList: {
    icon: string
    name: string
  }[]
  commentData?: any
}>()
const emit = defineEmits(['handleBasicOpration'])
const handleBasicOpration = (k: any, v: any) => {
  emit('handleBasicOpration', k, v, props.commentData)
}
</script>

<style scoped lang="less">
.opration-box {
  position: absolute;
  top: 25px;
  right: 0px;
  z-index: 1000;
  width: 120px;
  border-radius: 10px;
  background: #ffffff;
  box-sizing: border-box;
  border: 1px solid #eaeaea;
  box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
  box-sizing: border-box;
  padding: 10px 5px;
  .opration-item {
    width: 100%;
    height: 30px;
    cursor: pointer;
    box-sizing: border-box;
    padding: 0 10px;
    &:hover {
      background: #e6e8e9;
      border-radius: 5px;
    }
    & svg {
      color: #6b6b6b !important;
    }
    .opration-item-name {
      font-size: 12px;
      color: #333333;
    }
  }
}
</style>
