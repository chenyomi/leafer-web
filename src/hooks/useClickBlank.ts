import { onMounted, onUnmounted, Ref } from 'vue'

/**
 * 通用点击空白处关闭的 hook
 * @param excludeRefs 需要排除的元素 ref 或选择器数组（支持 Ref<HTMLElement|null> 或 CSS 选择器字符串）
 * @param onBlankClick 点击空白处时的回调
 */
export function useClickBlank(
  excludeRefs: (Ref<HTMLElement | null> | string)[],
  onBlankClick: () => void
) {
  const handleClick = (event: Event) => {
    const target = event.target as HTMLElement
    let isInExclude = false
    for (const refOrSelector of excludeRefs) {
      let el: HTMLElement | null = null
      if (typeof refOrSelector === 'string') {
        el = document.querySelector(refOrSelector) as HTMLElement
      } else {
        el = refOrSelector.value
      }
      // 只有 el 存在且 contains 是函数时才调用，防止报错
      if (el && typeof el.contains === 'function' && el.contains(target)) {
        isInExclude = true
        break
      }
    }
    if (!isInExclude) {
      onBlankClick()
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClick)
  })
  onUnmounted(() => {
    document.removeEventListener('click', handleClick)
  })
} 