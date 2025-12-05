import { App, Frame, Keyboard } from '@leafer-ui/core'
import { EditorMoveEvent } from '@leafer-in/editor'
import { DropEvent, PointerEvent } from 'leafer-ui'

export const altHoldEvent = (app: App, contentFrame: Frame) => {
  let cloneDom: any = null
  let isMoving: boolean = false
  const altMoveClone = (isEnd = false) => {
    const altHold = Keyboard.isHold('AltLeft') || Keyboard.isHold('AltRight') || Keyboard.isHold('Alt')
    setTimeout(() => {
      if (isMoving) {
        // --- Alt 按下：创建克隆 ---
        if (altHold && !isEnd) {
          if (!cloneDom && app.editor.element) {
            const source = app.editor.element
            if (!source.destroyed) {
              cloneDom = source.clone()
              cloneDom.opacity = 0.6 // 可选：半透明显示
              contentFrame.add(cloneDom, 0)
            }
          }
        }
        // --- 拖拽结束额外清理 ---
        if (isEnd) {
          if (cloneDom) {
            !altHold && contentFrame.remove(cloneDom)
            if (altHold) cloneDom.opacity = 1 // 可选：半透明显示
            cloneDom = null
          }
          isMoving = false
        }
      }
    }, 0)
  }
  const altUpRemove = (e: any) => {
    if (cloneDom && e.key === 'Alt') {
      contentFrame.remove(cloneDom)
      cloneDom = null
    }
  }

  const clearAlt = (e: any) => {
    if (Keyboard.isHold('AltLeft') || Keyboard.isHold('AltRight') || Keyboard.isHold('Alt')) {
      cloneDom && altMoveClone(true)
    }

    Keyboard.isHold('Alt') && Keyboard.setUpCode('Alt')
    Keyboard.isHold('AltLeft') && Keyboard.setUpCode('AltLeft')
    Keyboard.isHold('AltRight') && Keyboard.setUpCode('AltRight')
  }
  // 绑定事件（使用箭头函数确保上下文正确）
  app.editor.on(EditorMoveEvent.BEFORE_MOVE, () => {
    const altHold = Keyboard.isHold('AltLeft') || Keyboard.isHold('AltRight') || Keyboard.isHold('Alt')
    if (altHold) {
      !isMoving && altMoveClone(false)
    }
    isMoving = true
  })
  app.editor.on(DropEvent.DROP, () => altMoveClone(true))
  window.addEventListener('keydown', () => isMoving && altMoveClone(false))
  window.addEventListener('keyup', altUpRemove)
  window.addEventListener('mouseup', clearAlt)
}

export const whiteAreaOp = (app: App) => {
  // 多选然后点击内部空白区域啥的 忘记了
  app.editor.on([PointerEvent.TAP, PointerEvent.DOUBLE_TAP], (e: any) => {
    handleClick(app, e)
  })
}
// 处理单击和双击选中元素
const handleClick = (app: App, e: any) => {
  if (app.editor.leafList.list.length == 1 || Keyboard.isHold('Shift') || Keyboard.isHold('ShiftLeft') || Keyboard.isHold('ShiftRight')) return
  const through = app.leafer.pick({ x: e.x, y: e.y }, { through: true, ignoreHittable: true })
  const throughIds = new Set(through.throughPath.list.map((d: any) => d.innerId))
  const hasSame = app.editor.leafList.list.some((c: any) => throughIds.has(c.innerId))
  if (!hasSame) app.editor.cancel()
  else {
    let selectObj = app.editor.leafList.list.find((c: any) => throughIds.has(c.innerId))
    // 尝试通过 proxy 获取 IUI 实例 实现多选时双击或单击其中某个对象时，取消多选，仅选中此对象
    const uiElement = (selectObj as any).proxy || selectObj
    app.editor.select(uiElement)
  }
}
