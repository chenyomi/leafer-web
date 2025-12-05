import { IPathArrowModule, IUI, IPathCommandData, IPointData } from '@leafer-ui/interface'
import { PathCommandMap as Command, PointHelper } from '@leafer-ui/draw'
import { Path } from 'leafer-ui'
import { arrows, getArrowPath } from './data/arrows'
import { cloneDeep } from 'lodash'

const { M, L, C, Q, Z, N, D, X, G, F, O, P, U } = Command
const { copy, copyFrom, getDistancePoint, getAngle } = PointHelper

const connectPoint = {} as IPointData
const first = {} as IPointData,
  second = {} as IPointData
const last = {} as IPointData,
  now = {} as IPointData

export const PathArrowModule = {
  list: arrows,

  addArrows(ui: IUI, changeRenderPath?: boolean): void {
    const { startArrow, endArrow, strokeWidth, dashPattern, __input, __pathForRender } = ui.__
    let data = null
    if (__input?.path) {
      data = parsePathString(__input.path)
    } else {
      data = cloneDeep(__pathForRender)
    }
    let command: number,
      i = 0,
      len = data.length,
      isEllipse = false,
      count = 0,
      useStartArrow = startArrow && startArrow !== 'none'
    while (i < len) {
      command = data[i]
      switch (command) {
        case M: // moveto(x, y)
        case L: // lineto(x, y)
          if (count < 2 || i + 3 >= len || i + 6 >= len) {
            if (data[i - 6] == U) {
              copyFrom(last, data[i - 5], data[i - 4])
            }
            copyFrom(now, data[i + 1], data[i + 2])
            if (!count && useStartArrow) {
              if (data[i + 3] == U) {
                copy(second, { x: data[i + 4], y: data[i + 5] })
              } else {
                copy(second, { x: data[i + 1], y: data[i + 2] })
              }
              copy(first, now)
            }
          }
          i += 3
          break
        case C: // bezierCurveTo(x1, y1, x2, y2, x, y)
          if (count === 1 || i + 7 === len) copyPoints(data, last, now, i + 3)
          i += 7
          break
        case Q: // quadraticCurveTo(x1, y1, x, y)
          if (count === 1 || i + 5 === len) copyPoints(data, last, now, i + 1)
          i += 5
          break
        case Z: // closepath()
          return // no arrow

        // canvas command

        case N: // rect(x, y, width, height)
          i += 5
          break
        case D: // roundRect(x, y, width, height, radius1, radius2, radius3, radius4)
          i += 9
          break
        case X: // simple roundRect(x, y, width, height, radius)
          i += 6
          break
        case G: // ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise)
          if (i + 9 === len) {
            isEllipse = true
          }
          i += 9
          break
        case F: // simple ellipse(x, y, radiusX, radiusY)
          i += 5
          break
        case O: // arc(x, y, radius, startAngle, endAngle, anticlockwise)
          i += 7
          break
        case P: // simple arc(x, y, radius)
          i += 4
          break
        case U: // arcTo(x1, y1, x2, y2, radius)
          // if (count === 1) {
          //   copyPoints(data, last, now, i + 1)
          // }
          if (i + 9 === len) {
            copyPoints(data, last, now, i + 1)
          }
          i += 6
          break
      }

      count++

      if (count === 1 && command !== M && command !== G) return // no arrow
      if (count === 2 && useStartArrow) copy(second, command === L ? now : last)
      if (i === len) {
        let path = (ui.__.__pathForRender = changeRenderPath ? [...data] : data)
        const pathForArrow: IPathCommandData = (ui.__.__pathForArrow = [])
        if (useStartArrow) {
          //获取开始箭头缩放比例参数
          const scale = (ui as any).startSize || 1
          if (isEllipse) {
            const startPos = computeStartPoint(
              { startAngle: data[6], innerRadius: 0, width: data[3], height: data[4], rotation: data[5] },
              data[3] * 2,
              data[4] * 2
            )
            const G = (arrows[startArrow as any] as any).width * Math.sqrt((ui as any).startSize) * 3
            const startP2 = perpendicularPoints({ x: data[3], y: data[4] }, startPos, 10, 0, G)
            getEllipseArrow(second, first, startP2, startPos, data[3], data[4])
            if (isEllipse && startArrow === 'circle-line') {
              const realG = ((arrows[startArrow as any] as any).width * (ui as any).strokeWidth * (ui as any).startSize) / 2
              const arrowPointN = shrinkStartAngle(path[3], path[4], path[6], path[7], realG + 0.3)
              path[6] = arrowPointN
            }
          }
          const startArrowPath = getArrowPath(ui, startArrow, second, first, strokeWidth, connectPoint, !!dashPattern, strokeWidth * scale)
          dashPattern ? pathForArrow.push(...startArrowPath) : path.push(...startArrowPath)
          if (connectPoint.x && !isEllipse) {
            getDistancePoint(first, second, -connectPoint.x, true)
            path[1] = second.x
            path[2] = second.y
          }
        }

        if (endArrow && endArrow !== 'none') {
          const scale = (ui as any).endSize || 1
          if (isEllipse) {
            const endPos = computeEndPoint(
              { endAngle: data[7], innerRadius: 0, width: data[3], height: data[4], rotation: data[5] },
              data[3] * 2,
              data[4] * 2
            )
            const G = (arrows[endArrow as any] as any).width * Math.sqrt((ui as any).endSize) * 3
            const endPosP2 = perpendicularPoints({ x: data[3], y: data[4] }, endPos, 10, 1, G)
            getEllipseArrow(last, now, endPosP2, endPos, data[3], data[4])
            if (endArrow == 'circle-line') {
              const realG = ((arrows[endArrow as any] as any).width * (ui as any).strokeWidth * (ui as any).endSize) / 2
              const arrowPointN = shrinkEllipseArc(path[3], path[4], path[7], realG)
              path[7] = arrowPointN
            }
          }
          const endArrowPath = getArrowPath(ui, endArrow, last, now, strokeWidth, connectPoint, !!dashPattern, strokeWidth * scale)
          dashPattern ? pathForArrow.push(...endArrowPath) : path.push(...endArrowPath)
          if (connectPoint.x) {
            getDistancePoint(now, last, -connectPoint.x, true)
            let index: number
            switch (command) {
              case L: //lineto(x, y)
                index = i - 3 + 1
                break
              case C: //bezierCurveTo(x1, y1, x2, y2, x, y)
                index = i - 7 + 5
                break
              case Q: //quadraticCurveTo(x1, y1, x, y)
                index = i - 5 + 3
                break
              case U: // arcTo(x1, y1, x2, y2, radius)
                index = i - 6 + 3
                break
            }
            if (index !== undefined && index >= 0) {
              setPoint(path, { x: last.x, y: last.y }, index)
            }
            if ((ui as any).taper) {
              createOrUpdateOverlay(ui, ui.innerId, last, strokeWidth, ui.__.x, ui.__.y)
            } else {
              removeOverlay(ui, ui.innerId)
            }
          }
        }
      } else {
        copy(last, now)
      }
    }
  }
}
function getEllipseArrow(last: any, now: any, p2: any, p: any, rx: any, ry: any) {
  copyFrom(last, p2.x - rx, p2.y - ry)
  copyFrom(now, p.x - rx, p.y - ry)
}

