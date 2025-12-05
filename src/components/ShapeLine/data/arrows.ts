import { IArrowType, IPathDataArrow, IPathDataArrowMap, IUI, IPathCommandData, IPointData, IArrowTypeData } from '@leafer-ui/interface'
import { DataHelper, PointHelper, isObject } from '@leafer-ui/draw'

import { PathMatrixHelper } from '../PathMatrixHelper'


const { layout, rotate } = PathMatrixHelper
const { getAngle } = PointHelper
const half = { x: -0.5 }


const angle: any = { connect: { x: -1.05 }, offset: { x: 1.2, bevelJoin: 0.36, roundJoin: 0.22 }, path: [1, 3, -3, 2, -0.1, 0, 2, 3, 3], width: 3 } // moveTo(-3, -3).lineTo(-0.1, 0).lineTo(-3, 3)
const angleSide: any = { 
    connect: { x: -0.6 },
    offset: { x: -0.5, bevelJoin: 0.4, roundJoin: 0.3 }, 
    path: [1, -3, -3, 2, 0, 0, 2, -3, 0], 
    dashPath: undefined, // 明确设置为 undefined，避免默认虚线模式影响
    width: 3
} // moveTo(-3, -3).lineTo(0, 0).lineTo(-3, 0)

const triangleLinePath = [1, -3, 0, 2, -3, -2, 2, 0, 0, 2, -3, 2, 2, -3, 0]  // moveTo(-3, 0).lineTo(-3, -2).lineTo(0, 0).lineTo(-3, 2).lineTo(-3, 0)
const triangle: any = { 
    connect: half, 
    offset: { x: -0.9, bevelJoin: 0.624, roundJoin: 0.4 }, 
    path: [
        ...triangleLinePath,
        // 从左到右有多条填充线，高度逐渐降低
        1, -2.8, -1.6, 2, -2.8, 1.6,
        1, -2.4, -1.4, 2, -2.4, 1.4,
        1, -2.0, -1.2, 2, -2.0, 1.2,
        1, -1.6, -1.0, 2, -1.6, 1.0,
        1, -1.2, -0.8, 2, -1.2, 0.8,
        1, -0.8, -0.6, 2, -0.8, 0.6,
        1, -0.4, -0.4, 2, -0.4, 0.4
    ],
    dashPath: [1, -2, 0, 2, -0.5, 0],
    width: 3
}


const arrowLinePath = [1, -3.2, 0, 2, -4, -2, 2, 0, 0, 2, -4, 2, 2, -3.2, 0]  // moveTo(-3, 0).lineTo(-4, -2).lineTo(0, 0).lineTo(-4, 2).lineTo(-3, 0)
const arrow: any = { 
    connect: half, 
    offset: { x: -0.5, bevelJoin: 0.4, roundJoin: 0.3 }, 
    path: [
        ...arrowLinePath,
        // 使用与triangle类似的填充逻辑，按固定比例缩小
        1, -3.3, -1.6, 2, -3.3, 1.6,
        1, -3.0, -1.4, 2, -3.0, 1.4,
        1, -2.8, -1.2, 2, -2.8, 1.2,
        1, -2.4, -1.0, 2, -2.4, 1.0,
        1, -2.0, -0.8, 2, -2.0, 0.8,
        1, -1.6, -0.6, 2, -1.6, 0.6,
        1, -1.2, -0.4, 2, -1.2, 0.4,
        1, -0.8, -0.2, 2 , -0.8, 0.2,
    ],
    dashPath: [1, -3, 0, 2, -0.4, 0],
    width: 4
}

const triangleFlip: any = { offset: half, path: [...triangle.path], dashPath: [1, -2.5, 0, 2, -1, 0], width: 3 } // triangle rotate 180
rotate(triangleFlip.path, 180, { x: -1.5, y: 0 })

const circleLine: any = { connect: { x: -2.0 }, path: [1, 1.8, -0.1, 2, 1.8, 0, 26, 0, 0, 1.8, 0, 359, 0], width: 4}  //drawArc(0, 0, 2, 0, 360)
const circle: any = { 
    connect: { x: 0.5 }, 
    path: [
        ...circleLine.path,
        // 多层同心圆填充
        1, 0, 0,           // moveTo center
        26, 0, 0, 1.6, 0, 360, 0,  // outer circle
        26, 0, 0, 1.4, 0, 360, 0,  // middle circle
        26, 0, 0, 1.0, 0, 360, 0,  // inner circle
        26, 0, 0, 0.6, 0, 360, 0,  // inner circle
        26, 0, 0, 0.2, 0, 360, 0   // center circle
    ], 
    dashPath: [1, -0.5, 0, 2, 0.5, 0],
    width: 4
} // fill: multiple concentric circles for solid fill

