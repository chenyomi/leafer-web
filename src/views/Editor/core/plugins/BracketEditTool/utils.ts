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

/**
 * 将路径数据转换为数字数组，方便计算
 * 这里只是简单遍历拷贝，pathData结构是命令和坐标混合数组
 */
export function pathDataToPoints(pathData: number[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []

  for (let i = 0; i < pathData.length; i++) {
    const cmd = pathData[i]
    if (cmd === 1 || cmd === 2) {
      // 1=MoveTo, 2=LineTo
      points.push({
        x: pathData[i + 1],
        y: pathData[i + 2]
      })
      i += 2 // 跳过坐标
    }
  }

  return points
}

export function pointsToPathData(points: { x: number; y: number }[]): number[] {
  const pathData: number[] = []

  points.forEach((p, i) => {
    // 第一个点用 MoveTo (1)，后面的用 LineTo (2)
    if (i === 0) {
      pathData.push(1, p.x, p.y)
    } else {
      pathData.push(2, p.x, p.y)
    }
  })

  return pathData
}