function copyPoints(data: IPathCommandData, from: IPointData, to: IPointData, startIndex: number): void {
  copyFrom(from, data[startIndex], data[startIndex + 1])
  copyFrom(to, data[startIndex + 2], data[startIndex + 3])
}

function setPoint(data: IPathCommandData, point: IPointData, startIndex: number): void {
  data[startIndex] = point.x
  data[startIndex + 1] = point.y
}

function createOrUpdateOverlay(ui: IUI, innerId: number, last: IPointData, strokeWidth: number, baseX: number, baseY: number) {
  const offset = strokeWidth / 2
  const fullOffset = strokeWidth

  let overlay = ui.parent.children.find((e: any) => e.name === `${innerId}_over`) as Path
  const pathStr = `M 0 0 L 0 ${fullOffset} L ${last.x} ${offset} M 0 0 L 0 ${-fullOffset} L ${last.x} ${-offset} Z`
  const angle = getAngle({ x: 0, y: 0 }, last)
  if (overlay) {
    overlay.path = pathStr
    overlay.rotation = angle
  } else {
    overlay = new Path({
      x: baseX,
      y: baseY,
      path: pathStr,
      draggable: true,
      editable: false,
      fill: '#ffffff',
      name: `${innerId}_over`,
      rotation: angle
    })
    ui.parent.add(overlay)
    // 监听 ui 的位置变化
    ui.on('drag', () => {
      const overlay = ui.parent.children.find((e) => e.name === `${ui.innerId}_over`)
      if (!overlay) return
      overlay.x = ui.x
      overlay.y = ui.y
    })
  }
}

