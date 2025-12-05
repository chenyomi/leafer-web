/**
 * 椭圆控制点初始化工具
 * 提供三条函数（均返回局部坐标，不做 scale/worldTransform 操作）：
 *  - computeCenterPoint(ellipse, width, height)
 *  - computeEndPoint(ellipse, width, height)
 *  - computeRotatePoint(ellipse, width, height)
 *
 * 依赖：ellipse 应包含 width/height（或在调用时传入 width,height）
 *        ellipse 可选字段：startAngle, endAngle, innerRadius, rotation
 *
 * 约定：
 *  - 角度输入/输出以度为单位（内部转换为弧度计算）
 *  - 返回的是局部坐标（以左上角为原点，cx = rx, cy = ry）
 */

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

/**
 * computeCenterPoint
 * 计算 arc 的“中点”位置（局部坐标），用于放置“中心控制点”或标签：
 *
 *  规则说明：
 *  - 以 startAngle 和 endAngle 定义的弧段计算中点角（取角度中点，保证跨越方向为正向 0~360）
 *  - 若 ellipse.innerRadius > 0（有内环），则在内环边界上取对应参数角的点作为中心点（即放在内环边界上）
 *  - 若 innerRadius === 0，则直接返回圆心（cx, cy）
 *
 *  参数：
 *    ellipse: 包含 startAngle, endAngle, innerRadius, width, height（可选）
 *    width, height: 可选覆盖值（优先）
 *
 *  返回：
 *    { x, y }：局部坐标（以左上角为原点，cx = rx, cy = ry）
 */
export function computeCenterPoint(
  ellipse: { startAngle?: number; endAngle?: number; innerRadius?: number; width?: number; height?: number },
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

  // 计算弧长（以度为单位），并保证为正值（支持 end < start 的情况）
  let rawSweep = endAngle - startAngle
  if (rawSweep < 0) rawSweep += 360

  // 中间角度（度），然后转换为弧度用于后续计算
  const midAngle = startAngle + rawSweep / 2
  const midRad = degToRad(midAngle)

  if (innerRadius > 0) {
    // 有内环：按内环的 rx/ry 计算对应参数角上的点
    // 这里使用 getEllipseRadiusAtAngle 计算极半径 r(θ) 再乘 cos/sin 得到坐标（也可使用参数方程）
    // 内环的 rx,ry = rx * innerRadius, ry * innerRadius
    const innerRx = rx * innerRadius
    const innerRy = ry * innerRadius
    const rInnerAtMid = getEllipseRadiusAtAngle(innerRx, innerRy, midRad)
    return {
      x: cx + rInnerAtMid * Math.cos(midRad),
      y: cy + rInnerAtMid * Math.sin(midRad)
    }
  }

  // 无内环时：中点取圆心（约定）
  return { x: cx, y: cy }
}

/**
 * computeEndPoint
 * 计算 end 句柄点（局部坐标）
 *
 *  规则说明：
 *  - 使用椭圆参数方程（x = cx + rx * cos(t), y = cy + ry * sin(t)），t = endAngle（度转弧度）
 *  - 若存在 innerRadius（0~1），按比例在外环与内环之间取中点：
 *      scale = (1 + innerRadius) / 2  （即在相同参数角 t 上缩放 rx/ry）
 *    若没有内环，则取外环与中心之间的中点，等价于 scale = 0.5
 *  - 支持 ellipse.rotation（度），若提供会把计算出的点绕中心旋转 rotation 角度（局部坐标内旋转）
 *
 *  返回局部坐标（cx = rx, cy = ry）
 */
const RAD = Math.PI / 180

function paramPointOnEllipse(
  cx: number, cy: number,
  rx: number, ry: number,
  tRad: number,                            // 椭圆参数角（弧度）——注意与极角不同
  rotationRad = 0,                         // 椭圆整体旋转角（弧度）
  radiusScale = 1                          // 半径缩放（用于内环/中点）
) {
  // 按参数方程计算点（未考虑整体旋转）
  let x = cx + (rx * radiusScale) * Math.cos(tRad)
  let y = cy + (ry * radiusScale) * Math.sin(tRad)

  // 如果椭圆整体有旋转（rotation），把该点绕中心旋转 rotationRad
  if (rotationRad) {
    const dx = x - cx, dy = y - cy
    const cosr = Math.cos(rotationRad), sinr = Math.sin(rotationRad)
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
  const innerRatio = Math.max(0, Math.min(1, ellipse.innerRadius ?? 0))
  // 取中点的比例：有内环时在内外环之间取 (1+inner)/2；无内环时在外环与中心之间取 0.5
  const scale = innerRatio > 0 ? (1 + innerRatio) / 2 : 0.5

  return paramPointOnEllipse(cx, cy, rx, ry, t, rotationRad, scale)
}

/**
 * computeRotatePoint
 * 计算 start 句柄点（局部坐标），逻辑与 computeEndPoint 类似，只是使用 startAngle
 */
export function computeRotatePoint(
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

  const innerRatio = Math.max(0, Math.min(1, ellipse.innerRadius ?? 0))
  const scale = innerRatio > 0 ? (1 + innerRatio) / 2 : 0.5

  return paramPointOnEllipse(cx, cy, rx, ry, t, rotationRad, scale)
}
