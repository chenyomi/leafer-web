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
