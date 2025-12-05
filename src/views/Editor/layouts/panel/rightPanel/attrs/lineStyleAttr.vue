<template>
    <div class="p2 custom-box fill-color-attr">
        <a-col :span="18" class="mt5px">
            <div style="font-size: 12px; color: #515151">Styles</div>
        </a-col>
        <a-col :span="24" class="mt10px" >
            <div class="style-box">
                <template v-for="(item,index) in displayItems" :key="index" >
                    <div class="style-item" 
                    @click="handleClick(item)" @mouseenter="handleMouseEnter(index)" @mouseleave="handleMouseLeave">
                    <ali-icon type="icon-xianduan1" class="line-icon" :style="{color:item.stroke}" :size="20"></ali-icon>
                    <div class="style-border" v-if="index == selectedIndex"></div>
                </div>
                </template>
            </div>
            <div style="margin-top:8px" class="flex">
                <div class="more" v-if="!expanded && styleItems.length > limitCount" @click="expanded = true">More</div>
                <div class="more" v-if="expanded" @click="expanded = false">Collapse</div>
            </div>
        </a-col>
    </div>
</template>


<script setup lang="ts">
import { ref, computed } from 'vue'
import emitter from '@/utils/eventBus'
import { size } from 'lodash'

/**
 * 样式项定义
 * - name: 显示文字
 * - fill: 填充色 HEX
 * - stroke: 描边色 HEX
 */
interface StyleItem {
  name: string
  fill: string
  stroke: string
}

/**
 * 通用形状色卡（根据提供图片转录）
 * - 共 3 组，每组 12 对（填充/描边）
 * - 统一使用名称 'Aa'
 */
const styleItems = ref<StyleItem[]>([
  // 第一组
  { name: 'Aa', fill: '#FFC6C6', stroke: '#8E2F2F' },
  { name: 'Aa', fill: '#FCCEBE', stroke: '#A0471E' },
  { name: 'Aa', fill: '#FFDFB4', stroke: '#A25B10' },
  { name: 'Aa', fill: '#FDFA8B', stroke: '#B0811A' },
  { name: 'Aa', fill: '#D9F3BF', stroke: '#558230' },
  { name: 'Aa', fill: '#D2F4E0', stroke: '#347E56' },
  { name: 'Aa', fill: '#D3F7F1', stroke: '#33786B' },
  { name: 'Aa', fill: '#C2E7F8', stroke: '#296786' },
  { name: 'Aa', fill: '#D6E0FF', stroke: '#4453A4' },
  { name: 'Aa', fill: '#E3D7FD', stroke: '#6D48AE' },
  { name: 'Aa', fill: '#F7DDF7', stroke: '#793F90' },
  { name: 'Aa', fill: '#FECBED', stroke: '#8C346C' },
  // 第二组
  { name: 'Aa', fill: '#EC8282', stroke: '#820909' },
  { name: 'Aa', fill: '#E17F5B', stroke: '#762609' },
  { name: 'Aa', fill: '#F1B05B', stroke: '#6D3901' },
  { name: 'Aa', fill: '#E7E16F', stroke: '#6C4B02' },
  { name: 'Aa', fill: '#8ECA51', stroke: '#285701' },
  { name: 'Aa', fill: '#66D691', stroke: '#017528' },
  { name: 'Aa', fill: '#5FCDBE', stroke: '#015747' },
  { name: 'Aa', fill: '#62B3D9', stroke: '#035178' },
  { name: 'Aa', fill: '#7995E9', stroke: '#031378' },
  { name: 'Aa', fill: '#AA8EE6', stroke: '#2E0378' },
  { name: 'Aa', fill: '#C889DD', stroke: '#4E026C' },
  { name: 'Aa', fill: '#E188C5', stroke: '#530135' },
  // 第三组
  { name: 'Aa', fill: '#BD3535', stroke: '#5A0000' },
  { name: 'Aa', fill: '#B94318', stroke: '#4E1100' },
  { name: 'Aa', fill: '#B76C0A', stroke: '#432200' },
  { name: 'Aa', fill: '#A29A05', stroke: '#4D3B00' },
  { name: 'Aa', fill: '#467A11', stroke: '#0C1B00' },
  { name: 'Aa', fill: '#2E5E0E', stroke: '#0B2611' },
  { name: 'Aa', fill: '#0D7062', stroke: '#00231C' },
  { name: 'Aa', fill: '#106085', stroke: '#001D2C' },
  { name: 'Aa', fill: '#3754AC', stroke: '#000B50' },
  { name: 'Aa', fill: '#5A3B9C', stroke: '#11002F' },
  { name: 'Aa', fill: '#793490', stroke: '#270036' },
  { name: 'Aa', fill: '#9D327B', stroke: '#320020' },
])

/**
 * 是否展开全部
 * @type {boolean}
 */
const expanded = ref<boolean>(false)

/**
 * 默认展示两行的数量（按 6 个/行）
 * @type {number}
 */
const limitCount = 12

/**
 * 计算当前应展示的样式项列表
 * @returns {StyleItem[]} 当前展示的样式项数组
 */
const displayItems = computed<StyleItem[]>(() => {
  return expanded.value ? styleItems.value : styleItems.value.slice(0, limitCount)
})

/**
 * 点击样式卡片，将描边颜色分发到StrokeColorAttr组件
 * @param {StyleItem} item 样式项，包含stroke HEX 颜色
 * @returns {void}
 */
const handleClick = (item: StyleItem): void => {
  const strokeHex = (item.stroke || '').toUpperCase()
  if (strokeHex) emitter.emit('line-style-stroke', strokeHex)
}

// 选中项索引
const selectedIndex = ref<number>(-1)

/**
 * 鼠标移入样式卡片，更新选中项索引
 * @param {number} index 样式项索引
 * @returns {void}
 */
const handleMouseEnter = (index: number): void => {
  selectedIndex.value = index
}

/**
 * 鼠标移出样式卡片，清除选中项索引
 * @returns {void}
 */
const handleMouseLeave = (): void => {
  selectedIndex.value = -1
}
</script>

<style scoped lang="less">
.style-box {
    width: 100%;
    border-radius: 5px;
    background-color: #f0f0f0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    padding:8px;
    position: relative;
    .style-item{
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background-color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border: 1px solid #d6d4d4;
    }
    .style-border{
        position: absolute;
        top: -5px;
        left: -5px;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: 2px solid var(--audit-color);
    }
    .line-icon{
        transform: rotate(90deg);   
    }
}
.more {
    color: var(--audit-color);
}
</style>