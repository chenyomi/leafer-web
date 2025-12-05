/**
 * 字符串工具函数集合
 */

/**
 * 判断字符串是链接还是Base64编码
 * @description 判断一个字符串是URL链接还是Base64编码的数据
 * @param str 需要判断的字符串
 * @returns 返回字符串类型，'url'表示是链接，'base64'表示是Base64编码，'unknown'表示无法确定
 */
export function isUrlOrBase64(str: string): 'url' | 'base64' | 'unknown' {
  if (!str || typeof str !== 'string') {
    return 'unknown';
  }

  // 检查是否是data URL (包含Base64)
  if (str.startsWith('data:')) {
    // 检查是否包含base64标识
    if (str.includes(';base64,')) {
      return 'base64';
    }
    return 'unknown';
  }

  // 检查是否是URL
  try {
    // 尝试创建URL对象，如果成功则可能是有效URL
    new URL(str);
    
    // 进一步检查是否包含常见URL协议
    if (str.startsWith('http://') || 
        str.startsWith('https://') || 
        str.startsWith('ftp://') ||
        str.startsWith('file://')) {
      return 'url';
    }
    
    // 相对路径: /assets/images/ 或 assets/images/
    if (/^([A-Za-z]:\\|\\\\|\/|\.\/|\.\.\/|assets\/|\/assets\/)/.test(str)) {
      return 'url';
    }
    
    // 检查是否包含域名结构
    if (/^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}(:[0-9]{1,5})?(\/.*)?\$/.test(str)) {
      return 'url';
    }
  } catch (e) {
    // URL构造失败，不是有效URL
  }

  // 检查是否可能是Base64编码
  // Base64字符集: A-Z, a-z, 0-9, +, /, = (填充)
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  
  // Base64编码的长度必须是4的倍数
  if (base64Regex.test(str) && str.length % 4 === 0) {
    return 'base64';
  }

  return 'unknown';
}

/**
 * 判断字符串是否是URL链接
 * @param str 需要判断的字符串
 * @returns 是否是URL链接
 */
export function isUrl(str: string): boolean {
  return isUrlOrBase64(str) === 'url';
}

/**
 * 判断字符串是否是Base64编码
 * @param str 需要判断的字符串
 * @returns 是否是Base64编码
 */
export function isBase64(str: string): boolean {
  return isUrlOrBase64(str) === 'base64';
}

//是否是本地路径
/**
 * 判断字符串是否是本地文件路径
 * @param str 需要判断的字符串
 * @returns 是否是本地文件路径
 */
export function isLocalPath(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  // 检查Windows格式的绝对路径 (如 C:\folder\file.txt)
  if (/^[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/.test(str)) {
    return true;
  }
  
  // 检查Windows网络共享路径 (如 \\server\share\file.txt)
  if (/^\\\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/.test(str)) {
    return true;
  }
  
  // 检查Unix/Linux格式的绝对路径 (如 /usr/local/file.txt)
  if (/^\/(?:[^\/\0]+\/)*[^\/\0]*$/.test(str)) {
    return true;
  }
  
  // 检查相对路径 (如 ./folder/file.txt 或 ../folder/file.txt)
  if (/^\.\.?\/(?:[^\/\0]+\/)*[^\/\0]*$/.test(str)) {
    return true;
  }
  
  // 检查assets目录下的资源路径 (如 assets/images/file.png 或 /assets/images/file.png)
  if (/^(\/)?assets\/(?:[^\/\0]+\/)*[^\/\0]*$/.test(str)) {
    return true;
  }
  
  return false;
}