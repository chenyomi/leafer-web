import { Text, Box, Path } from 'leafer-ui'
export function getArcRadius(fontSize: number, curveAmount: number): number {
  if (curveAmount === 0) return Infinity
  const theta = (330 * fontSize * 72) / 96
  const radius = theta / Math.abs(curveAmount)
  // 根据正负仅决定方向，不影响半径大小
  return radius
}

export const handleShowCurve = (element: any, op: boolean) => {
  const box = element.findOne('Box')
  box && element.remove(box)
  const text = element.findOne('Text') as any
  // 下一帧再生成新路径
  const { boxBounds, x, y } = text
  const { width } = boxBounds
  if (!text.curveAmount) {
    // 当移动到0的时候显示原来的文字
    text.opacity = 1
    // 这个为了解决其他地方有隐藏了这个的情况下
    text.visible = true
    return
  }
  text.text = text.text.replace(/\u200B/g, '').replace(/<br\s*\/?>/gi, '\n') // 把 <br> 转换成换行符
  text.opacity = 0
  const radius = getArcRadius(text.fontSize, text.curveAmount)
  const C = 2 * Math.PI * radius
  const dis = (text.text as string).length + 2
  const tW = width / dis
  let startW = 0
  if (C > tW * (text.text as string).length) {
    startW = (C - tW * (text.text as string).length) / 2
  }
  const startWPr = (startW * 360) / C
  const group = new Box({
    x: 0,
    y: 0,
    editable: false,
    resizeChildren: true
  })
  let path
  const offsetK = text.fontSize * text.lineHeight.value || 0
  const offsetY = text.curveAmount > 0 ? radius + offsetK : -radius
  if (text.curveAmount > 0) {
    path = `G ${x + width / 2} ${offsetY} ${radius} ${radius} 90 ${startWPr} ${360 - startWPr} 0`
  } else {
    const a = 180 - startWPr
    path = `G ${x + width / 2} ${offsetY} ${radius} ${radius} 90 ${a} ${-a} 1`
  }
  const pathLine = new Path({
    x: 0,
    y: 0,
    motionPath: true,
    editable: false,
    path: path
  })
  // 给Box添加新的Path轨迹
  group.add(pathLine)
  // op如果内部编辑输入的时候显示预测轨迹
  group.set({
    opacity: op ? 0.2 : 1
  })
  Array.from(text.text as string).forEach((ch, i) => {
    const str = new Text({
      text: ch,
      around: text.curveAmount > 0 ? 'bottom' : 'top',
      fontSize: text.fontSize,
      fontFamily: text.fontFamily,
      fontWeight: text.fontWeight,
      motion: i * tW + tW / 2,
      textDecoration: text.textDecoration,
      textCase: text.textCase,
      textAlign: text.textAlign,
      motionRotation: text.curveAmount > 0 ? 3 : -2,
      fill: text.fill
    })
    group.add(str)
  })
  element.add(group)
}

// base 映射：只需把普通字符 -> 上标/下标（任意已有的上/下标字符）列出来一次
const baseSuperscript: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ',
  d: 'ᵈ',
  e: 'ᵉ',
  f: 'ᶠ',
  g: 'ᵍ',
  h: 'ʰ',
  i: 'ⁱ',
  j: 'ʲ',
  k: 'ᵏ',
  l: 'ˡ',
  m: 'ᵐ',
  n: 'ⁿ',
  o: 'ᵒ',
  p: 'ᵖ',
  r: 'ʳ',
  s: 'ˢ',
  t: 'ᵗ',
  u: 'ᵘ',
  v: 'ᵛ',
  w: 'ʷ',
  x: 'ˣ',
  y: 'ʸ',
  z: 'ᶻ',
  A: 'ᴬ',
  B: 'ᴮ',
  D: 'ᴰ',
  E: 'ᴱ',
  G: 'ᴳ',
  H: 'ᴴ',
  I: 'ᴵ',
  J: 'ᴶ',
  K: 'ᴷ',
  L: 'ᴸ',
  M: 'ᴹ',
  N: 'ᴺ',
  O: 'ᴼ',
  P: 'ᴾ',
  R: 'ᴿ',
  T: 'ᵀ',
  U: 'ᵁ',
  W: 'ᵂ',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾'
}

const baseSubscript: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  // 常见希腊字母的下标形式（如需要可加入）
  β: 'ᵦ',
  γ: 'ᵧ',
  ρ: 'ᵨ',
  φ: 'ᵩ',
  χ: 'ᵪ'
}

