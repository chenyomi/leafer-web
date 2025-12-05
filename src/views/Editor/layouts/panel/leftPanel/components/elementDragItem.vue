<template>
  <div class="element-box">
    <div class="element-item" v-for="(item, index) in props.data" :key="index">
      <div class="shape-type flex items-center justify-between">
        <div class="shape-type-name" :style="{ color: themeColor }">{{ item.type }}</div>
        <div class="icon">
          <icon-down />
        </div>
      </div>
      <div class="children mt10px">
        <div
          class="children-box"
          v-for="(child, index) in item.children"
          :key="index"
          @click="handleClick(child)"
          draggable="true"
          @dragend="(event) => handleDragEnd(event, child)"
        >
          <ali-icon :type="child.icon" :size="child.size" class="icon-item" v-if="item.type != 'Font'" style="stroke: none;"></ali-icon>
          <img :src="child.icon" alt="" class="icon-item" v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'

const { canvas } = useEditor()

import { useAppStore } from '@/store'
const { activeTool } = storeToRefs(useAppStore())

import { useRoleTheme } from '@/hooks/useRoleTheme'
const { themeColor } = useRoleTheme()

interface Item {
  type: string // 根据实际情况定义其他属性
  children: Array<any>
}

const props = defineProps({
  data: {
    type: Array as () => Item[], // 使用接口定义类型
    default: (): Array<any> => []
  }
})

const emit = defineEmits(['selectElement'])
const handleClick = (child: any, isDrag?: boolean) => {
  activeTool.value = 'select'
  emit('selectElement', child, isDrag)
}
/**
 * 处理拖拽结束事件
 * @param e - 拖拽事件对象
 * @param item - 被拖拽的组件对象
 */
const handleDragEnd = (e: DragEvent, item: any) => {
  console.log(item.json, '---item')
  // 获取鼠标最后位置下的元素
  const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY)

  // 判断是否为canvas元素
  if (elementUnderMouse instanceof HTMLCanvasElement) {
    // 浏览器坐标转世界坐标(画布坐标）
    const point = canvas.app.getWorldPointByClient(e)

    // 世界坐标转Frame内坐标
    let framePoint = canvas.contentFrame.getInnerPoint(point)
    // 将坐标转成整数
    // arrow元素可能不存在宽高
    item.json.x = Math.round(framePoint.x) - (item.json.width ? item.json.width / 2 : 0)
    item.json.y = Math.round(framePoint.y) - (item.json.height / 2 ? item.json.height / 2 : 0)

    handleClick(item, true)
  }
}
</script>

<style scoped lang="less">
.element-box {
  overflow-y: auto;
  height: calc(100vh - 180px);
}
//禁用滚动条
.element-box::-webkit-scrollbar {
  display: none;
}
.element-item {
  margin-top: 10px;
  .shape-type-name {
    font-size: 12px;
    color: var(--primary-color);
  }
  .children {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    .children-box {
      width: 65px;
      height: 65px;
      background: #f5f5f5;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      &:hover {
        cursor: pointer;
        .icon-item {
          transform: scale(1.1);
        }
      }
    }
  }
}
</style>
