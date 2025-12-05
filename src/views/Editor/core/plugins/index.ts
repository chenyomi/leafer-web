import './RectEditTool'
import './PolygonEditTool'
import './StarEditTool'
import './EllipseEditTool'
import './BracketEditTool'
import './CircularEditTool'
import './FreeTriangleEditTool'
import './TrapezoidEditTool'
import './RectSkewEditTool'

import { EditTool, EditDataHelper } from '@leafer-in/editor'
import { Leafer, Rect, RotateEvent, DragEvent } from 'leafer-ui'
import { AroundHelper, MathHelper, PointHelper, Direction9 } from '@leafer-ui/draw'
import { Keyboard } from '@leafer-ui/core'
// import { useEditor } from '@/views/Editor/app'

EditTool.prototype.onRotate = (e: any): void => {
  const { target, mergeConfig, dragStartData } = e.editor.editBox
  const { around, rotateAround, rotateGap } = mergeConfig

  let origin = rotateAround || target.around || target.origin || around || 'center'
  let rotation: number
  if (e instanceof RotateEvent) {
    rotation = e.rotation
    origin = rotateAround ? AroundHelper.getPoint(rotateAround, target.boxBounds) : target.getBoxPoint(e)
  } else {
    if (Keyboard.isHold('ShiftLeft') || Keyboard.isHold('ShiftRight')) {
      const leafer = target.leafer
      const interaction = leafer.interaction
      const currentMousePos = interaction.hoverData
      const worldPoint = leafer.getWorldPointByClient({
        clientX: currentMousePos.x,
        clientY: currentMousePos.y
      })
      const data = EditDataHelper.getRotateData(target, null, worldPoint, dragStartData, 'center')
      let absoluteDeg = dragStartData.rotation + data.rotation

      const snapStep = 15
      const snapThreshold = 3
      const nearestSnap = Math.round(absoluteDeg / snapStep) * snapStep
      if (Math.abs(absoluteDeg - nearestSnap) <= snapThreshold) {
        absoluteDeg = nearestSnap
        rotation = absoluteDeg - target.rotation
      } else {
        rotation = dragStartData.rotation + data.rotation - target.rotation
      }
      origin = data.origin
    } else {
      if (target.tag !== 'SimulateElement') rotation = e.rotation
      origin = 'center'
    }
  }
  if (target.tag == 'SimulateElement') {
  //   const { canvas } = useEditor()
  //  // 忽略记录历史操作
  //     canvas.undoRedo.withoutListen(() => {
  //       e.editor.group(e.editor.leafList.list)
  //     })
  //   const listenerId = e.editor.on_(DragEvent.END, () => {
  //     // 忽略记录历史操作
  //     canvas.undoRedo.withoutListen(() => {
  //       e.editor.ungroup(e.editor.leafList.list)
  //     })
  //     e.editor.off_(listenerId)
  //   })
  } else {
    target.rotateOf(origin, rotation)
  }
}
