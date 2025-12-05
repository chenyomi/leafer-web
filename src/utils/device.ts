//1.webGL硬件信息以及扩展信息
//2.webGL渲染行为特征
//3.Canvas指纹特征
//4.屏幕和浏览器信息
//5.硬件并发能力
//6.音频上下文特征
//7.组合特征并生成最终指纹

import { Console, log } from 'console'
import JSEncrypt from 'jsencrypt'
import { partialRight } from 'lodash'

/**
 * 收集设备特征信息，包括屏幕信息、浏览器信息、硬件信息等
 * @returns {Object} 包含各种设备特征的对象
 */
function collectDeviceFeatures() {
  // 收集屏幕信息
  const screenFeatures = {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio || 1
  };
  
  // 收集浏览器和操作系统信息
  const userAgentData = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  };
  
  // 收集硬件并发能力
  const hardwareFeatures = {
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    deviceMemory: (navigator as any).deviceMemory || 0
  };
  
  return {
    screenFeatures,
    userAgentData,
    hardwareFeatures,
    timeZoneOffset: new Date().getTimezoneOffset()
  };
}

/**
* 异步获取Web Audio指纹，并处理API不可用的情况
* @returns {Promise<string>} 返回一个Promise，解析为指纹字符串或错误标识
*/
async function getAudioFingerprint() {
    // 1. 首先检查构造函数是否存在
    const AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
 
    if (!AudioContext) {
        console.warn('当前环境不支持 OfflineAudioContext，无法生成Audio指纹。');
        return 'not_supported'; // 返回一个明确的标识符
    }
 
    try {
        // 只有在构造函数存在时，才继续执行
        const audioCtx = new AudioContext(1, 44100, 44100);
 
        const oscillator = audioCtx.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
 
        const compressor = audioCtx.createDynamicsCompressor();
        [
            ['threshold', -50],
            ['knee', 40],
            ['ratio', 12],
            ['reduction', -20],
            ['attack', 0],
            ['release', 0.25]
        ].forEach(item => {
            if (compressor[item[0]] !== undefined && typeof compressor[item[0]].setValueAtTime === 'function') {
                compressor[item[0]].setValueAtTime(item[1], audioCtx.currentTime);
            }
        });
 
        oscillator.connect(compressor);
        compressor.connect(audioCtx.destination);
        oscillator.start(0);
 
        const renderedBuffer = await audioCtx.startRendering();
        const pcmData = renderedBuffer.getChannelData(0);
 
        let fingerprint = 0;
        for (let i = 0; i < pcmData.length; i++) {
            fingerprint += Math.abs(pcmData[i]);
        }
 
        return String(fingerprint);
 
    } catch (error) {
        console.error('生成Audio指纹时发生错误:', error);
        // 即使构造函数存在，startRendering等方法也可能因隐私设置而失败
        return 'error_during_generation'; 
    }
}
 

/**
 * 提取音频上下文特征，不同设备的音频处理特性会有差异
 * @returns {Promise<string>} 音频特征的哈希值
 */
async function extractAudioFeatures() {
  try {
    // 检查AudioContext是否可用
    if (typeof window.AudioContext === 'undefined' && 
        typeof (window as any).webkitAudioContext === 'undefined') {
      return 'audio-api-not-supported';
    }
    
    // 创建音频上下文
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    console.log(audioContext,'audioContext')
    
    // 创建振荡器
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    
    // 设置音频节点参数
    gainNode.gain.value = 0; // 静音
    analyser.fftSize = 2048;
    oscillator.type = 'triangle'; // 使用三角波
    oscillator.frequency.value = 10000; // 设置频率
    
    // 连接节点
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 收集音频处理数据
    const audioData: number[] = [];
    
    return new Promise((resolve) => {
      scriptProcessor.onaudioprocess = (event:any) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // 只取部分样本点以减少数据量
        for (let i = 0; i < dataArray.length; i += 100) {
          audioData.push(dataArray[i]);
        }
        
        // 收集足够的数据后停止
        if (audioData.length > 20) {
          // 清理资源
          scriptProcessor.onaudioprocess = null;
          oscillator.stop();
          oscillator.disconnect();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          audioContext.close();
          
          // 返回音频特征的哈希值
          resolve(simpleHash(audioData.join(',')));
        }
      };
      
      // 启动振荡器
      oscillator.start(0);
      console.log(audioData,'audioData')
      // 设置超时，防止无限等待
      setTimeout(() => {
        if (audioData.length === 0) {
          oscillator.stop();
          oscillator.disconnect();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          audioContext.close();
          resolve('audio-timeout');
        }
      }, 1000);
    });
  } catch (error) {
    console.error('提取音频特征时出错:', error);
    return 'audio-error-' + String(error).substring(0, 10);
  }
}

