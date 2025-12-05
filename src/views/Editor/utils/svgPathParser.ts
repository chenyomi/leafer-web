/**
 * SVG 路径解析工具集
 * 提供了一系列用于处理 SVG 路径数据的工具函数
 */

import { Path } from 'leafer-ui'
import { SVGPathData } from 'svg-pathdata'

/**
 * 将 SVG 字符串转换为 Path 元素
 * @param svgString - SVG 字符串内容
 * @returns {Path} Leafer Path 实例
 * @throws {Error} 当 SVG 解析失败或没有有效的路径数据时抛出错误
 */
export function svgToPath(svgString: string): Path {
    // 创建一个临时的 SVG 元素来解析字符串
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    
    // 检查解析错误
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        throw new Error(`SVG 解析错误: ${parserError.textContent}`);
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
        throw new Error(`无效的 SVG 字符串: ${svgString.slice(0, 100)}...`);
    }

    // 获取 viewBox 属性，用于确定 SVG 的尺寸和位置
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 0, 0];
    
    // 获取所有的 path 元素
    const pathElements = svgElement.querySelectorAll('path');
    if (pathElements.length === 0) {
        // 如果没有 path 元素，尝试获取其他可以转换为 path 的元素
        const shapes = svgElement.querySelectorAll('rect,circle,ellipse,polygon,polyline,line');
        if (shapes.length === 0) {
            throw new Error('SVG 中没有找到可以转换为 path 的元素');
        }
        // TODO: 将其他形状转换为 path
    }

    // 收集并规范化所有路径数据
    const pathData: string[] = [];
    pathElements.forEach(path => {
        const d = path.getAttribute('d');
        if (d) {
            try {
                // 使用 SVGPathData 规范化路径数据
                const normalizedPath = new SVGPathData(d).encode();
                pathData.push(normalizedPath);
            } catch (error: any) {
                console.warn(`路径数据解析错误: ${error?.message || '未知错误'}, 路径数据: ${d}`);
            }
        }
    });

    if (pathData.length === 0) {
        throw new Error('没有有效的路径数据可以转换');
    }

    // 创建 Leafer Path 实例
    return new Path({
        data: {
            commands: pathData.join(' ')
        },
        width: viewBox[2] || parseInt(svgElement.getAttribute('width') || '0'),
        height: viewBox[3] || parseInt(svgElement.getAttribute('height') || '0'),
        fill: '#000000', // 默认填充色，可以根据需要修改
    });
}

/**
 * 将 SVG path 的 d 属性字符串转换为 Path 元素
 * @param pathData - SVG path 的 d 属性字符串
 * @returns {Path} Leafer Path 实例
 */
export function pathDataToPath(pathData: string): Path {
    // 使用 SVGPathData 规范化路径数据
    const normalizedPath = new SVGPathData(pathData).encode();
    
    return new Path({
        data: {
            commands: normalizedPath
        },
        fill: '#000000', // 默认填充色，可以根据需要修改
    });
}

/**
 * 将多个 SVG path 数据合并为一个 Path 元素
 * @param pathDataArray - SVG path 数据数组
 * @returns {Path} 合并后的 Leafer Path 实例
 */
export function combinePathData(pathDataArray: string[]): Path {
    // 使用 SVGPathData 处理每个路径
    const normalizedPaths = pathDataArray.map(path => 
        new SVGPathData(path).encode()
    );

    return new Path({
        data: {
            commands: normalizedPaths.join(' ')
        },
        fill: '#000000', // 默认填充色，可以根据需要修改
    });
}

/**
 * 从 URL 加载 SVG 并转换为 Path 元素
 * @param url - SVG 文件的 URL
 * @returns {Promise<Path>} 包含 Path 实例的 Promise
 */
export async function loadSvgFromUrl(url: string): Promise<Path> {
    const response = await fetch(url);
    const svgString = await response.text();
    return svgToPath(svgString);
}

/**
 * 优化和转换 SVG path 数据
 * @param pathData - SVG path 数据
 * @returns {string} 优化后的 path 数据
 */
export function optimizePathData(pathData: string): string {
    return new SVGPathData(pathData)
        .toAbs()    // 转换为绝对坐标
        .round(2)   // 四舍五入到 2 位小数
        .encode();  // 转换回字符串
}

/**
 * 转换 SVG path 为绝对坐标
 * @param pathData - SVG path 数据
 * @returns {string} 转换后的 path 数据
 */
export function convertToAbsolute(pathData: string): string {
    return new SVGPathData(pathData)
        .toAbs()   // 转换为绝对坐标
        .encode();  // 转换回字符串
}

/**
 * 缩放 SVG path
 * @param pathData - SVG path 数据
 * @param scale - 缩放比例
 * @returns {string} 缩放后的 path 数据
 */
export function scalePath(pathData: string, scale: number): string {
    return new SVGPathData(pathData)
        .scale(scale) // 缩放路径
        .encode();    // 转换回字符串
}

/**
 * 旋转 SVG path
 * @param pathData - SVG path 数据
 * @param angle - 旋转角度（度）
 * @param cx - 旋转中心 x 坐标（可选）
 * @param cy - 旋转中心 y 坐标（可选）
 * @returns {string} 旋转后的 path 数据
 */
export function rotatePath(pathData: string, angle: number, cx?: number, cy?: number): string {
    const path = new SVGPathData(pathData);
    if (typeof cx === 'number' && typeof cy === 'number') {
        return path.rotate(angle, cx, cy).encode();
    }
    return path.rotate(angle).encode();
}

/**
 * 平移 SVG path
 * @param pathData - SVG path 数据
 * @param dx - x 方向偏移量
 * @param dy - y 方向偏移量
 * @returns {string} 平移后的 path 数据
 */
export function translatePath(pathData: string, dx: number, dy: number): string {
    return new SVGPathData(pathData)
        .translate(dx, dy) // 平移路径
        .encode();         // 转换回字符串
} 