function removeOverlay(ui: IUI, innerId: number) {
  if (!ui.parent?.children.length) return
  const overlay = ui.parent.children.find((e: any) => e.name === `${innerId}_over`)
  if (overlay) {
    ui.parent.remove(overlay)
  }
}

const RAD = Math.PI / 180

function paramPointOnEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tRad: number, // 椭圆参数角（弧度）——注意与极角不同
  rotationRad = 0, // 椭圆整体旋转角（弧度）
  radiusScale = 1 // 半径缩放（用于内环/中点）
) {
  // 按参数方程计算点（未考虑整体旋转）
  let x = cx + rx * radiusScale * Math.cos(tRad)
  let y = cy + ry * radiusScale * Math.sin(tRad)

  // 如果椭圆整体有旋转（rotation），把该点绕中心旋转 rotationRad
  if (rotationRad) {
    const dx = x - cx,
      dy = y - cy
    const cosr = Math.cos(rotationRad),
      sinr = Math.sin(rotationRad)
    x = cx + dx * cosr - dy * sinr
    y = cy + dx * sinr + dy * cosr
  }
  return { x, y }
}

export function computeEndPoint(
  ellipse: { endAngle?: number; innerRadius?: number; width?: number; height?: number; rotation?: number },
  width?: number,
  height?: number
) {
  const w = width ?? ellipse.width ?? 0
  const h = height ?? ellipse.height ?? 0
  const rx = w / 2
  const ry = h / 2
  const cx = rx
  const cy = ry

  // 参数角（参数方程所用角度），注意这里直接把 endAngle 当作参数角
  const t = (ellipse.endAngle ?? 360) * RAD
  const rotationRad = (ellipse.rotation ?? 0) * RAD

  // innerRatio 约束在 [0,1]
  const innerRatio = 1
  // 取中点的比例：有内环时在内外环之间取 (1+inner)/2；无内环时在外环与中心之间取 0.5
  const scale = innerRatio > 0 ? (1 + innerRatio) / 2 : 0.5
  return paramPointOnEllipse(cx, cy, rx, ry, t, rotationRad, scale)
}

/**
 * computeStartPoint
 * 计算 start 句柄点（局部坐标），逻辑与 computeEndPoint 类似，只是使用 startAngle
 */
export function computeStartPoint(
  ellipse: { startAngle?: number; innerRadius?: number; width?: number; height?: number; rotation?: number },
  width?: number,
  height?: number
) {
  const w = width ?? ellipse.width ?? 0
  const h = height ?? ellipse.height ?? 0
  const rx = w / 2
  const ry = h / 2
  const cx = rx
  const cy = ry

  const t = (ellipse.startAngle ?? 0) * RAD
  const rotationRad = (ellipse.rotation ?? 0) * RAD

  const innerRatio = 1
  const scale = innerRatio > 0 ? (1 + innerRatio) / 2 : 0.5
  return paramPointOnEllipse(cx, cy, rx, ry, t, rotationRad, scale)
}

type Point = { x: number; y: number }

