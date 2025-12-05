import { IFill, IText, IRGB, ITextDecorationType } from '@leafer-ui/interface'
import { ColorConvert, isArray, isObject, isString, isUndefined } from '@leafer-ui/core'
import { toSuperscript, toSubscript, toNormal } from './TextEditTool/utils'

export const textCaseMap = {
  none: 'none',
  title: 'capitalize',
  upper: 'uppercase',
  lower: 'lowercase',
  'small-caps': 'small-caps'
}

export const verticalAlignMap = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end'
}

export const textDecorationMap = {
  none: 'none',
  under: 'underline',
  delete: 'line-through',
  'under-delete': 'underline line-through',
  wavy: 'underline wavy' //波浪线
}

// 拼写检查相关代码已优化，不再使用span标签进行错误标记

export function updateStyle(textDom: HTMLDivElement, text: IText, textScale: number, e: any): void {
  const { style } = textDom
  const { fill, padding, textWrap, textOverflow, textDecoration } = text

  style.fontFamily = text.fontFamily
  style.fontSize = text.fontSize * textScale + 'px'
  setFill(style, fill)

  style.fontStyle = text.italic ? 'italic' : 'normal'
  style.fontWeight = text.fontWeight as string

  let decorationType: ITextDecorationType
  if (isObject(textDecoration)) {
    decorationType = textDecoration.type
    if (textDecoration.color) style.textDecorationColor = ColorConvert.string(textDecoration.color)
  } else {
    decorationType = textDecoration
  }
  style.textDecoration = textDecorationMap[decorationType]

  style.textTransform = textCaseMap[text.textCase]

  style.textAlign = text.textAlign === 'both' ? 'justify' : text.textAlign
  style.display = 'flex'
  style.flexDirection = 'column'
  style.justifyContent = verticalAlignMap[text.verticalAlign]

  style.lineHeight = (text.__.__lineHeight || 0) * textScale + 'px'
  style.letterSpacing = (text.__.__letterSpacing || 0) * textScale + 'px'

  style.whiteSpace = textWrap === 'none' || text.__.__autoWidth ? 'nowrap' : 'normal'
  style.wordBreak = textWrap === 'break' ? 'break-all' : 'normal'

  style.textIndent = (text.paraIndent || 0) * textScale + 'px'
  style.padding = isArray(padding) ? padding.map((item) => item * textScale + 'px').join(' ') : (padding || 0) * textScale + 'px'
  style.textOverflow = textOverflow === 'show' ? '' : textOverflow === 'hide' ? 'clip' : textOverflow
}

function setFill(style: CSSStyleDeclaration, fill: IFill): void {
  let color: string = 'black'

  if (isArray(fill)) {
    fill = fill[0]
  }

  if (isObject(fill)) {
    switch (fill.type) {
      case 'solid':
        color = ColorConvert.string(fill.color)
        break
      case 'image':
        break
      case 'linear':
        color = linearGradientToCSS(fill)
        break
      case 'radial':
      case 'angular':
        const stop = fill.stops[0]
        color = ColorConvert.string(isString(stop) ? stop : stop.color)
        break
      default:
        if (!isUndefined((fill as IRGB).r)) color = ColorConvert.string(fill)
    }
  } else {
    color = fill
  }
  if ((fill as any).type === 'linear') {
    style.color = 'transparent'
    style.background = color
    style.webkitBackgroundClip = 'text'
    style.webkitTextFillColor = 'transparent'
  } else {
    style.color = color
    // style.textShadow = '2px 2px 5px rgba(255,0,255,1)'
    // style.webkitTextStroke = '2px red'
  }
}

/**
 * 将渐变 JSON 转为 CSS
 */
function linearGradientToCSS(grad: any): string {
  if (grad.type !== 'linear') return ''

  // 默认角度 0deg（上到下）
  let angle = 0

  if (grad.from && grad.to) {
    const dx = grad.to.x - grad.from.x
    const dy = grad.to.y - grad.from.y

    // CSS 0deg 是 top → bottom，顺时针为正
    angle = Math.atan2(dx, -dy) * (180 / Math.PI)
    if (angle < 0) angle += 360
  }

  const stops = grad.stops.map((s: any) => `${s.color} ${s.offset * 100}%`).join(', ')

  return `linear-gradient(${angle}deg, ${stops})`
}
