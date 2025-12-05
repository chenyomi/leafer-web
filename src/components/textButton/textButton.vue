<template>
  <div class="follow-button" v-if="isTextEditing == false" ref="followButtonRef">
    <div class="btn-wrapper">
      <button class="btn" title="符号" @click="showSymbolPopout">
        <ali-icon type="icon-symbol" :size="20" class="menu-icon" :class="{ 'active-color': symbolPopup }" />
      </button>
      <!-- 层级二级菜单 -->
      <div
        class="layer-submenu"
        ref="layerMenuRef"
        v-if="symbolPopup"
        :class="showMenuOnTop ? 'menu-top' : 'menu-bottom'"
        :style="!showMenuOnTop ? { top: textEditorHeight + 'px' } : {}"
      >
        <div class="symbol-popout" @mousedown="saveCursorPosition">
          <div class="symbol-item" @click="insertSymbol('°')">°</div>
          <div class="symbol-item" @click="insertSymbol('⋅')">⋅</div>
          <div class="symbol-item" @click="insertSymbol('¼')">¼</div>
          <div class="symbol-item" @click="insertSymbol('½')">½</div>
          <div class="symbol-item" @click="insertSymbol('∅')">∅</div>
          <div class="symbol-item" @click="insertSymbol('α')">α</div>
          <div class="symbol-item" @click="insertSymbol('β')">β</div>
          <div class="symbol-item" @click="insertSymbol('γ')">γ</div>
          <div class="symbol-item" @click="insertSymbol('δ')">δ</div>
          <div class="symbol-item" @click="insertSymbol('ε')">ε</div>
          <div class="symbol-item" @click="insertSymbol('ζ')">ζ</div>
          <div class="symbol-item" @click="insertSymbol('η')">η</div>
          <div class="symbol-item" @click="insertSymbol('θ')">θ</div>
          <div class="symbol-item" @click="insertSymbol('ι')">ι</div>
          <div class="symbol-item" @click="insertSymbol('κ')">κ</div>
          <div class="symbol-item" @click="insertSymbol('λ')">λ</div>
          <div class="symbol-item" @click="insertSymbol('μ')">μ</div>
          <div class="symbol-item" @click="insertSymbol('π')">π</div>
          <div class="symbol-item" @click="insertSymbol('ρ')">ρ</div>
          <div class="symbol-item" @click="insertSymbol('σ')">σ</div>
          <div class="symbol-item" @click="insertSymbol('υ')">υ</div>
          <div class="symbol-item" @click="insertSymbol('χ')">χ</div>
          <div class="symbol-item" @click="insertSymbol('Ψ')">Ψ</div>
          <div class="symbol-item" @click="insertSymbol('ω')">ω</div>
          <div class="symbol-item" @click="insertSymbol('Λ')">Λ</div>
          <div class="symbol-item" @click="insertSymbol('Σ')">Σ</div>
          <div class="symbol-item" @click="insertSymbol('φ')">φ</div>
          <div class="symbol-item" @click="insertSymbol('Ω')">Ω</div>
          <div class="symbol-item" @click="insertSymbol('Δ')">Δ</div>
          <div class="symbol-item" @click="insertSymbol('τ')">τ</div>
          <div class="symbol-item" @click="insertSymbol('←')">←</div>
          <div class="symbol-item" @click="insertSymbol('↑')">↑</div>
          <div class="symbol-item" @click="insertSymbol('→')">→</div>
          <div class="symbol-item" @click="insertSymbol('↓')">↓</div>
          <div class="symbol-item" @click="insertSymbol('↔')">↔</div>
          <div class="symbol-item" @click="insertSymbol('⇋')">⇋</div>
          <div class="symbol-item" @click="insertSymbol('⇧')">⇧</div>
          <div class="symbol-item" @click="insertSymbol('⇩')">⇩</div>
          <div class="symbol-item" @click="insertSymbol('-')">-</div>
          <div class="symbol-item" @click="insertSymbol('±')">±</div>
          <div class="symbol-item" @click="insertSymbol('√')">√</div>
          <div class="symbol-item" @click="insertSymbol('∞')">∞</div>
          <div class="symbol-item" @click="insertSymbol('≠')">≠</div>
          <div class="symbol-item" @click="insertSymbol('≤')">≤</div>
          <div class="symbol-item" @click="insertSymbol('≥')">≥</div>
          <div class="symbol-item" @click="insertSymbol('⊕')">⊕</div>
          <div class="symbol-item" @click="insertSymbol('⊙')">⊙</div>
          <div class="symbol-item" @click="insertSymbol('×')">×</div>
          <div class="symbol-item" @click="insertSymbol('✓')">✓</div>
        </div>
      </div>
    </div>
    <!-- <button class="btn" title="上标">
      <ali-icon
        type="icon-tabler_superscript"
        :size="20"
        class="menu-icon"
        :class="{ 'active-color': superscript_ }"
        @click="handleFormat('superscript')"
      />
    </button>
    <button class="btn" title="下标">
      <ali-icon
        type="icon-tabler_subscript"
        :size="20"
        class="menu-icon"
        :class="{ 'active-color': subscript_ }"
        @click="handleFormat('subscript')"
      />
    </button> -->
  </div>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'
