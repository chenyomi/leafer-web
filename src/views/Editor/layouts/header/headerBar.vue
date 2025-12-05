<template>
  <div class="header-box">
    <div class="header-bar">
      <div class="left-menu">
        <left-menu />
        <!-- <file-oper /> -->
        <!-- <img src="/logo.png" style="width: 25px" />
        <div class="text-center px-5px">
          <div style="width: max-content">
            <span class="black font-bold"></span>
          </div>
        </div>
        <a-divider direction="vertical" />
        <file-oper />
        <a-divider direction="vertical" />
        <undo />
        <a-divider direction="vertical" />
        <a-space size="medium">
          <a-tooltip effect="dark" content="标尺" mini>
            <a-button class="icon-btn pd-5px" @click="changeLineGuides">
              <icon-paste
                :size="18"
                :class="canvas.ref.enabledRuler.value ? 'arco-icon-check' : ''"
              />
            </a-button>
          </a-tooltip>
        </a-space>
        <a-space size="medium">
          <a-tooltip effect="dark" content="网格" mini>
            <a-button class="icon-btn pd-5px" @click="changeGridding">
              <ali-icon
                type="icon-icon_quxiaowangge"
                :size="16"
                :class="
                  canvas.ref.enabledGridding.value ? 'arco-icon-check' : ''
                "
              />
            </a-button>
          </a-tooltip>
        </a-space> -->
        <!-- <a-divider direction="vertical" /> -->
        <!-- <operation /> -->
        <!-- <a-divider direction="vertical" /> -->
        <!-- <zoom /> -->
        <!-- 标尺单位切换 -->
        <!-- <line-guides /> -->
      </div>
      <!-- 中间操作菜单栏 -->
      <div class="middle-menu">
        <middle-menu />
      </div>
      <!-- 右侧操作菜单 -->
      <div class="right-menu">
        <!-- <save-oper /> -->
        <right-operation />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import { Platform, Rect, ResizeEvent, BoundsEvent, Line, Group } from 'leafer-ui'
import Zoom from './left/zoom.vue'
import Operation from './left/operation.vue'
import Undo from './left/undo.vue'
import FileOper from './left/fileOper.vue'
import SaveOper from './right/saveOper.vue'
import ToolBar from './center/toolBar.vue'
import rightOperation from './right/index.vue'
import MiddleMenu from './center/index.vue'
import LeftMenu from './left/index.vue'
import { isDefined } from '@vueuse/core'
import { typeUtil } from '@/views/Editor/utils/utils'
import { watch, watchEffect, onMounted, onBeforeUnmount } from 'vue'

Platform.image.suffix = ''
const { canvas, keybinding } = useEditor()
import LineGuides from '@/views/Editor/layouts/canvasEdit/lineGuides.vue'

// 存储网格监听器的引用
let gridResizeListener: any = null

const changeLineGuides = () => {
  keybinding.trigger('shift+r')
}

const drawGridLines = () => {
  // 移除旧网格
  const oldGroup = canvas.app.findOne('#gridding-group')
  if (oldGroup) oldGroup.remove()

  // 画布宽高
  const width = canvas.contentFrame.width
  const height = canvas.contentFrame.height
  const gridSize = 50

  // 创建网格组
  const group = new Group({ id: 'gridding-group' })

  // 竖线
  for (let x = 0; x <= width; x += gridSize) {
    const line = new Line({
      x,
      y: 0,
      width: height,
      rotation: 90,
      strokeWidth: 1,
      stroke: '#333333',
      opacity: 0.2,
      editable: false,
      hittable: false,
      strokeWidthFixed: true,
      isSnap: false
    })
    group.add(line)
  }

  // 横线
  for (let y = 0; y <= height; y += gridSize) {
    const line = new Line({
      x: 0,
      y,
      width: width,
      rotation: 0,
      strokeWidth: 1,
      stroke: '#333333',
      opacity: 0.2,
      editable: false,
      hittable: false,
      strokeWidthFixed: true,
      isSnap: false
    })
    group.add(line)
  }

  canvas.app.tree.add(group)
}

const changeGridding = () => {
  const griddingGroup = canvas.app.findOne('#gridding-group')
  if (griddingGroup) {
    canvas.ref.enabledGridding.value = false
    griddingGroup.remove()
    if (gridResizeListener) {
      canvas.contentFrame.off(BoundsEvent.RESIZE, gridResizeListener)
      gridResizeListener = null
    }
    return
  }

  drawGridLines()
  canvas.ref.enabledGridding.value = true

  // 监听画布尺寸变化，自动重绘网格
  gridResizeListener = function () {
    if (canvas.ref.enabledGridding.value) {
      drawGridLines()
    }
  }
  canvas.contentFrame.on(BoundsEvent.RESIZE, gridResizeListener)
}

// 组件卸载时移除监听器，防止内存泄漏
onBeforeUnmount(() => {
  if (gridResizeListener) {
    canvas.contentFrame.off(BoundsEvent.RESIZE, gridResizeListener)
    gridResizeListener = null
  }
})
</script>
<style lang="less">
.down-list {
  padding: 0 !important;
  margin: 0 !important;
  min-width: 200px;

  ul {
    padding: 0;
    margin: 5px 0;
    list-style: none;
  }

  li {
    padding: 0 20px;
    cursor: pointer;
    color: #1b2337;
    display: block;
    font-size: 14px;
    line-height: 40px;
    overflow: hidden;
    position: relative;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  li:hover {
    cursor: pointer;
    background-color: #f1f2f4;
  }
}
</style>
<style scoped lang="less">
@import '../../styles/layouts';

.header-box {
  height: @headerBoxHeight;
  padding: 0 20px 0 0;
  transition: 0.2s all ease-in-out;
  pointer-events: none;
}

.header-bar {
  height: 50px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  border-radius: 2px 2px 0 0;
  pointer-events: none;
}

.left-menu,
.middle-menu,
.right-menu {
  pointer-events: auto;
}

.left-menu {
  justify-self: start;
}

.middle-menu {
  justify-self: center;
}

.right-menu {
  justify-self: end;
}

.file-basic {
  padding: 10px;
  width: 200px;
  background-color: var(--color-bg-popup);
  border-radius: 4px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.15);
}

.border-bottom {
  border-bottom: 1px solid var(--color-border);
  border-radius: 2px 2px 0 0;
}
</style>