const squareLine: any = { connect: { x: -1.3 }, path: [1, -1.4, 0, 2, -1.4, -1.4, 2, 1.4, -1.4, 2, 1.4, 1.4, 2, -1.4, 1.4, 2, -1.4, 0] } // moveTo(-1.4, 0).lineTo(-1.4, -1.4).lineTo(1.4, -1.4).lineTo(1.4, 1.4).lineTo(-1.4, 1.4).lineTo(-1.4, 0)
const square: any = { 
    path: [
        ...squareLine.path,
        // 从上到下添加多条水平填充线，确保填充到右边界1.4
        2, -1.4, -1.2, 2, 1.4, -1.2,  // 顶部
        2, -1.4, -0.9, 2, 1.4, -0.9,
        2, -1.4, -0.6, 2, 1.4, -0.6,
        2, -1.4, -0.3, 2, 1.4, -0.3,
        2, -1.4, 0, 2, 1.4, 0,        // 中间
        2, -1.4, 0.3, 2, 1.4, 0.3,
        2, -1.4, 0.6, 2, 1.4, 0.6,
        2, -1.4, 0.9, 2, 1.4, 0.9,
        2, -1.4, 1.2, 2, 1.4, 1.2     // 底部
    ],
    width: 3
}

// const diamondLine = DataHelper.clone(squareLine) as IPathDataArrow // square-line rotate 45
// const diamond: IPathDataArrow = DataHelper.clone(square) as IPathDataArrow // square rotate 45
const diamondLine: any = { connect: { x: -1.8 }, path: [1, -1.4, 0, 2, -1.4, -1.4, 2, 1.4, -1.4, 2, 1.4, 1.4, 2, -1.4, 1.4, 2, -1.4, 0] } // moveTo(-1.4, 0).lineTo(-1.4, -1.4).lineTo(1.4, -1.4).lineTo(1.4, 1.4).lineTo(-1.4, 1.4).lineTo(-1.4, 0)
const diamond: any = { 
    path: [
        ...diamondLine.path,
        // 从上到下添加多条水平填充线，确保填充到右边界1.4
        2, -1.4, -1.2, 2, 1.4, -1.2,  // 顶部
        2, -1.4, -0.9, 2, 1.4, -0.9,
        2, -1.4, -0.6, 2, 1.4, -0.6,
        2, -1.4, -0.3, 2, 1.4, -0.3,
        2, -1.4, 0, 2, 1.4, 0,        // 中间
        2, -1.4, 0.3, 2, 1.4, 0.3,
        2, -1.4, 0.6, 2, 1.4, 0.6,
        2, -1.4, 0.9, 2, 1.4, 0.9,
        2, -1.4, 1.2, 2, 1.4, 1.2     // 底部
    ],
    width: 3
}
rotate(diamondLine.path, 45)
rotate(diamond.path, 45)

const mark: any = { 
    offset: {x:-0.3}, 
    path: [
        // 竖线 - 向右移动一点以确保与横线完美衔接
        1, -0.18, -2, 2, -0.18, 2,  // 竖线位置
        // 横线 - 最简布局（上中下三条）
        1, -0.18, -0.03, 2, 0.07, -0.03,   // 最上横线
        1, -0.18, 0, 2, 0.07, 0,           // 中间横线
        1, -0.18, 0.03, 2, 0.07, 0.03      // 最下横线
    ],
    width: 0.25
}


export const arrows: IPathDataArrowMap = {
    angle,
    'angle-side': angleSide,

    arrow,
    triangle,
    'triangle-flip': triangleFlip,

    circle,
    'circle-line': circleLine,

    square,
    'square-line': squareLine,

    diamond,
    'diamond-line': diamondLine,

    mark,

}


//创建箭头路径方法  新增参数 arrowScale 控制箭头大小
export function getArrowPath(ui: IUI, arrow: any, from: IPointData, to: IPointData, scale: number, connectOffset: IPointData, hasDashPattern?: boolean, arrowScale: number = scale): IPathCommandData {
    const { strokeCap, strokeJoin } = ui.__
    let offset, connect, path, dashPath
    if(!isObject(arrow)) {
        offset = arrows[arrow].offset
        connect = arrows[arrow].connect
        path = arrows[arrow].path
        dashPath = arrows[arrow].dashPath
    } else {
        return
    }
    let connectX = connect ? connect.x : 0
    let offsetX = offset ? offset.x : 0

    const data = [...path]
    if (hasDashPattern && dashPath) data.push(...dashPath)

    if (strokeCap !== 'none') connectX -= 0.5
    if (offset) {
        if (strokeJoin === 'round' && offset.roundJoin) offsetX += offset.roundJoin
        else if (strokeJoin === 'bevel' && offset.bevelJoin) offsetX += offset.bevelJoin
    }

    connectOffset.x = (connectX + offsetX) * arrowScale
    // Apply all transformations in a single step
    const angle = getAngle(from, to)
    layout(data, to.x, to.y, arrowScale, arrowScale, angle)

    return data
}