import { ref, onMounted, watch, computed, onBeforeUnmount, nextTick, inject, reactive } from 'vue'
import { Point, Text } from 'leafer-ui'

import { superscriptMapVal, subscriptMapVal, toSuperscript, toSubscript, toNormal } from '@/components/text-editor/TextEditTool/utils'
const { canvas } = useEditor()
const moreMenuRef = ref<HTMLElement | null>(null)
const followButtonRef = ref<HTMLElement | null>(null)
const layerMenuRef = ref<HTMLElement | null>(null)
const showMenuOnTop = ref(false)

const symbolPopup = ref(false)
// 保存光标位置的变量（使用文本位置而不是 Range，更可靠）
let savedCursorPosition: { start: number; end: number } | null = null
let savedRange: Range | null = null

// 保存光标位置（基于文本内容计算位置）
const saveCursorPosition = () => {
  const editDom = document.querySelector('#textInnerEditor') as HTMLDivElement
  if (!editDom) return

  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    if (editDom.contains(range.commonAncestorContainer)) {
      // 如果当前选区位于文本末尾（例如刚换行还没有文字），直接记录为总长度
      const endRange = document.createRange()
      endRange.selectNodeContents(editDom)
      endRange.collapse(false)
      if (range.collapsed && range.compareBoundaryPoints(Range.START_TO_START, endRange) === 0) {
        const total = editDom.innerText.length
        savedCursorPosition = { start: total, end: total }
        return
      }

      // 使用 TextEditor 的方法计算光标位置（使用 innerText 来正确处理 br 标签）
      const preRange = document.createRange()
      preRange.selectNodeContents(editDom)
      preRange.setEnd(range.startContainer, range.startOffset)

      const tempDiv = document.createElement('div')
      tempDiv.appendChild(preRange.cloneContents())
      const start = tempDiv.innerText.length
      const end = start + range.toString().length

      savedCursorPosition = { start, end }
      savedRange = range.cloneRange()
    }
  }
}

