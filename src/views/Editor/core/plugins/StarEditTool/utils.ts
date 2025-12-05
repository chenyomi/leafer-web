type Point = { x: number; y: number }

// 解析路径数据，分段返回对象列表
// 支持命令: 1 MoveTo (2个坐标), 2 LineTo (2个坐标), 5 Cubic Bezier (6个坐标), 11 ClosePath (无坐标)
function parsePathSegments(pathData: number[]) {
  const segments: {
    cmd: number
    points: Point[]
  }[] = []

  for (let i = 0; i < pathData.length; ) {
    const cmd = pathData[i]
    if (cmd === 1 || cmd === 2) {
      // MoveTo 或 LineTo，后面跟2个坐标
      segments.push({
        cmd,
        points: [{ x: pathData[i + 1], y: pathData[i + 2] }]
      })
      i += 3
    } else if (cmd === 5) {
      // Cubic Bezier，后面跟6个坐标 (3个点)
      segments.push({
        cmd,
        points: [
          { x: pathData[i + 1], y: pathData[i + 2] },
          { x: pathData[i + 3], y: pathData[i + 4] },
          { x: pathData[i + 5], y: pathData[i + 6] }
        ]
      })
      i += 7
    } else if (cmd === 11) {
      // ClosePath，无坐标
      segments.push({ cmd, points: [] })
      i += 1
    } else {
      throw new Error(`不支持的命令: ${cmd}`)
    }
  }

  return segments
}

// 计算点 p 到线段 p1-p2 最近点
function closestPointOnSegment(p1: Point, p2: Point, p: Point): { point: Point; distance: number } {
  const vx = p2.x - p1.x
  const vy = p2.y - p1.y
  const wx = p.x - p1.x
  const wy = p.y - p1.y
  const c1 = vx * wx + vy * wy
  if (c1 <= 0) return { point: p1, distance: Math.hypot(p.x - p1.x, p.y - p1.y) }
  const c2 = vx * vx + vy * vy
  if (c2 <= c1) return { point: p2, distance: Math.hypot(p.x - p2.x, p.y - p2.y) }
  const b = c1 / c2
  const pb = { x: p1.x + b * vx, y: p1.y + b * vy }
  return { point: pb, distance: Math.hypot(p.x - pb.x, p.y - pb.y) }
}

// 计算三次贝塞尔曲线在 t 点的位置
function cubicBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y
  }
}

// 计算点 p 到三次贝塞尔曲线的最近点（用采样法）
// p0 是起点，p1,p2 控制点，p3 终点
function closestPointOnCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, p: Point): { point: Point; distance: number } {
  const STEPS = 100 // 采样步数，越大越精确越慢
  let minDist = Infinity
  let closest: Point = p0
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS
    const pt = cubicBezierPoint(t, p0, p1, p2, p3)
    const dist = Math.hypot(pt.x - p.x, pt.y - p.y)
    if (dist < minDist) {
      minDist = dist
      closest = pt
    }
  }
  return { point: closest, distance: minDist }
}

/**
 * 主函数，传入路径数据和外部点，返回离路径最近的点和距离
 */
export function getClosestPointOnPath(pathData: number[], outsidePoint: Point) {
  const segments = parsePathSegments(pathData)

  let currentPoint: Point | null = null
  let startPoint: Point | null = null // 用于 ClosePath 回环
  let minDistance = Infinity
  let closestPoint: Point = { x: 0, y: 0 }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]

    if (seg.cmd === 1) {
      // MoveTo
      currentPoint = seg.points[0]
      startPoint = currentPoint
    } else if (seg.cmd === 2 && currentPoint) {
      // LineTo
      const res = closestPointOnSegment(currentPoint, seg.points[0], outsidePoint)
      if (res.distance < minDistance) {
        minDistance = res.distance
        closestPoint = res.point
      }
      currentPoint = seg.points[0]
    } else if (seg.cmd === 5 && currentPoint) {
      // Cubic Bezier
      const p0 = currentPoint
      const [p1, p2, p3] = seg.points
      const res = closestPointOnCubicBezier(p0, p1, p2, p3, outsidePoint)
      if (res.distance < minDistance) {
        minDistance = res.distance
        closestPoint = res.point
      }
      currentPoint = p3
    } else if (seg.cmd === 11 && currentPoint && startPoint) {
      // ClosePath，连接最后点和起始点
      const res = closestPointOnSegment(currentPoint, startPoint, outsidePoint)
      if (res.distance < minDistance) {
        minDistance = res.distance
        closestPoint = res.point
      }
      currentPoint = startPoint
    }
  }

  return { point: closestPoint, distance: minDistance }
}

