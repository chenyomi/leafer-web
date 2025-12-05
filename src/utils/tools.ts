/**
 * 将像素值转换为 rem 单位
 * @param px - 像素值（可以是数字或带有单位的字符串）
 * @returns 转换后的 rem 字符串
 */
export function px2rem(px: string | number): string {
  const value = px.toString() // 确保 px 是字符串类型

  if (/%\b/.test(value)) {
    // 匹配以 % 结尾的情况
    return value // 直接返回原字符串
  } else {
    const num = parseFloat(value)
    if (isNaN(num)) {
      throw new Error('Invalid pixel value')
    }
    return num / 192 + 'rem' // 将像素值转换为 rem
  }
}