// 根据文本位置恢复光标位置
const restoreCursorPosition = (editDom: HTMLDivElement): Range | null => {
  if (savedRange) {
    try {
      const cloned = savedRange.cloneRange()
      if (editDom.contains(cloned.startContainer) && editDom.contains(cloned.endContainer)) {
        return cloned
      }
    } catch {
      savedRange = null
    }
  }
  if (!savedCursorPosition) return null

  try {
    // 通过创建 Range 并逐步扩展来找到位置
    const range = document.createRange()
    range.selectNodeContents(editDom)

    // 使用逐步查找来定位光标位置
    // 由于 innerText 和 DOM 结构可能不完全对应，我们使用更可靠的方法

    // 遍历所有文本节点和 br 元素，累计文本长度
    const walker = document.createTreeWalker(editDom, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return NodeFilter.FILTER_ACCEPT
        }
        if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
          return NodeFilter.FILTER_ACCEPT
        }
        return NodeFilter.FILTER_SKIP
      }
    })

    let currentPos = 0
    let targetNode: Node | null = null
    let targetOffset = 0

    let node: Node | null
    while ((node = walker.nextNode())) {
      let nodeLength = 0

      if (node.nodeType === Node.TEXT_NODE) {
        nodeLength = node.textContent?.length || 0
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
        // br 标签在 innerText 中算作一个换行符
        nodeLength = 1
      }

      // 检查光标位置是否在这个节点内
      if (currentPos <= savedCursorPosition.start && savedCursorPosition.start < currentPos + nodeLength) {
        targetNode = node
        if (node.nodeType === Node.TEXT_NODE) {
          targetOffset = savedCursorPosition.start - currentPos
        } else {
          // 对于 br 元素，光标在元素之前
          targetOffset = 0
        }
        break
      }

      // 如果光标位置正好在节点末尾
      if (savedCursorPosition.start === currentPos + nodeLength) {
        targetNode = node
        if (node.nodeType === Node.TEXT_NODE) {
          targetOffset = nodeLength
        } else {
          // 对于 br 元素，光标在元素之后
          targetOffset = 1
        }
        break
      }

      currentPos += nodeLength
    }

    // 如果没有找到精确位置，将光标放在编辑框末尾
    if (!targetNode) {
      range.selectNodeContents(editDom)
      range.collapse(false)
      return range
    }

    // 创建 Range 并设置光标位置
    if (targetNode.nodeType === Node.TEXT_NODE) {
      range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0))
    } else {
      // 对于 br 元素
      if (targetOffset === 0) {
        range.setStartBefore(targetNode)
      } else {
        range.setStartAfter(targetNode)
      }
    }
    range.collapse(true)
    return range
  } catch (e) {
    console.error('恢复光标位置失败:', e)
    return null
  }
}

const textEditorHeight = ref(0)
// 计算是否处于文本编辑模式 编辑模式返回false 非编辑模式返回undefined
const isTextEditing = computed(() => {
  const activeObject = canvas.getActiveObject()
  return activeObject && (activeObject as Text).textEditing
})

// 更新菜单位置
const updateMenuPosition = () => {
  if (!followButtonRef.value || !layerMenuRef.value) {
    return
  }

  const buttonRect = followButtonRef.value.getBoundingClientRect()
  const menuHeight = layerMenuRef.value.offsetHeight || 200 // 菜单高度

  // 获取画布容器边界
  const canvasView = canvas.app.view as HTMLElement
  const canvasContainer = canvasView?.parentElement as HTMLElement
  if (!canvasContainer) {
    return
  }

  const containerRect = canvasContainer.getBoundingClientRect()
  const CONTAINER_PADDING = 12
  const containerTop = containerRect.top + CONTAINER_PADDING
  const containerBottom = containerRect.bottom - CONTAINER_PADDING

  // 计算菜单在按钮上方时的位置
  const menuTopWhenAbove = buttonRect.top - menuHeight - 4 // 4px 是 margin-bottom
  const canShowAbove = menuTopWhenAbove >= containerTop

  // 获取文本框高度（如果存在）
  const textEditor = document.querySelector('#textInnerEditor') as HTMLDivElement
  if (textEditor) {
    const textEditorRect = textEditor.getBoundingClientRect()
    textEditorHeight.value = textEditorRect.height + 50
  }

  // 计算菜单在按钮下方时的位置（需要加上文本框高度）
  const menuTopWhenBelow = buttonRect.bottom + 4 + textEditorHeight.value
  const canShowBelow = menuTopWhenBelow + menuHeight <= containerBottom

  // 决定菜单位置：
  // 1. 如果上方显示不下，就在下方显示
  // 2. 如果下方显示不下，就在上方显示
  // 3. 如果都能显示，优先在下方显示（默认行为）
  let shouldShowOnTop = false
  if (!canShowBelow && canShowAbove) {
    // 下方显示不下，但上方可以显示
    shouldShowOnTop = true
    console.log('下方显示不下，但上方可以显示')
  } else if (!canShowAbove && canShowBelow) {
    // 上方显示不下，但下方可以显示
    shouldShowOnTop = false
    console.log('上方显示不下，但下方可以显示')
    textEditorHeight.value = 40
  } else if (!canShowAbove && !canShowBelow) {
    // 上下都显示不下，选择空间更大的那一侧
    const spaceAbove = buttonRect.top - containerTop
    const spaceBelow = containerBottom - buttonRect.bottom
    shouldShowOnTop = spaceAbove > spaceBelow
    console.log('上下都显示不下，选择空间更大的那一侧', shouldShowOnTop)
  } else {
    // 上下都能显示，默认在下方显示
    shouldShowOnTop = false
    console.log('上下都能显示，默认在下方显示')
    textEditorHeight.value = 40
  }

  showMenuOnTop.value = shouldShowOnTop
}