function perpendicularPoints(P1: Point, P2: Point, d: number, index: number, G: number): Point {
  // 配置参数
  const k_theta = 0.006 // 角度缩放系数，根据实际需要调整
  const theta_max = Math.PI / 6 // 最大偏移角度 15° = π/12

  if (P2.y !== P1.y) {
    // 计算原始切线斜率 k
    const numerator = -(P1.y ** 2) * (P2.x - P1.x)
    const denominator = P1.x ** 2 * (P2.y - P1.y)
    const k = numerator / denominator

    // 计算动态偏移角度 θ = min(k_θ × G, 15°)
    const theta = Math.min(k_theta * G, theta_max)

    // 计算旋转后的偏移向量
    const sqrtPart = Math.sqrt(1 + k * k)
    let dx, dy
    if (index) {
      dx = (d * (Math.cos(theta) + k * Math.sin(theta))) / sqrtPart
      dy = (d * (-Math.sin(theta) + k * Math.cos(theta))) / sqrtPart
    } else {
      dx = (d * (Math.cos(theta) - k * Math.sin(theta))) / sqrtPart
      dy = (d * (Math.sin(theta) + k * Math.cos(theta))) / sqrtPart
    }

    // 根据旋转角度判断是否要翻转方向
    const angle = Math.atan2(P2.y - P1.y, P2.x - P1.x)
    const shouldFlip = Math.sin(angle) < 0

    if ((index === 0 && shouldFlip) || (index === 1 && !shouldFlip)) {
      return { x: P2.x + dx, y: P2.y + dy }
    } else {
      return { x: P2.x - dx, y: P2.y - dy }
    }
  } else {
    // y2 = y1 的情况（竖直切线）
    // 计算动态偏移角度 θ = min(k_θ × G, 15°)
    const theta = Math.min(k_theta * G, theta_max)

    // 计算旋转后的偏移向量
    const dx = d * Math.sin(theta)
    const dy = d * Math.cos(theta)

    // 根据旋转角度判断是否要翻转方向
    const angle = Math.atan2(P2.y - P1.y, P2.x - P1.x)
    const shouldFlip = Math.sin(angle) < 0

    if ((index === 0 && !shouldFlip) || (index === 1 && shouldFlip)) {
      return { x: P2.x - dx, y: P2.y + dy }
    } else {
      return { x: P2.x + dx, y: P2.y - dy }
    }
  }
}
// 假设 Command 已经存在
// paramCount 记录每个命令需要的参数数量
const paramCount: Record<number, number> = {
  [Command.M]: 2,
  [Command.L]: 2,
  [Command.C]: 6,
  [Command.Q]: 4,
  [Command.Z]: 0,
  [Command.N]: 4,
  [Command.D]: 8,
  [Command.X]: 5,
  [Command.G]: 8,
  [Command.F]: 4,
  [Command.O]: 5,
  [Command.P]: 3,
  [Command.U]: 4
}

/**
 * pathStr → 数字数组
 * 支持所有 Command
 * 示例："M 0 0 L 100 0 L 100 100 Z G 0 0 100 100 0 0 270 0"
 */
function parsePathString(pathStr: string): number[] {
  const tokens = pathStr.trim().split(/\s+/)
  const result: number[] = []

  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    const cmd = (Command as any)[token]
    if (cmd === undefined) throw new Error(`未知命令 ${token}`)
    result.push(cmd)
    i++

    const count = paramCount[cmd]
    for (let j = 0; j < count; j++) {
      if (i >= tokens.length) throw new Error(`参数不足，命令 ${token}`)
      const param = Number(tokens[i])
      if (isNaN(param)) throw new Error(`参数错误: ${tokens[i]}`)
      result.push(param)
      i++
    }
  }

  return result
}

// 计算椭圆某段角度区间的弧长
function ellipseArcLength(rx: number, ry: number, startAngle: number, endAngle: number): number {
  const steps = 200 // 步数越大越精确
  const toRad = Math.PI / 180

  let len = 0
  let prevAngle = startAngle

  for (let i = 1; i <= steps; i++) {
    const t = startAngle + (endAngle - startAngle) * (i / steps)
    len += segmentLength(prevAngle * toRad, t * toRad, rx, ry)
    prevAngle = t
  }

  return len
}

// 计算椭圆上两点之间的微段长度
function segmentLength(a1: number, a2: number, rx: number, ry: number): number {
  const x1 = rx * Math.cos(a1)
  const y1 = ry * Math.sin(a1)
  const x2 = rx * Math.cos(a2)
  const y2 = ry * Math.sin(a2)
  return Math.hypot(x2 - x1, y2 - y1)
}

