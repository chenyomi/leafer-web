<template>
  <div class="p2 custom-box fill-color-attr">
    <a-col :span="18" class="mt5px">
      <div style="font-size: 12px; color: #515151">Styles</div>
    </a-col>
    <a-col :span="24" class="mt10px">
      <div class="style-box">
        <template v-for="(item, index) in displayItems" :key="index">
          <div
            class="style-item"
            :style="{ backgroundColor: item.fill, border: `1px solid ${item.stroke}` }"
            @click="handleClick(item)"
            @mouseenter="handleMouseEnter(index)"
            @mouseleave="handleMouseLeave"
          >
            <div class="text-center" :style="{ color: item.textColor }">{{ item.name }}</div>
            <div class="style-border" v-if="index == selectedIndex"></div>
          </div>
        </template>
      </div>
      <div style="margin-top: 8px" class="flex">
        <div class="more" v-if="!expanded && styleItems.length > limitCount" @click="expanded = true">More</div>
        <div class="more" v-if="expanded" @click="expanded = false">Collapse</div>
      </div>
    </a-col>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import emitter from '@/utils/eventBus'
import { useColor } from '@/views/Editor/hooks/useActiveObjectColor'
import { useEditor } from '@/views/Editor/app'
import { camelCase } from 'lodash'
import { canvasSizeAttrs } from 'leafer-ui'

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
  textColor: string
}

/**
 * 通用形状色卡（根据提供图片转录）
 * - 共 3 组，每组 12 对（填充/描边）
 * - 统一使用名称 'Aa'
 */
