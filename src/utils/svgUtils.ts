/**
 * SVG工具类
 * 提供SVG处理相关的工具方法
 */

/**
 * SVG缩放配置接口
 */
export interface SvgScaleOptions {
  /** 缩放比例，默认1.5 */
  scaleRatio?: number
  /** 是否保持viewBox不变，默认true */
  keepViewBox?: boolean
}

/**
 * SVG缩放结果接口
 */
export interface SvgScaleResult {
  /** 是否成功 */
  success: boolean
  /** 缩放后的base64 URL */
  scaledUrl?: string
  /** 原始尺寸 */
  originalSize?: { width: number; height: number }
  /** 缩放后尺寸 */
  scaledSize?: { width: number; height: number }
  /** 错误信息 */
  error?: string
}

/**
 * 将base64编码的SVG进行缩放处理
 * @param base64Url - base64编码的SVG URL
 * @param options - 缩放配置选项
 * @returns 缩放结果
 */
export function scaleSvgFromBase64(
  base64Url: string, 
  options: SvgScaleOptions = {}
): SvgScaleResult {
  // const { scaleRatio = 1.5, keepViewBox = true } = options
  const { scaleRatio = 1, keepViewBox = true } = options
  const prefix = 'data:image/svg+xml;base64,'
  
  try {
    // 检查是否为有效的base64 SVG URL
    if (!base64Url.startsWith(prefix)) {
      return {
        success: false,
        error: '无效的base64 SVG URL格式'
      }
    }
    
    // 解码base64获取SVG源码
    let svgCode = atob(base64Url.replace(prefix, ''))
    // console.log('原始SVG代码:', svgCode)
    
    // 使用 DOM 解析以确保只修改最外层 <svg>
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgCode, 'image/svg+xml')
    const root = svgDoc.documentElement // 最外层 <svg>

    // 从根节点解析 viewBox
    const viewBoxAttr = root.getAttribute('viewBox')
    if (!viewBoxAttr) {
      return {
        success: false,
        error: '未找到viewBox属性'
      }
    }

    const values = viewBoxAttr.split(/\s+/).map(Number)
    const [x, y, width, height] = values
    if (values.length !== 4 || values.some(isNaN)) {
      return {
        success: false,
        error: 'viewBox格式无效'
      }
    }

    console.log('原始viewBox尺寸:', width, 'x', height)

    // 计算新的尺寸（基于viewBox的width和height）
    const newWidth = width * scaleRatio
    const newHeight = height * scaleRatio

    console.log('缩放后尺寸:', newWidth, 'x', newHeight)

    // 根据配置决定是否修改viewBox
    if (!keepViewBox) {
      const newViewBox = `${x} ${y} ${newWidth} ${newHeight}`
      root.setAttribute('viewBox', newViewBox)
      console.log('新的viewBox:', newViewBox)
    }

    // 只在根 <svg> 上设置宽高属性
    root.setAttribute('width', String(newWidth))
    root.setAttribute('height', String(newHeight))

    // 序列化回字符串
    const serializer = new XMLSerializer()
    svgCode = serializer.serializeToString(svgDoc)

    // console.log('修改后SVG代码:', svgCode)
    
    // 重新编码为base64
    const newBase64 = btoa(svgCode)
    const newUrl = prefix + newBase64
    // console.log('新的base64 URL:', newUrl)
    
    return {
      success: true,
      scaledUrl: newUrl,
      originalSize: { width, height },
      scaledSize: { width: newWidth, height: newHeight }
    }
    
  } catch (error) {
    console.error('SVG缩放处理失败:', error)
    return {
      success: false,
      error: `SVG缩放处理失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }
}

/**
 * 从SVG代码中提取viewBox信息
 * @param svgCode - SVG源码
 * @returns viewBox信息或null
 */
export function extractViewBoxFromSvg(svgCode: string): { x: number; y: number; width: number; height: number } | null {
  try {
    const viewBoxRegex = /viewBox="([^"]+)"/i
    const match = svgCode.match(viewBoxRegex)
    
    if (!match) {
      return null
    }
    
    const values = match[1].split(/\s+/).map(Number)
    const [x, y, width, height] = values
    
    if (values.length !== 4 || values.some(isNaN)) {
      return null
    }
    
    return { x, y, width, height }
  } catch (error) {
    console.error('提取viewBox失败:', error)
    return null
  }
}

/**
 * 根据根 <svg> 的 viewBox 为其补充 width/height 属性
 * 不修改任何子元素或嵌套 <svg> 的属性
 */
export function ensureRootSizeFromViewBox(svgCode: string): string {
  try {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgCode, 'image/svg+xml')
    const root = svgDoc.documentElement
    const viewBoxAttr = root.getAttribute('viewBox')
    if (!viewBoxAttr) return svgCode

    const values = viewBoxAttr.split(/\s+/).map(Number)
    const [, , width, height] = values
    if (values.length !== 4 || values.some(isNaN)) return svgCode

    root.setAttribute('width', String(width))
    root.setAttribute('height', String(height))

    const serializer = new XMLSerializer()
    return serializer.serializeToString(svgDoc)
  } catch {
    // 解析失败则回退原代码
    return svgCode
  }
}

/**
 * 将SVG代码转换为base64 URL
 * @param svgCode - SVG源码
 * @returns base64编码的SVG URL
 */
export function svgCodeToBase64Url(svgCode: string): string {
  try {
    const base64 = btoa(svgCode)
    return `data:image/svg+xml;base64,${base64}`
  } catch (error) {
    console.error('SVG转base64失败:', error)
    throw new Error('SVG转base64失败')
  }
}

/**
 * 从base64 URL中提取SVG源码
 * @param base64Url - base64编码的SVG URL
 * @returns SVG源码
 */
export function extractSvgCodeFromBase64(base64Url: string): string {
  const prefix = 'data:image/svg+xml;base64,'
  
  if (!base64Url.startsWith(prefix)) {
    throw new Error('无效的base64 SVG URL格式')
  }
  
  try {
    return atob(base64Url.replace(prefix, ''))
  } catch (error) {
    console.error('base64解码失败:', error)
    throw new Error('base64解码失败')
  }
}
