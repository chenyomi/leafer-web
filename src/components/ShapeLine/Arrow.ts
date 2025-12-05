import { IArrow, IArrowData, IArrowInputData, IArrowType } from '@leafer-ui/interface'
import { Line, registerUI, dataProcessor } from '@leafer-ui/draw'
import { PointerEvent } from 'leafer-ui'
import { ArrowData } from './data/ArrowData'
import { arrowType } from './decorator'
import { useEditor } from '@/views/Editor/app'

@registerUI()
export class ShapeLine extends Line implements IArrow {
  public get __tag() {
    return 'ShapeLine'
  }

  @dataProcessor(ArrowData)
  declare public __: IArrowData

  @arrowType('angle')
  declare public endArrow?: IArrowType
  declare public startArrow?: IArrowType
  declare public eventIds: Array<any>
  constructor(data?: IArrowInputData) {
    super(data)
    this.eventIds = [] // 存储事件绑定ID，方便卸载时解绑
    this.__.__useArrow = true
    // this.editInner == 'BracketEditTool' && this.addEvent()
  }
  // public addEvent(): void {
  //   const { canvas } = useEditor()
  //   this.eventIds = [canvas.app.editor.on_(PointerEvent.DOUBLE_TAP, this.handleDoubleClick.bind(this))]
  // }
  // public handleDoubleClick(e: any): void {
  //   const { canvas } = useEditor()
  //   canvas.app.editor.openInnerEditor()
  // }
}
