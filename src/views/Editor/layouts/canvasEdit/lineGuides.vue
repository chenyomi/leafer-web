<template>
  <div class="line-guides">
    <a-select :style="{ width: '150px' }" placeholder="" v-model="localUnitValue" @change="handleSelectChange">
      <a-option label="像素(px)" value="px">像素(px)</a-option>
      <a-option label="英寸(in)" value="in">英寸(in)</a-option>
      <a-option label="厘米(cm)" value="cm">厘米(cm)</a-option>
      <!-- <a-option label="毫米(mm)" value="mm">毫米(mm)</a-option> -->
      <!-- <a-option label="点(pt)" value="pt">点(pt)</a-option>
      <a-option label="派卡(pc)" value="pc">派卡(pc)</a-option>
      <a-option label="自定义单位(cs)" value="cs">自定义单位(cs)</a-option> -->
    </a-select>
  </div>
</template>


<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { IEventbusService } from '@/views/Editor/core/eventbus/eventbusService';
import { useEditor } from '@/views/Editor/app';
import { useActiveObjectModel } from '@/views/Editor/hooks/useActiveObjectModel';
import useUnitStore from '@/store/modules/unit';

const { event, canvas } = useEditor();

//引入单位转换store
const unitStore = useUnitStore()

//当前下拉框展示单位（如果缓存有，通过store获取，否则默认px）
const localUnitValue = ref(unitStore.unit) || 'px'

// 组件挂载时同步标尺单位
onMounted(() => {
  // 确保标尺单位与存储的单位一致
  canvas.changeUnit(unitStore.unit)
})

//单位切换
const handleSelectChange = (value: string) => {
  //把切换后的单位存入store
  unitStore.setUnit(value)
  //把切换后的单位存入eventbus
  event.emit('unitChange', value)
  //调用mLeaferCanvas的changeUnit方法更新标尺单位
  canvas.changeUnit(value)
}



</script>


<style scoped lang="less">
.line-guides {
  margin-left: 20px;
}
</style>