// 显示符号弹出层
const showSymbolPopout = () => {
  saveCursorPosition()
  symbolPopup.value = !symbolPopup.value
  if (symbolPopup.value) {
    // 使用双重 nextTick 确保 DOM 完全渲染
    nextTick(() => {
      nextTick(() => {
        updateMenuPosition()
      })
    })
  }
}

// 监听菜单显示状态，自动更新位置
watch(symbolPopup, (newVal) => {
  if (newVal) {
    nextTick(() => {
      nextTick(() => {
        updateMenuPosition()
      })
    })
  }
})

// 监听编辑模式变化，退出编辑模式时关闭符号面板
watch(isTextEditing, (newVal) => {
  if (!newVal) {
    // 退出编辑模式时关闭符号面板
    symbolPopup.value = false
  }
})
const rafId: any = ref(null)
const superscript_ = computed(() => {
  return selectText.value ? selectText.value.text.split('').every((e: string) => superscriptMapVal.includes(e)) : false
})

const subscript_ = computed(() => {
  return selectText.value ? selectText.value.text.split('').every((e: string) => subscriptMapVal.includes(e)) : false
})
const selectText = ref(null)
const onSelect = (): void => {
  if (canvas.activeObject.value.tag === 'Text' && canvas.app.editor.innerEditing) {
    const editDom = document.querySelector('#textInnerEditor')
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(editDom)
    preRange.setEnd(range.startContainer, range.startOffset)
    const start = preRange.toString().length
    const end = start + range.toString().length
    if (start !== end) {
      selectText.value = { start, end, text: range.toString() }
    }
  }
  rafId.value = requestAnimationFrame(onSelect)
}
// 监听编辑框选区变化，持续保存光标位置
onMounted(() => {
  // 监听编辑框选区变化，持续保存光标位置
  const handleSelectionChange = () => saveCursorPosition()
  const handleInput = () => saveCursorPosition()

  // 监听编辑框输入事件
  const attachListeners = () => {
    const editDom = document.querySelector('#textInnerEditor') as HTMLDivElement | null
    if (!editDom) return false
    document.addEventListener('selectionchange', handleSelectionChange)
    editDom.addEventListener('input', handleInput)
    editDom.addEventListener('blur', handleSelectionChange)
    return true
  }

  // 加定时器，持续监听编辑框选区变化，持续保存光标位置
  const timer = window.setInterval(() => {
    if (attachListeners()) {
      window.clearInterval(timer)
    }
  }, 100)

  // 监听窗口大小变化和滚动，更新菜单位置
  const handleResize = () => {
    if (symbolPopup.value) {
      updateMenuPosition()
    }
  }
  const handleScroll = () => {
    if (symbolPopup.value) {
      updateMenuPosition()
    }
  }
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleScroll, true)
  // 选择光标监听
  rafId.value = requestAnimationFrame(onSelect)
  onBeforeUnmount(() => {
    window.clearInterval(timer)
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('scroll', handleScroll, true)
    // 移除事件监听
    document.removeEventListener('selectionchange', handleSelectionChange)
    const editDom = document.querySelector('#textInnerEditor') as HTMLDivElement | null
    if (editDom) {
      editDom.removeEventListener('input', handleInput)
      editDom.removeEventListener('blur', handleSelectionChange)
    }
    cancelAnimationFrame(rafId.value)
    rafId.value = null
  })
})