/**
 * 从pathData中解析出前三个点（命令1和2后跟的坐标）
 * 主要用于初始化或获取基础点位
 */
export function getFirstThreePointsFromPathData(pathData: number[]) {
  const points: { x: number; y: number }[] = []

  for (let i = 0; i < pathData.length; i++) {
    const cmd = pathData[i]
    // 命令 1(MoveTo) 或 2(LineTo) 后面紧跟两个坐标x,y
    if (cmd === 1 || cmd === 2) {
      const x = pathData[i + 1]
      const y = pathData[i + 2]
      points.push({ x, y })
      i += 2 // 跳过坐标索引
      if (points.length === 3) break
    }
  }

  return points
}

/**
 * 将路径数据转换为数字数组，方便计算
 * 这里只是简单遍历拷贝，pathData结构是命令和坐标混合数组
 */
export function pathData2NumberData(pathData: any): number[] {
  const numberData: number[] = []
  for (const cmd of pathData) {
    numberData.push(cmd)
  }
  return numberData
}


export function getMaxCornerRadiusFromFlatData(flatData: number[]): number {
  const points: { x: number; y: number }[] = [];

  // 自动提取点数据（跳过 path 命令码）
  for (let i = 0; i < flatData.length; i += 3) {
    const x = flatData[i + 1];
    const y = flatData[i + 2];
    if (typeof x === 'number' && typeof y === 'number') {
      points.push({ x, y });
    }
  }

  if (points.length < 3) return 0;

  let minHalfEdge = Infinity;
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];

    // 两条相邻边的长度
    const lenPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const lenNext = Math.hypot(curr.x - next.x, curr.y - next.y);

    // 最大圆角半径 ≈ 最短相邻边的一半
    const halfEdge = Math.min(lenPrev, lenNext) / 2;
    minHalfEdge = Math.min(minHalfEdge, halfEdge);
  }
  return minHalfEdge;
}

// 计算多边形中心点 
export function calcPolygonCenter(pathData: number[]): { x: number; y: number } {
  let sumX = 0, sumY = 0, count = 0
  for (let i = 0; i < pathData.length;) {
    const cmd = pathData[i++]
    if (cmd === 1 || cmd === 2) {
      sumX += pathData[i++]
      sumY += pathData[i++]
      count++
    } else if (cmd === 11) {
      // close path
    } else {
      throw new Error(`未知命令码: ${cmd}`)
    }
  }
  return { x: sumX / count, y: sumY / count }
}


function createRotatedCursor(rotation = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
    <g transform="rotate(${rotation},12,12)">
      <path fill-rule="evenodd"
        d="M3 11.4L7.5 8.0V10.4H16.5V8.0L21 11.4L16.5 14.9V12.4H7.5V14.9L3 11.4Z"
        fill="black"/>
    </g>
  </svg>`
  const base64 = btoa(unescape(encodeURIComponent(svg))) // Unicode-safe -> base64
  return {
    url: `data:image/svg+xml;base64,${base64}`, // 用作 ICursorType.url
    x: 12,
    y: 12
  }
}

export function createRotatedCursorCss(rotation = 0) {
  const obj = createRotatedCursor(rotation)
  // 返回可直接赋给 element.style.cursor 的 CSS 字符串
  return {
    url: `${obj.url}`,
    x: 12,
    y: 12
  }
}
