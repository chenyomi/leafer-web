<template>
  <!-- <a-layout-sider class="sider-box active">
    <div ref="widgetPanel" id="s-widget-panel">
      <div ref="widgetWrap" class="s-widget-wrap">
        <div class="wrap" ref="tabBoxRef">
          <setting />
        </div>
      </div>
    </div>
  </a-layout-sider> -->
  <div class="right-panel">
    <div class="open-box" style="transition: .2s all ease-in-out;" :style="!ruleShow && 'top:75px;'" @click="handlesettingPopup" v-if="activeTool !== 'comment'">
      <ali-icon type="icon-majesticons_checkbox" :size="20" class="hisitory-menu" :class="{ 'menu-active': settingPopup }" />
    </div>
    <transition name="slide-fade">
      <setting v-if="settingPopup" />
    </transition>
    <!-- 帮助文档 -->
    <div class="help-box" @click="handleHelpOpen">
      <!-- <help>
        <img src="@/assets/images/help.png" alt="help" class="help-img w25px h25px">     
      </help> -->
      <img src="@/assets/images/help.png" class="help-img w25px h25px" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import Layers from '@/views/Editor/layouts/panel/rightPanel/layers.vue'
import Setting from '@/views/Editor/layouts/panel/rightPanel/setting.vue'
import { useResizeObserver } from '@vueuse/core'
import { useAppStore } from '@/store/modules/app/app'
import Help from '@/views/Editor/layouts/panel/leftPanel/help.vue'
import { useCommonStore } from '@/store/modules/common'
import { useRuleStore } from '@/store/modules/rule'

const ruleStore = useRuleStore()
const ruleShow = computed(() => {
  return ruleStore.ruleShow
}) 


const commonStore = useCommonStore()
// 右侧面板是否显示
const { settingPopup } = storeToRefs(commonStore)

const { editor } = useEditor()
const widgetWrap = ref()
const settingHeight = ref(0)
const { activeTool } = storeToRefs(useAppStore())
onMounted(() => {
  // 更新tree组件的高度
  useResizeObserver(widgetWrap.value as HTMLDivElement, (entries) => {
    const [entry] = entries
    const { height } = entry.contentRect
    settingHeight.value = height - 43
  })
})

//右侧面板开关
const handlesettingPopup = () => {
  settingPopup.value = !settingPopup.value
}
//帮助文档开关
const helpOpen = ref(false)
const handleHelpOpen = () => {
  helpOpen.value = !helpOpen.value
}
</script>
<style lang="less" scoped>
@import '../../../styles/layouts';
.right-panel {
  position: relative;
  .open-box {
    position: fixed;
    width: 36px;
    height: 36px;
    background: #ffffff;
    box-shadow: 0px 4px 6px 0px rgba(189, 189, 189, 0.5);
    border-radius: 50%;
    right: 40px;
    top: 100px;
    z-index: 1001;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    .menu-active {
      color: var(--primary-color);
    }
  }
  .help-box {
    position: fixed;
    bottom: 25px;
    right: 10px;
    cursor: pointer;
  }
}
// .slide-fade-enter-active, .slide-fade-leave-active {
//   transition: all 0.5s ease;
// }

// .slide-fade-enter, .slide-fade-leave-to {
//   transform: translateX(100%); /* 从右侧滑入 */
// }

// .slide-fade-enter-to, .slide-fade-leave {
//   transform: translateX(0); /* 显示时回到原位 */
// }
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(100%);
}
.wrap {
  width: 100%;
  height: 100%;
}
// Color variables (appears count calculates by raw css)
@color1: #3e4651; // Appears 2 times
@menuWidth: 67px; // 默认菜单宽度
@maxMenuWidth: 220px; // 最大菜单宽度
// @maxMenuWidth: 200px; // 最大菜单宽度
@active-text-color: #2254f4; // #1195db;
.sider-box {
  width: @menuWidth !important;
  min-width: @menuWidth !important;
  max-width: @menuWidth !important;
  :deep(.arco-layout-sider-children) {
    overflow: initial;
  }
}
.sider-box.active {
  width: calc(@menuWidth + @maxMenuWidth) !important;
  min-width: calc(@menuWidth + @maxMenuWidth) !important;
  max-width: calc(@menuWidth + @maxMenuWidth) !important;
  z-index: 9 !important;
}
#s-widget-panel {
  transition: all 1s;
  display: flex;
  flex-direction: row;
  height: 100%;
  .s-widget-wrap {
    width: @maxMenuWidth + 80px;
    background-color: #fff;
    flex: 1;
    height: 100%;
  }
}
:deep(.arco-input-wrapper) {
  padding-right: 4px;
  padding-left: 6px;
  height: 28px;

  .arco-input {
    font-size: 12px !important;
  }

  .arco-input-suffix {
    padding-left: 6px;
  }
}
:deep(.arco-select-view-value) {
  line-height: initial !important;
  font-size: 12px !important;
}
:deep(.arco-select-view-suffix) {
  padding-left: 4px;
}

:deep(.arco-input-prefix) {
  padding-right: 0 !important;
  margin-right: 4px;
  justify-content: center;

  .arco-btn {
    height: 26px;
    width: 26px;
  }
}
</style>