// font格式化
const handleFormat = (value: string) => {
  const { editor } = useEditor()
  switch (value) {
    case 'superscript':
      //上标
      if (selectText.value) {
        const editDom = document.querySelector('#textInnerEditor')
        if (superscript_.value) {
          editDom.innerHTML =
            editDom.innerHTML.slice(0, selectText.value.start) + toNormal(selectText.value.text) + editDom.innerHTML.slice(selectText.value.end)
        } else {
          editDom.innerHTML =
            editDom.innerHTML.slice(0, selectText.value.start) + toSuperscript(selectText.value.text) + editDom.innerHTML.slice(selectText.value.end)
        }
        if (canvas.activeObject.value.parent.name === 'Group') {
          const old = canvas.activeObject.value.findOne('Text')
          canvas.app.editor.cancel()
          editor.selectObject(old)
        }
      }
      break
    case 'subscript':
      //下标
      if (selectText.value) {
        const editDom = document.querySelector('#textInnerEditor')
        if (subscript_.value) {
          editDom.innerHTML =
            editDom.innerHTML.slice(0, selectText.value.start) + toNormal(selectText.value.text) + editDom.innerHTML.slice(selectText.value.end)
        } else {
          editDom.innerHTML =
            editDom.innerHTML.slice(0, selectText.value.start) + toSubscript(selectText.value.text) + editDom.innerHTML.slice(selectText.value.end)
        }
        if (canvas.activeObject.value.parent.name === 'Group') {
          const old = canvas.activeObject.value.findOne('Text')
          canvas.app.editor.cancel()
          editor.selectObject(old)
        }
      }
      break
  }

  // 弧形文字激活状态更新
  // updateCurveText(canvas.activeObject.value)
  // 记录操作添加到历史
  canvas.undoRedo.save(115)
}

// 插入符号
const insertSymbol = (symbol: string) => {
  const { canvas } = useEditor()

  try {
    // 检查是否处于文本编辑模式
    if (canvas.app.editor.innerEditing) {
      // 直接通过 DOM 获取文本编辑框（TextEditor 创建的 DOM 元素 id 为 'textInnerEditor'）
      const editDom = document.querySelector('#textInnerEditor') as HTMLDivElement

      if (!editDom) {
        console.error('找不到编辑DOM元素，可能不在文本编辑模式')
        return
      }

      // 先聚焦编辑框
      editDom.focus()

      // 使用 nextTick 等待焦点恢复
      nextTick(() => {
        const selection = window.getSelection()
        if (!selection) return

        let range: Range | null = null

        // 优先使用保存的光标位置（基于文本位置恢复）
        if (savedCursorPosition) {
          range = restoreCursorPosition(editDom)
          if (range) {
            console.log('使用保存的光标位置:', savedCursorPosition)
          } else {
            console.log('恢复光标位置失败')
            savedCursorPosition = null
          }
        }

        // 如果没有保存的光标位置，尝试获取当前选区
        if (!range && selection.rangeCount > 0) {
          const currentRange = selection.getRangeAt(0)
          // 检查选区是否在编辑框内
          if (editDom.contains(currentRange.commonAncestorContainer)) {
            range = currentRange.cloneRange()
            console.log('使用当前选区')
            // 保存当前光标位置
            saveCursorPosition()
          }
        }

        // 如果没有有效的选区，将光标放在编辑框内容的末尾
        if (!range) {
          console.log('没有有效选区，使用末尾位置')
          range = document.createRange()
          range.selectNodeContents(editDom)
          range.collapse(false) // false 表示折叠到末尾
        }

        // 先设置选区，确保光标位置正确
        selection.removeAllRanges()
        selection.addRange(range)

        // 删除选中的内容（如果有）
        range.deleteContents()

        // 创建文本节点并插入符号
        const textNode = document.createTextNode(symbol)
        range.insertNode(textNode)

        // 将光标移到插入的符号后面
        range.setStartAfter(textNode)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)

        // 更新保存的光标位置
        saveCursorPosition()
        console.log('更新保存的光标位置')

        // 触发 input 事件以更新文本内容（TextEditor 监听 input 事件）
        const inputEvent = new Event('input', { bubbles: true })
        editDom.dispatchEvent(inputEvent)

        // 记录操作到历史
        canvas.undoRedo.save(118)
      })
    } else if (canvas.activeObject.value) {
      // 如果没有内部编辑器但有活动对象，检查是否是文本对象
      const { editor } = useEditor()
      let textObject = canvas.activeObject.value

      // 如果不是直接的文本对象，尝试查找子文本对象
      if (!(textObject instanceof Text)) {
        const text = textObject.find('Text')[0]
        if (text && text instanceof Text) {
          textObject = text
        } else {
          console.warn('没有找到文本对象')
          return
        }
      }

      // 直接在文本末尾添加符号
      editor.dateEdit(() => {
        ;(textObject as any).text = ((textObject as any).text || '') + symbol
      }, 1)

      // 记录操作到历史
      canvas.undoRedo.save(118)
    }
  } catch (error) {
    console.error('插入符号失败:', error)
  }

  // 选择后关闭符号弹出层
  symbolPopup.value = false
}
</script>