// helper: 从 base 映射中收集所有已知上标/下标字符（用于反向映射）
function invertMap(map: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {}
  for (const k in map) {
    inv[map[k]] = map[k] // key: 上/下标字符 -> value: 同样的上/下标字符（作为标准形）
  }
  return inv
}

const knownSupers = invertMap(baseSuperscript) // '¹' -> '¹', 'ᵃ'->'ᵃ' ...
const knownSubs = invertMap(baseSubscript) // '₁' -> '₁', 'ₐ'->'ₐ' ...

// 生成最终的“鲁棒”映射：接受普通字符、上标字符、下标字符，统一输出目标形式
function buildSuperscriptMap(baseSup: Record<string, string>, baseSub: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}

  // 普通字符 -> 上标
  for (const k in baseSup) out[k] = baseSup[k]

  // 已知的下标字符（如 '₁'）也映射到对应的上标（如果我们在 baseSup 找到相同的 base char）
  // 为了做到这一点，我们需要找到下标字符对应的 base 字符：遍历 baseSub 找到哪些 base 的下标字符
  for (const base in baseSub) {
    const subChar = baseSub[base]
    // 如果 base 在 baseSup 有对应的上标，则把 subChar -> 那个上标
    if (base in baseSup) out[subChar] = baseSup[base]
  }

  // 如果输入已经是上标（例如 '¹'），也把它映射为标准上标（自身）
  for (const supChar in knownSupers) out[supChar] = supChar

  return out
}

function buildSubscriptMap(baseSup: Record<string, string>, baseSub: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}

  // 普通字符 -> 下标
  for (const k in baseSub) out[k] = baseSub[k]

  // 已知的上标字符也映射到对应的下标（如果 baseSup 有同名 base）
  for (const base in baseSup) {
    const supChar = baseSup[base]
    if (base in baseSub) out[supChar] = baseSub[base]
  }

  // 已经是下标的字符映射到自身
  for (const subChar in knownSubs) out[subChar] = subChar

  return out
}

const superscriptMap = buildSuperscriptMap(baseSuperscript, baseSubscript)
const subscriptMap = buildSubscriptMap(baseSuperscript, baseSubscript)

// 转换函数（逐字符替换；可以根据需要改成群组替换）
export function toSuperscript(input: string): string {
  let out = ''
  for (const ch of input) {
    if (!ch.includes('&nbsp;')) {
      out += superscriptMap[ch] ?? ch
    } else {
      out += '&nbsp;'
    }
  }
  return out
}

export function toSubscript(input: string): string {
  let out = ''
  for (const ch of input) {
    if (!ch.includes('&nbsp;')) {
      out += subscriptMap[ch] ?? ch
    } else {
      out += '&nbsp;'
    }
  }
  return out
}

export const superscriptMapVal = Object.values(superscriptMap)

export const subscriptMapVal = Object.values(subscriptMap)

// 构建 normalMap：所有上标、下标字符 → 对应的普通 base 字符
function buildNormalMap(baseSup: Record<string, string>, baseSub: Record<string, string>): Record<string, string> {
  const normal: Record<string, string> = {}

  // 上标的 value → key（普通）
  for (const base in baseSup) {
    const supChar = baseSup[base]
    normal[supChar] = base
  }

  // 下标的 value → key（普通）
  for (const base in baseSub) {
    const subChar = baseSub[base]
    normal[subChar] = base
  }

  return normal
}

const normalMap = buildNormalMap(baseSuperscript, baseSubscript)

export function toNormal(input: string): string {
  let out = ''
  for (const ch of input) {
    if (!ch.includes('&nbsp;')) {
      out += normalMap[ch] ?? ch
    } else {
      out += '&nbsp;'
    }
  }
  return out
}

export function replaceSelectedTextInEditor(
  editDom: any,
  selectText: { start: number; end: number; text: string },
  isSuperscript: boolean,
  toSuperscript: (text: string) => string,
  toNormal: (text: string) => string
) {
  if (!editDom || !selectText) return

  const htmlArr = editDom.innerHTML.split('<br>')
  let charCount = 0

  const finallyHtml = htmlArr.map((line: any) => {
    const lineStart = charCount
    const lineEnd = charCount + line.length

    if (selectText.end > lineStart && selectText.start < lineEnd) {
      const startInLine = Math.max(0, selectText.start - lineStart)
      const endInLine = Math.min(line.length, selectText.end - lineStart)
      line =
        line.slice(0, startInLine) +
        (isSuperscript ? toNormal(line.slice(startInLine, endInLine)) : toSuperscript(line.slice(startInLine, endInLine))) +
        line.slice(endInLine)
    }

    charCount += line.length
    return line
  })

  editDom.innerHTML = finallyHtml.join('<br>')
}
