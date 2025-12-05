import { Rect, Polygon, Star, Ellipse, PointerEvent, Text, Line, BoundsEvent, ChildEvent } from 'leafer-ui'
import { InnerEditorEvent } from '@leafer-in/editor'
import { registerUI } from '@leafer-ui/core'
import { useEditor } from '@/views/Editor/app'
import { dataProcessor, RectData, PolygonData, StarData, EllipseData, LineData } from '@leafer-ui/core' // 引入跨平台核心包
import { IRectData, IPolygonData, IStarData, IEllipseData, ILineData } from '@leafer-ui/interface'
import { Keyboard } from '@leafer-ui/core'

interface ICustomRectData extends IRectData {}
class CustomRectData extends RectData {}
@registerUI()
export class ShapeRect extends Rect {
  public get __tag() {
    return 'ShapeRect'
  }
  @dataProcessor(CustomRectData)
  declare public __: ICustomRectData
  constructor(json: any) {
    super(json)
    selectShape(this)
  }
}

interface ICustomPolygonData extends IPolygonData {}
class CustomPolygonData extends PolygonData {}
@registerUI()
export class ShapePolygon extends Polygon {
  public get __tag() {
    return 'ShapePolygon'
  }
  @dataProcessor(CustomPolygonData)
  declare public __: ICustomPolygonData
  constructor(json: any) {
    super(json)
    selectShape(this)
  }
}

interface ICustomStarData extends IStarData {}
class CustomStarData extends StarData {}
@registerUI()
export class ShapeStar extends Star {
  public get __tag() {
    return 'ShapeStar'
  }
  @dataProcessor(CustomStarData)
  declare public __: ICustomStarData
  constructor(json: any) {
    super(json)
    selectShape(this)
  }
}

interface ICustomEllipseData extends IEllipseData {}
class CustomEllipseData extends EllipseData {}
@registerUI()
export class ShapeEllipse extends Ellipse {
  public get __tag() {
    return 'ShapeEllipse'
  }
  @dataProcessor(CustomEllipseData)
  declare public __: ICustomEllipseData
  constructor(json: any) {
    super(json)
    selectShape(this)
  }
}

export function handleChange(this: any) {
  const { boxBounds } = this
  const { height, width } = boxBounds
  if (this.parent.tag !== 'Box') return
  let textNode = this.parent.find('Text')[0]
  if (textNode) {
    textNode.set({
      x: width * 0.1,
      y: height / 2 - textNode.boxBounds.height / 2,
      width: width * 0.8,
      height: undefined,
      resizeFontSize: this.parent.lockRatio
    })
  }
}
function handleDoubleClick(this: any): void {
  // if (!this.textEdit) return
  const { boxBounds } = this
  const { height, width } = boxBounds
  const { canvas } = useEditor()
  if (canvas.activeObject.value.locked) return
  const shapeEllipse = canvas.activeObject.value.findOne('ShapeEllipse')
  const shapeStar = canvas.activeObject.value.findOne('ShapeStar')
  // 非完整圆禁止进入内部文字编辑
  if (shapeEllipse) {
    if ((shapeEllipse as any).endAngle !== 0 || (shapeEllipse as any).startAngle !== 0) {
      return
    }
    if ((shapeEllipse as any).innerRadius) return
  }
  // 星星禁止进入内部文字编辑
  if (shapeStar) return
  if (this.parent.tag !== 'Box') return
  let textNode = this.parent.find('Text')[0]
  if (!textNode) {
    textNode = new Text({
      text: 'A',
      fontSize: 10.67,
      editable: false,
      width: width * 0.8,
      height: undefined,
      x: width * 0.1,
      y: height / 2 - 1.5 * 6,
      textAlign: 'center',
      hitSelf: false
    })
    // textNode.on_(BoundsEvent.LOCAL, handleChange.bind(this))
    this.parent.add(textNode)
  } else {
    if (textNode.text == '') {
      textNode.set({
        text: 'A',
        x: width * 0.1,
        y: height / 2 - 1.5 * 6,
        width: width * 0.8,
        height: undefined
      })
    }
  }
  canvas.app.editor.openInnerEditor(textNode, true)
}
function handleInit(e: any): void {
  const { boxBounds, worldTransform } = e
  const { height, width } = boxBounds
  const { x, y } = worldTransform
  if (e.parent.tag !== 'Box') return
  let textNode = e.parent.find('Text')[0]
  if (!textNode) {
    textNode = new Text({
      text: e.data.text,
      fontSize: 10.67,
      editable: false,
      width: width * 0.8,
      height: undefined,
      x: width * 0.1,
      y: height / 2 - 1.5 * 6,
      textAlign: 'center',
      hitSelf: false,
      editConfig: {
        selectedStyle: {
          strokeWidth: 1.5
        }
      }
    })
    // 注意 这个更新依赖于height: undefined会触发autoHeight，然后触发BoundsEvent.LOCAL切记，别瞎改

    e.parent.add(textNode)
  }
  textNode.on_(BoundsEvent.LOCAL, handleChange.bind(e))
}

function handleDes(this: any): void {
  if (this.parent.tag == 'Box' && this.parent.findOne('Text')) {
    this.parent.findOne('Text').remove()
  }
}

function addEvent(e: any): void {
  e.eventIds = [
    e.on_(PointerEvent.DOUBLE_TAP, handleDoubleClick.bind(e)),
    e.on_(BoundsEvent.LOCAL, handleChange.bind(e)),
    e.on_(ChildEvent.REMOVE, handleDes.bind(e))
  ]
}
function selectShape(e: any) {
  const { editor } = useEditor()
  let mounted = true
  e.on_('mounted', () => {
    if (mounted) {
      if (e.parent.tag !== 'Box') return
      addEvent(e)
      handleInit(e)
      if (!Keyboard.isHold('AltLeft') && !Keyboard.isHold('AltRight') && !Keyboard.isHold('Alt')) {
        editor.selectObject(e)
      }
      mounted = false
    }
  })
}
