import { IUI, ILeaferCanvas } from '@leafer-ui/interface'
import { PathArrow, UI, Paint } from '@leafer-ui/draw'
import { PathArrowModule } from './PathArrowModule'
import { arrowType } from './decorator'

// addAttr
UI.addAttr('startArrow', 'none', arrowType)
UI.addAttr('endArrow', 'none', arrowType)

// 给UI添加自定义属性 =》 起始箭头缩放比例
UI.addAttr('startSize', 1)
// 给UI添加自定义属性 =》 结束箭头缩放比例
UI.addAttr('endSize', 1)
// taper
UI.addAttr('taper', false)

Object.assign(PathArrow, PathArrowModule)
Object.assign(Paint, {
    strokeArrow(_stroke: string, ui: IUI, canvas: ILeaferCanvas): void {
        if (ui.__.dashPattern) {  // fix: dashPattern Arrow
            canvas.beginPath()
            ui.__drawPathByData(canvas, ui.__.__pathForArrow)
            canvas.dashPattern = null
            canvas.stroke()
        }
    }
})