const styleItems = ref<StyleItem[]>([
  // 第一组
  { name: 'Aa', fill: '#EFFFFC', stroke: '#466C65', textColor: '#466C65' },
  { name: 'Aa', fill: '#E7F8FF', stroke: '#3B5B6B', textColor: '#3B5B6B' },
  { name: 'Aa', fill: '#EBF1FF', stroke: '#2C376B', textColor: '#2C376B' },
  { name: 'Aa', fill: '#F3EEFF', stroke: '#442E68', textColor: '#442E68' },
  { name: 'Aa', fill: '#FBEEFF', stroke: '#4B2A58', textColor: '#4B2A58' },
  { name: 'Aa', fill: '#FFECF9', stroke: '#652B50', textColor: '#652B50' },

  { name: 'Aa', fill: '#FFECEC', stroke: '#682E2E', textColor: '#682E2E' },
  { name: 'Aa', fill: '#FFEDE7', stroke: '#623925', textColor: '#623925' },
  { name: 'Aa', fill: '#FFF4E7', stroke: '#5D3E1F', textColor: '#5D3E1F' },
  { name: 'Aa', fill: '#FFFDE4', stroke: '#57441B', textColor: '#57441B' },
  { name: 'Aa', fill: '#F6FFEB', stroke: '#374F24', textColor: '#374F24' },
  { name: 'Aa', fill: '#F0FFF6', stroke: '#2F5642', textColor: '#2F5642' },

  // 第二组
  { name: 'Aa', fill: '#D7E2DF', stroke: '#334541', textColor: '#334541' },
  { name: 'Aa', fill: '#CADBE2', stroke: '#3A4E58', textColor: '#3A4E58' },
  { name: 'Aa', fill: '#C2CFE5', stroke: '#2C3561', textColor: '#2C3561' },
  { name: 'Aa', fill: '#D5CFE5', stroke: '#4A405A', textColor: '#4A405A' },
  { name: 'Aa', fill: '#DDCFE2', stroke: '#553E5E', textColor: '#553E5E' },
  { name: 'Aa', fill: '#DEC9D7', stroke: '#5A334C', textColor: '#5A334C' },

  { name: 'Aa', fill: '#E3CFCF', stroke: '#4C2828', textColor: '#4C2828' },
  { name: 'Aa', fill: '#E8D9D4', stroke: '#482818', textColor: '#482818' },
  { name: 'Aa', fill: '#E1D7CC', stroke: '#54391D', textColor: '#54391D' },
  { name: 'Aa', fill: '#DFDDCB', stroke: '#4C3B18', textColor: '#4C3B18' },
  { name: 'Aa', fill: '#DFE6D4', stroke: '#2E4120', textColor: '#2E4120' },
  { name: 'Aa', fill: '#CFDED4', stroke: '#253E31', textColor: '#253E31' },

  // 第三组
  { name: 'Aa', fill: '#D3F7F1', stroke: '#33786B', textColor: '#33786B' },
  { name: 'Aa', fill: '#C2E7F8', stroke: '#296786', textColor: '#296786' },
  { name: 'Aa', fill: '#D6E0FF', stroke: '#4453A4', textColor: '#4453A4' },
  { name: 'Aa', fill: '#E3D7FD', stroke: '#6D48AE', textColor: '#6D48AE' },
  { name: 'Aa', fill: '#F7DDFF', stroke: '#793F90', textColor: '#793F90' },
  { name: 'Aa', fill: '#FECBED', stroke: '#8C346C', textColor: '#8C346C' },

  { name: 'Aa', fill: '#FFC6C6', stroke: '#8E2F2F', textColor: '#8E2F2F' },
  { name: 'Aa', fill: '#FCCEBE', stroke: '#A0471E', textColor: '#A0471E' },
  { name: 'Aa', fill: '#FFDFB4', stroke: '#A25B10', textColor: '#A25B10' },
  { name: 'Aa', fill: '#FDFAB8', stroke: '#B0811A', textColor: '#B0811A' },
  { name: 'Aa', fill: '#D9F3BF', stroke: '#558230', textColor: '#558230' },
  { name: 'Aa', fill: '#D2F4E0', stroke: '#347E56', textColor: '#347E56' },

  //第四组
  { name: 'Aa', fill: '#EC8282', stroke: '#820909', textColor: '#820909' },
  { name: 'Aa', fill: '#E17F5B', stroke: '#762609', textColor: '#762609' },
  { name: 'Aa', fill: '#F1B05B', stroke: '#6D3901', textColor: '#6D3901' },
  { name: 'Aa', fill: '#E7E16F', stroke: '#6C4B02', textColor: '#6C4B02' },
  { name: 'Aa', fill: '#8ECA51', stroke: '#285701', textColor: '#285701' },
  { name: 'Aa', fill: '#66C691', stroke: '#015728', textColor: '#015728' },

  { name: 'Aa', fill: '#5FCDBE', stroke: '#015747', textColor: '#015747' },
  { name: 'Aa', fill: '#62B3D9', stroke: '#035178', textColor: '#035178' },
  { name: 'Aa', fill: '#7995E9', stroke: '#031378', textColor: '#031378' },
  { name: 'Aa', fill: '#AA8EE6', stroke: '#2E0378', textColor: '#2E0378' },
  { name: 'Aa', fill: '#C889DD', stroke: '#4E026C', textColor: '#4E026C' },
  { name: 'Aa', fill: '#E188C5', stroke: '#530135', textColor: '#530135' },

  //第五组
  { name: 'Aa', fill: '#0D7062', stroke: '#00231C', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#106085', stroke: '#001D2C', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#3754AC', stroke: '#000B50', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#5A3B9C', stroke: '#11002F', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#793490', stroke: '#270036', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#9D327B', stroke: '#320020', textColor: '#FFFFFF' },

  { name: 'Aa', fill: '#BD3535', stroke: '#5A0000', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#B94318', stroke: '#4E1100', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#B76C0A', stroke: '#432200', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#A29A05', stroke: '#4D3B00', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#467A11', stroke: '#0C1B00', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#0D7B3F', stroke: '#002611', textColor: '#FFFFFF' },

  //第六组
  { name: 'Aa', fill: '#08453C', stroke: '#001613', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#054660', stroke: '#01202E', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#132864', stroke: '#01093F', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#3B2075', stroke: '#11002F', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#4D1061', stroke: '#1E002A', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#53073B', stroke: '#240017', textColor: '#FFFFFF' },

  { name: 'Aa', fill: '#6E0D0D', stroke: '#2E0000', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#742508', stroke: '#3C0D00', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#6E4008', stroke: '#211100', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#615B02', stroke: '#271E00', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#294A06', stroke: '#0C1B00', textColor: '#FFFFFF' },
  { name: 'Aa', fill: '#064824', stroke: '#002611', textColor: '#FFFFFF' }
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
 * 点击样式卡片，将填充与描边颜色分发到对应面板
 * @param {StyleItem} item 样式项，包含 fill/stroke HEX 颜色
 * @returns {void}
 */
const handleClick = (item: StyleItem): void => {
  const fillHex = (item.fill || '').toUpperCase()
  const strokeHex = (item.stroke || '').toUpperCase()
  const textHex = (item.textColor || '').toUpperCase()
  console.log('handleClick', fillHex, strokeHex, textHex)
  if (fillHex) emitter.emit('apply-style-fill', fillHex)
  if (strokeHex) emitter.emit('apply-style-stroke', strokeHex)
  // text文本应用当前选中项的textColor
  if (textHex) emitter.emit('apply-style-textColor', textHex)
  const { canvas, editor } = useEditor()
  // 使用editor.dateEdit处理多选和单选情况
  editor.dateEdit((e) => {
    console.log(e.parent.children[1])
    // 检查对象是否有children属性且第二个子元素存在
    if (e.parent.children && e.parent.children[1]) {
      e.parent.children[1].set({
        fill: textHex
      })
    }
  }, 1)
  
  // 保存状态以支持撤销
  canvas.undoRedo.save(83)
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
.fill-color-attr {
  padding-bottom: 50px !important;
}
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
  padding: 8px;
  position: relative;
  .style-item {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .style-border {
    position: absolute;
    top: -5px;
    left: -5px;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 2px solid var(--audit-color);
  }
}
.more {
  color: var(--audit-color);
}
</style>