// 步骤1：获取WebGL上下文
const getWebGLContext = () => {
  const canvas = document.createElement('canvas')
  // 兼容不同浏览器的WebGL上下文获取方式
  const contexts = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl']
  for (const ctx of contexts) {
    try {
      const gl = canvas.getContext(ctx)
      if (gl) return gl
    } catch (e) {
      console.log(e)
    }
  }
  return null
}

// 步骤2：提取WebGL硬件和扩展特征
const extractWebGLFeatures = (gl: any) => {
  const features = {
    renderer: gl.getParameter(gl.RENDERER), // GPU渲染器（核心特征）
    vendor: gl.getParameter(gl.VENDOR), // GPU供应商
    version: gl.getParameter(gl.VERSION), // WebGL版本
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION), // 着色器语言版本
    extensions: gl.getSupportedExtensions() || [] // 支持的扩展列表
  }
  
  // 生成WebGL硬件和扩展特征的哈希
  const featuresStr = [
    features.renderer,
    features.vendor,
    features.version,
    features.shadingLanguageVersion,
    features.extensions.slice(0, 10).join(',') // 只取前10个扩展，减少差异
  ].filter(Boolean).join('|');
  
  return {
    ...features,
    hash: simpleHash(featuresStr) // 添加哈希值
  }
}

