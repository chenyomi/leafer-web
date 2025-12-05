import GColor from "@/utils/color/g-color";

// 定义返回类型接口
interface ColorFormatResult {
    color: string;
    opacity?: number;
}

//颜色格式化函数
export const formatColor = (color: string,activeColor: string): ColorFormatResult => {
    //如果输入不满足颜色格式或者输入为空，则还原为之前的值
    
    if (/[^#0-9A-Fa-f]/.test(color) || color.trim() === '') {
        const prevColor = new GColor(activeColor);
        return { color: prevColor.hex.replace('#', '') };
    }

    if(color.length > 6) {
        console.log(color.slice(0, 6),'color.slice(0, 6)');
        
        return { color: color.slice(0, 6) };
    }

    if(color.length == 1) {
        return { color: color.repeat(6) };
    }

    if(color.length == 2) {
        return { color: color.repeat(3) };
    }
    
    if(color.length == 3) {
        // return { color: color.repeat(2) };
    }
    
    if(color.length == 4) {
        const alphaHex = color[3]
        const alphaValue = parseInt(alphaHex, 16) / 15
        const opacity = Number.isInteger(alphaValue * 100)
            ? Math.round(alphaValue * 100)
            : Number((alphaValue * 100).toFixed(2))
        
        const colorPart = color.slice(0, 3)
        return {
            color: colorPart.split('').map(c => c + c).join(''),
            opacity
        };
    }
    if(color.length == 5) {
        const alphaHex = color[4]
        const alphaValue = parseInt(alphaHex, 16) / 15
        const opacity = Number.isInteger(alphaValue * 100)
            ? Math.round(alphaValue * 100)
            : Number((alphaValue * 100).toFixed(2))
        
        const colorPart = color.slice(0, 4)
        return {
            color: colorPart.split('').map(c => c + c).join(''),
            opacity
        };
    }

    return { color: color.toUpperCase() };
}
// 处理传入的颜色，不管是hex还是rgba都能返回字符串颜色，方便后续的比较
export const parseColor=(colorString:string):{color:string,opacity?:number}=> {
  if (!colorString || typeof colorString !== 'string') {
    return null
  }
  
  // 检查是否是 RGBA 格式
  if (colorString.toLowerCase().startsWith('rgba') || colorString.toLowerCase().startsWith('rgb')) {
    return parseRGBA(colorString)
  }
  
  // 检查是否是十六进制格式
  if (colorString.startsWith('#')) {
    return parseHex(colorString)
  }
  
  return null
}
// 格式rgba颜色字符串
function parseRGBA(rgbaString: string): { color: string; opacity?: number } | null {
  const regex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i
  const match = rgbaString.match(regex)

  if (match) {
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    const a = parseFloat(match[4] || '1')

    // 转换为十六进制颜色字符串
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    const color = `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()

    return {
      color,
      opacity: isNaN(a) ? undefined : Math.round(a * 100)
    }
  }

  return null
}
// 处理hex颜色字符串
function parseHex(hexString: string): { color: string; opacity?: number } | null {
  const hex = hexString.replace('#', '')
  let r: number, g: number, b: number

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16)
    g = parseInt(hex.substring(2, 4), 16)
    b = parseInt(hex.substring(4, 6), 16)
  } else {
    return null
  }

  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  const color = `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()

  return {
    color
  }
}