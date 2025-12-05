<script setup lang="ts">
import NP from 'number-precision'
import ContextMenu from '@/components/contextMenu'
import type { ButtonInstance } from '@arco-design/web-vue/es/button'
import { Input } from '@arco-design/web-vue'
import { isDefined } from '@vueuse/core'
import { useEditor } from '@/views/Editor/app'
import { isNumber } from 'lodash'
import { zoomItems } from '@/views/Editor/utils/contextMenu'
import emitter from '@/utils/eventBus'

const { canvas, keybinding } = useEditor()

const { zoom } = canvas.ref

const button = ref<ButtonInstance>()
const isMenuOpen = ref(false) //菜单是否展开
/**
 * 初始化标志，避免初始化时触发锚点刷新
 * 防止在组件初始化时不必要的锚点刷新调用
 */
const isInitialized = ref(false)

const inputValue = ref<string>()
watchEffect(() => {
  // inputValue.value = NP.times(zoom.value, 100).toFixed(2) + '%'
  inputValue.value = Math.round(NP.times(zoom.value, 100)) + '%'
  //获取当前画布的缩放比例
  // emitter.emit('refresh-anchors',zoom.value); // 主动通知刷新锚点
})

/**
 * 监听 zoom 变化，但避免初始化时调用
 * 防止在组件初始化时不必要的锚点刷新调用
 */
watch(zoom, (newVal, oldVal) => {
  emitter.emit('refresh-anchors', zoom.value)
  // 如果是初始化阶段，不触发锚点刷新
  // if (!isInitialized.value) {
  //   isInitialized.value = true
  //   return
  // }

  // console.log(newVal, oldVal, zoom.value, 'newVal, oldVal', canvas.zoomFit)
  // if (newVal !== oldVal) {
  //   emitter.emit('refresh-anchors', newVal) // 主动通知刷新锚点
  //   console.log('刷新锚点')
  // }
})
const openMenu = (e: MouseEvent) => {
  if (isMenuOpen.value) {
    ContextMenu.closeContextMenu()
    isMenuOpen.value = false
    return
  }

  let x = e.clientX
  let y = e.clientY
  if (isDefined(button)) {
    const rect = button.value?.$el.getBoundingClientRect()
    x = Math.max(rect.x - 8, 0)
    y = rect.y + rect.height + 4
  }
  ContextMenu.showContextMenu({
    leftPosition: 60, //让菜单在父元素右侧弹出
    x,
    y,
    preserveIconWidth: false,
    items: [
      {
        customRender: () =>
          h(
            'div',
            {
              class: 'p2'
            },
            h(
              Input,
              {
                size: 'small',
                modelValue: inputValue.value,
                'onUpdate:modelValue': (value: string) => {
                  inputValue.value = value
                },
                onChange: (value: string) => {
                  const zoom = parseInt(value)
                  if (!isNumber(zoom) || Number.isNaN(zoom)) return
                  canvas.zoomToInnerPoint(NP.divide(zoom, 100))
                }
              },
              {}
            )
          )
      },
      ...zoomItems(),
      {
        label: '50%',
        onClick: () => {
          canvas.zoomToInnerPoint(0.5)
        }
      },
      {
        label: '100%',
        onClick: () => {
          keybinding.trigger('mod+0')
        },
        shortcut: `${keybinding.mod} 0`
      },
      {
        label: '200%',
        onClick: () => {
          canvas.zoomToInnerPoint(2)
        }
      }
    ],
    onClose: () => {
      isMenuOpen.value = false
    }
  } as any)
  isMenuOpen.value = true
}
const handleFitZoom = () => {
  canvas.zoomToFit()
}
/**
 * 计算属性，根据 number 的值动态生成格式化后的字符串
 * @param val 数值
 * @returns 格式化后的字符串
 */
const formattedNumber = (val: number) => {
  if (Number.isInteger(val)) {
    return String(val) // 如果是整数，直接返回字符串形式
  } else {
    // return NP.round(val, 2); // 如果有小数，使用 number-precision 的 round 方法保留两位小数
    return Math.round(val)
  }
}
</script>

<template>
  <!-- <a-tooltip effect="dark" content="自适应画布" mini>
      <a-button ref="button" class="icon-btn px2!" @click="handleFitZoom">
          <icon-fullscreen/>
      </a-button>
    </a-tooltip> -->
  <a-button ref="button" class="icon-btn px1!" :class="{ 'btn-active': isMenuOpen }" @click="openMenu" size="mini" style="width: 40px;">
    <span :class="{ 'text-primary': isMenuOpen }">{{ formattedNumber(NP.times(zoom, 100)) }}%</span>
    <icon-down class="ml1" :class="{ 'text-primary': isMenuOpen }" />
  </a-button>
</template>

<style scoped lang="less">
.text-primary {
  color: var(--primary-color);
}

.btn-active {
  background-color: var(--primary-bg) !important;
  border-radius: 5px !important;
}
</style>