// 步骤3：提取渲染行为特征（绘制3D图形并分析像素）
const extractRenderFeatures = (gl: any) => {
  // 设置画布尺寸（小尺寸降低性能消耗）
  const width = 64,
    height = 64
  const canvas = gl.canvas
  canvas.width = width
  canvas.height = height

  // 清除画布为黑色
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // 绘制一个带纹理的三角形（测试GPU渲染细节）
  // 1. 定义顶点数据
  const vertices = new Float32Array([
    -0.5,
    -0.5,
    0.0, // 左下
    0.5,
    -0.5,
    0.0, // 右下
    0.0,
    0.5,
    0.0 // 上
  ])

  // 2. 创建顶点缓冲区
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  // 3. 编写简单着色器（测试GPU着色能力）
  const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    `
                attribute vec3 aPosition;
                void main() {
                    gl_Position = vec4(aPosition, 1.0);
                }
            `
  )
  const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
                precision mediump float;
                void main() {
                    // 渐变色测试（不同GPU的颜色插值可能有差异）
                    gl_FragColor = vec4(gl_FragCoord.x / ${width}, gl_FragCoord.y / ${height}, 0.5, 1.0);
                }
            `
  )

  // 4. 链接着色器程序
  const program = gl.createProgram()
  
  // 直接尝试链接程序，不检查着色器创建是否成功
  if (vertexShader) gl.attachShader(program, vertexShader)
  if (fragmentShader) gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  
  // 直接使用程序，不检查链接是否成功
  try {
    gl.useProgram(program)
  } catch (e) {
    // 忽略程序使用错误，继续执行后续代码
    console.log('WebGL程序使用时出现错误，但将继续执行')
  }

  // 5. 启用顶点属性并绘制
  const positionLoc = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(positionLoc)
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  // 6. 读取像素数据（捕捉渲染差异）
  const pixels = new Uint8Array(width * height * 4) // RGBA格式
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

  // 返回像素数据的哈希（简化版）
  return simpleHash(pixels.join(','))
}

// 步骤4：提取Canvas指纹特征
function extractCanvasFeatures() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 100
  canvas.height = 50

  // 只使用简单的矩形和固定颜色
  ctx.fillStyle = 'rgb(255, 0, 0)'
  ctx.fillRect(0, 0, 50, 50)

  ctx.fillStyle = 'rgb(0, 255, 0)'
  ctx.fillRect(50, 0, 50, 50)

  // 不添加文本或复杂图形
  const imageData = ctx.getImageData(0, 0, 100, 50)
  const pixels = imageData.data

  // 采样策略：只取每100个像素，减少差异
  const sampledPixels = []
  for (let i = 0; i < pixels.length; i += 400) {
    sampledPixels.push(pixels[i], pixels[i + 1], pixels[i + 2])
  }

  return {
    pixelHash: simpleHash(sampledPixels.join(',')),
    canvasFeatures: {
      width: canvas.width,
      height: canvas.height
    }
  }
}

// 辅助函数：创建并编译着色器
const createShader = (gl: any, type: any, source: any) => {
  try {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    // 不检查编译状态，直接返回着色器对象
    return shader;
  } catch (e) {
    // 如果创建过程中出现任何错误，记录日志但不中断流程
    console.log('着色器创建过程中出现错误，但将继续执行')
    return null;
  }
}

/**
 * 辅助函数：简单哈希算法
 * @param {any} str - 需要计算哈希的字符串或对象
 * @param {number} length - 生成的哈希值长度，默认为16位
 * @returns {string} 指定长度的哈希值
 */
const simpleHash = (str: any, length: number = 16) => {
  // 基础哈希计算
  const getBaseHash = (input: string) => {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash + char) | 0 // 32位整数
    }
    return Math.abs(hash).toString(16)
  }
  
  // 确保输入是字符串
  const inputStr = String(str)
  let result = ''
  
  // 生成足够长度的哈希值
  while (result.length < length) {
    // 每次添加一个不同的盐值来生成不同的哈希段
    const salt = result + inputStr + result.length
    result += getBaseHash(salt)
  }
  
  // 截取指定长度
  return result.substring(0, length)
}

/**
 * 主函数：生成完整设备指纹
 * @returns {Promise<Object>} 包含设备ID和加密指纹的对象
 */
const generateWebGLFingerprint = async () => {
  try {
    // 获取WebGL上下文
    const gl = getWebGLContext()
    if (!gl) {
      console.warn('当前设备不支持WebGL，将使用其他特征生成指纹');
    }

    // 收集所有可用的设备特征
    const deviceInfo = collectDeviceFeatures();
    const audioFeatureHash = await getAudioFingerprint();
    
    // 提取WebGL特征（如果可用）
    let webGLFeatures = {};
    let renderHash = null;
    let canvasFeatures = null;
    
    if (gl) {
      webGLFeatures = extractWebGLFeatures(gl);
      renderHash = extractRenderFeatures(gl);
      canvasFeatures = extractCanvasFeatures();
      console.log(webGLFeatures,renderHash,canvasFeatures)
    }

    // 组合所有特征生成稳定的设备ID
    // 注意：我们只使用稳定的特征来生成deviceId，确保同一设备ID不变
    const stableFeatures = [
      // 设备硬件特征（相对稳定）
      deviceInfo.screenFeatures.width,
      deviceInfo.screenFeatures.height,
      deviceInfo.screenFeatures.colorDepth,
      deviceInfo.hardwareFeatures.hardwareConcurrency,
      deviceInfo.hardwareFeatures.deviceMemory,
      deviceInfo.userAgentData.platform,
      // WebGL硬件特征（使用专门生成的哈希值）
      (webGLFeatures as any).hash || (webGLFeatures as any).vendor,
      renderHash, // 渲染特征哈希
      canvasFeatures.pixelHash, // 画布特征哈希
      // 音频特征
      audioFeatureHash
    ].filter(Boolean).join('|');
    
    // 生成设备ID（不包含时间戳，确保同一设备ID稳定）
    const deviceId = simpleHash(stableFeatures);
    // const deviceId = '36b2bf5941def7b6'
    console.log(deviceId)
    console.log(stableFeatures)
    
    // 组合所有特征（包括不稳定特征）生成完整指纹
    // 这样可以确保不同设备的指纹差异更大
    // const allFeatures = [
    //   // 稳定特征
    //   stableFeatures,
    //   // 不稳定但有区分度的特征
    //   gl ? renderHash : '',
    //   gl ? canvasFeatures?.pixelHash : '',
    //   deviceInfo.timeZoneOffset,
    //   deviceInfo.userAgentData.language,
    //   // 添加时间戳使指纹具有时效性（仅用于加密指纹，不影响deviceId）
    //   new Date().getTime()
    // ].filter(Boolean).join('|');
    
    // 生成加密指纹（包含时间戳）
    const fingerprintResult = simpleHash(stableFeatures) + '-' + new Date().getTime() + '-' + stableFeatures
    // const fingerprintResult = '36b2bf5941def7b6' + '-' + new Date().getTime()
    const fingerprint = encrypt(fingerprintResult);

    console.log('生成的设备指纹:', fingerprintResult,deviceId);

    return {
      deviceId, // 设备指纹不加密，同一设备保持不变
      fingerprint, // 加密指纹，包含时间戳
      timestamp: new Date().getTime()
    };
  } catch (error) {
    console.error('生成设备指纹时出错:', error);
    // 出错时返回一个随机指纹，但标记为错误状态
    return {
      deviceId: 'error-' + Math.random().toString(36).substring(2, 10),
      fingerprint: 'error',
      error: String(error)
    };
  }
}

// 公钥
const PUBLIC_KEY = `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjXTUEdXMw1S112P9HYHk8AkleBNXRi12hc9dfz6PdY9dz8cm9ky0gqMKNa17bCK6OnM4XfR7L4v0X5dDcpAyCucJFTddqTqm7tbr6Cm9/d/UcBNAAMmhd6KEnkTuwSvd+JMXm4mMAiG5YIgIZgK6yR6WDb8DdtMEftIo7FR2GV4LKs5recXs7OAIDJ3AFARVrnARO4Mm2fqwz8S2RPIY5XY3q0bKlvXNKs7l+vb96MyJx3cGlz8nfmjw9zCDuXJgq3SriT5rHEW6+ynGHEaa2yJ9cLAyd55xiKVOf329yqTc6YxmUSODUExCaEE6/64xumWgseu+TJZdmtPu/AygDwIDAQAB`


//RSA加密
const encrypt = (data: any) => {
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(PUBLIC_KEY)
  return encryptor.encrypt(data)
}

export default generateWebGLFingerprint