// 主函数：在 endAngle 上减少 10 的弧长
function shrinkEllipseArc(rx: number, ry: number, endAngle: number, cutLength = 10): number {
  // 原始弧长
  const originalLength = ellipseArcLength(rx, ry, 0, endAngle)

  const targetLength = originalLength - cutLength

  if (targetLength <= 0) return 0

  // 用二分法找 newEndAngle
  let low = 0
  let high = endAngle
  let mid = 0

  for (let i = 0; i < 40; i++) {
    // 40 次迭代足够
    mid = (low + high) / 2
    const len = ellipseArcLength(rx, ry, 0, mid)

    if (len > targetLength) {
      high = mid
    } else {
      low = mid
    }
  }

  return mid
}

// ---------- 工具函数 ----------
// 把角度标准化到 [0,360)
function normDeg(a: number) {
  a = a % 360
  if (a < 0) a += 360
  return a
}
const DEG2RAD = Math.PI / 180

// 使用 Simpson 规则（偶数 N）计算从 a 到 b (弧度) 的椭圆弧长积分
function ellipseArcLengthRad(rx: number, ry: number, a: number, b: number, steps = 400): number {
  if (a === b) return 0
  if (steps % 2 === 1) steps++ // Simpson 要偶数步
  const h = (b - a) / steps
  let s = 0

  const integrand = (theta: number) => {
    // sqrt((dx/dθ)^2 + (dy/dθ)^2) where x=rx cosθ, y=ry sinθ
    // dx/dθ = -rx sinθ, dy/dθ = ry cosθ
    const t1 = rx * Math.sin(theta)
    const t2 = ry * Math.cos(theta)
    return Math.sqrt(t1 * t1 + t2 * t2)
  }

  s += integrand(a) + integrand(b)
  for (let i = 1; i < steps; i++) {
    const theta = a + i * h
    s += (i % 2 === 0 ? 2 : 4) * integrand(theta)
  }
  return (h / 3) * s
}

// 辅助：以度为单位计算椭圆从 startDeg 到 endDeg 的弧长（正方向是增角）
// 支持跨越 360° 的情况（如果 endDeg <= startDeg，则视为跨越到 endDeg+360）
function ellipseArcLengthDeg(rx: number, ry: number, startDeg: number, endDeg: number, steps = 400): number {
  startDeg = normDeg(startDeg)
  endDeg = normDeg(endDeg)
  if (endDeg <= startDeg) endDeg += 360
  const a = startDeg * DEG2RAD
  const b = endDeg * DEG2RAD
  return ellipseArcLengthRad(rx, ry, a, b, steps)
}

// ---------- 主函数：推动 start 向 end 方向，使弧长减少 cutLength ----------
/**
 * shrinkStartAngle:
 *   rx, ry: 椭圆半轴
 *   startDeg, endDeg: 原始起止角（度）
 *   cutLength: 要减少的弧长（与坐标单位一致）
 *   steps: Simpson 积分细分，默认 400（越大越精确/越慢）
 *
 * 返回新的 startDeg（度，归一化到 [0,360) 范围）
 */
function shrinkStartAngle(rx: number, ry: number, startDeg: number, endDeg: number, cutLength = 10, steps = 400): number {
  // 规范角度并确保 end 在 start 的“后面”（正向）
  startDeg = normDeg(startDeg)
  endDeg = normDeg(endDeg)
  if (endDeg <= startDeg) endDeg += 360

  const originalLen = ellipseArcLengthDeg(rx, ry, startDeg, endDeg, steps)
  const targetLen = originalLen - cutLength
  if (targetLen <= 0) {
    // 如果要切掉的比整段还长，就直接把 start 推到 end
    return normDeg(endDeg)
  }

  // 二分查找 newStart ∈ [startDeg, endDeg)
  let low = startDeg
  let high = endDeg
  let mid = startDeg

  for (let iter = 0; iter < 40; iter++) {
    mid = (low + high) / 2
    // 计算从 mid 到 endDeg 的弧长
    const lenMidToEnd = ellipseArcLengthDeg(rx, ry, mid, endDeg, steps)

    if (lenMidToEnd > targetLen) {
      // mid 还太靠前（弧长太长），需要把 start 推得更靠近 end（增大 mid）
      low = mid
    } else {
      // mid 已经过头或刚好，缩小区间
      high = mid
    }
  }

  return normDeg(mid)
}
