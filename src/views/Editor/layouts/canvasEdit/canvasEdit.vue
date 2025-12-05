<template>
  <div id="page-design" ref="designRef" class="page-design">
    <div ref="divRef" class="contentBox" id="divRef"></div>
  </div>
</template>
<script lang="ts">
import { useEditor } from '@/views/Editor/app'
import { useResizeObserver } from '@vueuse/core'
import { MLeaferCanvas } from '@/views/Editor/core/canvas/mLeaferCanvas'

export default defineComponent({
  setup() {
    const divRef = ref()

    onMounted(() => {
      const { canvas } = useEditor()
      divRef.value.append(canvas.wrapperEl)
      /**
       * 解决在Firefox浏览器中canvas的display=none导致画布不显示的问题
       * TODO 待官方修复
       */
      canvas.wrapperEl.style.display = 'block'
      useResizeObserver(divRef, (entries) => {
        const [entry] = entries
        const { width, height } = entry.contentRect
        // canvas.app.resize({ width, height }) //取消自动调整画布大小
      })
    })

    return { divRef }
  }
})
</script>
<style scoped lang="less">
@import '../../styles/layouts';

.page-design {
  position: relative;
  overflow: hidden;
}

.contentBox {
  /*box-shadow: 1px 1px 10px 3px rgba(0, 0, 0, 0.1);*/
}

.contentBox {
  width: 100%;
  display: flex;
  overflow: hidden;
  // height: @contentBoxHeight;
  height: 100vh;
  // background: url('../../../../assets/images/alpha-background.svg');
  // background-size: 30px 30px;
  // background-position-y: 5px;
  // background-position-x: 5px;
  background: var(--chakra-background);
}

.ruler-pd {
  .contentBox {
    height: @contentBoxHeight;
  }
}
</style>
