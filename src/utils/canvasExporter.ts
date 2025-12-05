/**
 * 脱离Leafer框架，使用原生Canvas API获取类似Leafer export的结果结构
 * @param canvas 要导出的Canvas元素
 * @param options 导出选项
 * @returns 包含data(Blob)的结果对象，类似Leafer的export结果
 */
export const exportCanvas = (canvas: HTMLCanvasElement, options?: {
  pixelRatio?: number;
  fill?: string;
}): Promise<{ data: Blob }> => {
  return new Promise((resolve, reject) => {
    try {
      const {
        pixelRatio = 1,
        fill = 'transparent'
      } = options || {};

      // 如果需要处理像素比或填充背景色，可以创建一个新的Canvas
      const exportCanvas = document.createElement('canvas');
      const exportContext = exportCanvas.getContext('2d');
      
      if (!exportContext) {
        throw new Error('Failed to get canvas context');
      }

      // 设置导出Canvas的尺寸（考虑像素比）
      exportCanvas.width = canvas.width * pixelRatio;
      exportCanvas.height = canvas.height * pixelRatio;
      
      // 设置缩放
      exportContext.scale(pixelRatio, pixelRatio);
      
      // 填充背景色
      if (fill !== 'transparent') {
        exportContext.fillStyle = fill;
        exportContext.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // 绘制原始Canvas内容
      exportContext.drawImage(canvas, 0, 0);
      
      // 将Canvas内容转换为Blob
      exportCanvas.toBlob((blob) => {
        if (blob) {
          // 返回与Leafer export类似的结构
          resolve({ data: blob });
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 带水印的Canvas导出
 * @param canvas 要导出的Canvas元素
 * @param watermarkImage 水印图片元素
 * @param options 导出选项
 * @returns 包含data(Blob)的结果对象，类似Leafer的export结果
 */
export const exportCanvasWithWatermark = (canvas: HTMLCanvasElement, watermarkImage: HTMLImageElement, options?: {
  pixelRatio?: number;
  fill?: string;
  watermarkWidth?: number;
  watermarkHeight?: number;
}): Promise<{ data: Blob }> => {
  return new Promise((resolve, reject) => {
    try {
      const {
        pixelRatio = 1,
        fill = 'transparent',
        watermarkWidth = 200,
        watermarkHeight = 80
      } = options || {};

      // 创建导出Canvas
      const exportCanvas = document.createElement('canvas');
      const exportContext = exportCanvas.getContext('2d');
      
      if (!exportContext) {
        throw new Error('Failed to get canvas context');
      }

      // 设置导出Canvas的尺寸（考虑像素比）
      exportCanvas.width = canvas.width * pixelRatio;
      exportCanvas.height = canvas.height * pixelRatio;
      
      // 设置缩放
      exportContext.scale(pixelRatio, pixelRatio);
      
      // 填充背景色
      if (fill !== 'transparent') {
        exportContext.fillStyle = fill;
        exportContext.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // 绘制原始Canvas内容
      exportContext.drawImage(canvas, 0, 0);
      
      // 绘制水印（居中）
      exportContext.globalAlpha = 0.8;
      const x = (canvas.width - watermarkWidth) / 2;
      const y = (canvas.height - watermarkHeight) / 2;
      exportContext.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
      exportContext.globalAlpha = 1;
      
      // 将Canvas内容转换为Blob
      exportCanvas.toBlob((blob) => {
        if (blob) {
          resolve({ data: blob });
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 从图片URL创建Canvas元素
 * @param imageUrl 图片URL
 * @returns Canvas元素
 */
export const createCanvasFromImage = (imageUrl: string): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 处理跨域图片
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      context.drawImage(img, 0, 0);
      resolve(canvas);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
  });
};