<style lang="less" scoped>
// 层级子菜单样式
.layer-submenu {
  position: absolute;
  // bottom: 130%;
  left: -30%;
  // transform: translateX(-50%);
  // margin-top: 4px;
  // margin-bottom: 0;
  // background-color: rgba(255, 255, 255, 0.7);
  // border-radius: 10px;
  // box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  // padding: 4px 0;
  // z-index: 1000;
  // min-width: 220px;
  // animation: fadeIn 0.2s ease-out;
  // padding: 10px 10px;
  // backdrop-filter: blur(5px);
  // -webkit-backdrop-filter: blur(5px);
  // transition: top 0.2s ease, bottom 0.2s ease, margin-top 0.2s ease, margin-bottom 0.2s ease;

  // 当菜单在上方显示时
  &.menu-top {
    top: auto !important;
    bottom: 130% !important;
    margin-top: 0 !important;
    margin-bottom: 4px !important;
  }
  &.menu-bottom {
    // top: 130% !important;
    margin-bottom: 0 !important;
    margin-top: 4px !important;
  }

  // 添加小三角形指示器
  // &::before {
  //   content: '';
  //   position: absolute;
  //   top: -8px;
  //   left: 50%;
  //   width: 0;
  //   height: 0;
  //   border-left: 8px solid transparent;
  //   border-right: 8px solid transparent;
  //   border-bottom: 8px solid rgba(255, 255, 255, 0.8);
  //   transform: translateX(-50%);
  // }

  // 添加毛玻璃效果的伪元素
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 10px;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    z-index: -1;
    pointer-events: none;
  }
  .line {
    width: 94%;
    border-bottom: 1px solid #c3c3c3;
    margin: 2px 0;
    margin-left: 3%;
  }

  .submenu-item {
    display: flex;
    align-items: center;
    padding: 8px 6px;
    cursor: pointer;
    transition: background 0.2s;
    border-radius: 14px;
    &:hover {
      background-color: #e6e8e9;
    }

    .submenu-icon {
      margin-right: 8px;
      font-size: 14px;
    }

    .submenu-text {
      flex: 1;
      font-size: 13px;
      color: #6b6b6b;
    }

    .submenu-shortcut {
      color: #999;
      font-size: 12px;
      margin-left: 8px;
    }
  }
}
// 图标的基本样式
.menu-icon,
:deep(.group-icon) {
  transition:
    color 0.3s ease,
    transform 0.3s ease;
}

// 定义图标弹跳动画
@keyframes iconPop {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}

// 保留原有的 active-color 类，以防其他地方需要使用
.active-color {
  color: #1ca6c5;
}

// 淡入动画
@keyframes fadeIn {
  from {
    opacity: 0;
    // transform: translateX(-50%) translateY(-5px);
  }
  to {
    opacity: 1;
    // transform: translateX(-50%) translateY(0);
  }
}

.symbol-popout {
  // position: absolute;
  // top: 130%;
  // left: calc(50% + 230px);
  // top: 140px;
  // left: 50%;
  // transform: translateX(-50%);
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  z-index: 1000;
  min-width: 220px;
  animation: fadeIn 0.2s ease-out;
  padding: 10px 10px;
  // backdrop-filter: blur(5px);
  // -webkit-backdrop-filter: blur(5px);
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  .symbol-item {
    width: 24px;
    height: 24px;
    border: 1px solid #b9bcbd;
    cursor: pointer;
    border-radius: 4px;
    font-size: 16px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    &:hover {
      background-color: #e6e8e9;
    }
  }
}
.follow-button {
  width: auto;
  height: auto;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 4px;
  display: flex;
  gap: 4px;
}
// 按钮包装器，用于定位子菜单
.btn-wrapper {
  position: relative;
  display: inline-block;
}
.btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: 16px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    // background: rgba(102, 204, 153, 0.1);

    // 当按钮悬停时，改变内部图标的颜色并添加动画
    :deep(.group-icon),
    .menu-icon {
      // color: #1ca6c5;
      color: var(--role-theme-color);
      animation: iconPop 0.4s ease forwards;
    }
  }
}
</style>
