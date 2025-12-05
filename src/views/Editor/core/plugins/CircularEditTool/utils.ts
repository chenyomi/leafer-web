/**
 * 获取椭圆上任意角度点（支持旋转）
 */
export function getPointOnEllipseArc(
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  angle: number
): { x: number; y: number } {
  // 转为弧度，并修正起点角度差（SVG/Canvas 椭圆 0° 在右边）
  const rad = ((angle - 90) * Math.PI) / 180

  // 先在椭圆局部坐标系算点
  let x = radiusX * Math.cos(rad)
  let y = radiusY * Math.sin(rad)

  // 应用椭圆旋转
  if (rotation !== 0) {
    const rotRad = (rotation * Math.PI) / 180
    const cosR = Math.cos(rotRad)
    const sinR = Math.sin(rotRad)
    const nx = x * cosR - y * sinR
    const ny = x * sinR + y * cosR
    x = nx
    y = ny
  }

  // 平移到中心点
  return { x: x + cx, y: y + cy }
}

/**
 * 获取椭圆/圆弧上任意比例点（通用）
 * @param cx 椭圆/圆心 x
 * @param cy 椭圆/圆心 y
 * @param radiusX X 半径
 * @param radiusY Y 半径
 * @param rotation 椭圆旋转角度（度）
 * @param startAngle 起始角（度）
 * @param endAngle 结束角（度）
 * @param anticlockwise 是否逆时针
 * @param t 0~1 圆弧比例，t=0=startAngle，t=1=endAngle
 */
export function getPointOnArc(
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  rotation = 0,
  startAngle = 0,
  endAngle = 360,
  anticlockwise = false,
  t = 0.5
): { x: number; y: number } {
  // 转弧度
  let startRad = (startAngle * Math.PI) / 180
  let endRad = (endAngle * Math.PI) / 180

  // 处理顺/逆时针
  let angleRad: number
  if (!anticlockwise) {
    if (endRad < startRad) endRad += 2 * Math.PI
    angleRad = startRad + (endRad - startRad) * t
  } else {
    if (startRad < endRad) startRad += 2 * Math.PI
    angleRad = startRad - (startRad - endRad) * t
  }

  // 椭圆局部坐标
  let x = radiusX * Math.cos(angleRad)
  let y = radiusY * Math.sin(angleRad)

  // 应用旋转
  if (rotation !== 0) {
    const rotRad = (rotation * Math.PI) / 180
    const cosR = Math.cos(rotRad)
    const sinR = Math.sin(rotRad)
    const nx = x * cosR - y * sinR
    const ny = x * sinR + y * cosR
    x = nx
    y = ny
  }

  // 平移到圆心
  return { x: x + cx, y: y + cy }
}

const commandMap: Record<number, string> = {
  1: 'M',
  2: 'L',
  24: 'G'
}

export function toPathString(data: number[]): string {
  const segments: string[] = []
  for (let i = 0; i < data.length; i += 3) {
    const cmd = commandMap[data[i]] || data[i] // 翻译命令
    const x = data[i + 1]
    const y = data[i + 2]
    segments.push(`${cmd} ${x} ${y}`)
  }
  return segments.join(' ')
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

/** 辅助：度 -> 弧度 */
function degToRad(d: number) {
  return (d * Math.PI) / 180
}

/**
 * getEllipseRadiusAtAngle
 *  根据极角（从中心指向某方向的角度 angleRad），计算该方向上椭圆边界到中心的距离 r(θ)
 *
 *  椭圆方程（以中心为原点）：(x/rx)^2 + (y/ry)^2 = 1
 *  若用极角表示点为 (r cosθ, r sinθ)，代入上式得到 r = 1 / sqrt( (cos^2)/(rx^2) + (sin^2)/(ry^2) )
 *
 *  注意：
 *  - 该函数计算的是“沿极角方向与椭圆交点的距离”，适合把“极角”映射到边界的情形。
 *  - 在我们的整体实现中大多数时候我们使用的是参数角（t）而非极角，故此函数保留为辅助（在某些逻辑需要极角时可用）。
 *
 *  参数：
 *    rX, rY - 椭圆半长轴（像素）
 *    angleRad - 极角，弧度
 *  返回：
 *    沿该极角方向到椭圆边界的距离（像素），若 denom <= 0 则返回 0（防零除）
 */
export function getEllipseRadiusAtAngle(rX: number, rY: number, angleRad: number) {
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  const denom = (c * c) / (rX * rX) + (s * s) / (rY * rY)
  if (denom <= 0) return 0
  return 1 / Math.sqrt(denom)
}

export function computeCenterPoint(
  ellipse: { startAngle?: number; endAngle?: number; innerRadius?: number; width?: number; height?: number; rotation?: number },
  width?: number,
  height?: number
) {
  const w = width ?? ellipse.width ?? 0
  const h = height ?? ellipse.height ?? 0
  const rx = w / 2
  const ry = h / 2
  const cx = rx
  const cy = ry

  const innerRadius = ellipse.innerRadius ?? 0
  const startAngle = ellipse.startAngle ?? 0
  const endAngle = ellipse.endAngle ?? 360
  const rotation = degToRad(ellipse.rotation ?? 0) // ⚡ rotation 转弧度

  let rawSweep = endAngle - startAngle
  if (rawSweep < 0) rawSweep += 360

  const midAngle = startAngle + rawSweep / 2
  const midRad = degToRad(midAngle)

  let px: number
  let py: number

  if (innerRadius > 0) {
    const innerRx = rx * innerRadius
    const innerRy = ry * innerRadius
    const rInnerAtMid = getEllipseRadiusAtAngle(innerRx, innerRy, midRad)
    px = cx + rInnerAtMid * Math.cos(midRad)
    py = cy + rInnerAtMid * Math.sin(midRad)
  } else {
    px = cx
    py = cy
  }

  // 🔄 应用旋转（绕圆心 cx, cy）
  const dx = px - cx
  const dy = py - cy
  const rotatedX = cx + dx * Math.cos(rotation) - dy * Math.sin(rotation)
  const rotatedY = cy + dx * Math.sin(rotation) + dy * Math.cos(rotation)

  return { x: rotatedX, y: rotatedY }
}

export function pointsToPath(points: number[]): string {
  if (!points || points.length === 0) return ''

  const cmdMap: Record<number, string> = {
    24: 'G', // 椭圆弧
    0: 'M',  // MoveTo
    1: 'L',  // LineTo
    2: 'C',  // Cubic Bezier
    3: 'Q',  // Quadratic Bezier
    // 需要的命令继续加
  }

  const cmd = cmdMap[points[0]] ?? 'L'
  return [cmd, ...points.slice(1)].join(' ')
}