<template>
  <div class="painter-title-attr">
    <div class="field flex items-center" v-if="materialName">
      <template v-if="!isEdit">
        <div class="icon-name">{{ materialName }}</div>
        <img src="@/assets/images/material-edit.png" alt="icon" class="icon-edit" @click="handleEdit" />
      </template>
      <template v-else>
        <input class="input" v-model="materialName" @blur="handleBlur" @keydown.enter="handleBlur" />
      </template>
    </div>
    <div class="field flex items-center" v-else>
      <div class="icon-name">Settings</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import emitter from '@/utils/eventBus'

const materialName = ref('')
const isEdit = ref(false)

onMounted(() => {
  emitter.on('activeLayer', (layer: any) => {
    console.log(layer)
    if (layer) {
      materialName.value = layer.name
    }
  })
})
/**
 * 编辑操作
 * @returns {void}
 */
const handleEdit = (): void => {
  console.log('handleEdit')
  isEdit.value = true
}

/**
 * 失去焦点
 * @returns {void}
 */
const handleBlur = (): void => {
  isEdit.value = false
}
</script>

<style scoped lang="less">
.painter-title-attr {
  padding: 0 10px;
  .field {
    padding: 5px 0;
    border-bottom: 1px solid #eaeaea;
  }
  .icon-name {
    font-size: 18px;
    color: #000;
    font-weight: 700;
  }
  .icon-edit {
    width: 18px;
    height: 18px;
    margin-left: 10px;
    cursor: pointer;
  }
  .input,
  .select {
    border: none;
    outline: none;
    width: 100%;
    height: 32px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 0 8px;
  }
}
</style>
