/**
 * SVG缓存存储
 * @description 用于缓存已解析的SVG图层信息，避免重复解析
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

// 定义图层信息接口
interface LayerInfo {
  id: string;
  name?: string;
  type: string;
  childCount: number;
  paths: number;
  visible?: boolean;
}

// 使用普通对象而不是Map来存储缓存
interface SvgCacheMap {
  [key: string]: LayerInfo[];
}

// 定义元素ID到URL的映射
interface ElementIdMap {
  [elementId: string]: string; // 元素ID -> SVG URL
}

// 定义tag信息接口
interface TagInfo {
  id: string;
  name: string;
  isLayer: boolean;
  isCategory?: boolean;
}

// 定义SVG tag缓存映射
interface SvgTagCacheMap {
  [svgUrl: string]: TagInfo[]; // SVG URL -> tag信息数组
}

// 定义SVG缓存存储
export const useSvgCacheStore = defineStore('svgCache', () => {
  // 使用普通对象存储SVG缓存
  const svgCacheMap = ref<SvgCacheMap>({});
  
  // 存储元素ID到URL的映射关系
  const elementIdToUrl = ref<ElementIdMap>({});

  // 存储SVG图层tag缓存
  const svgTagCacheMap = ref<SvgTagCacheMap>({});

  /**
   * 获取缓存的SVG图层信息
   * @param svgUrl SVG的URL
   * @param elementId 可选的元素ID
   * @returns 图层信息数组，如果不存在则返回undefined
   */
  function getCachedSvg(svgUrl: string, elementId?: string): LayerInfo[] | undefined {
    // 优先使用URL查找
    if (svgUrl in svgCacheMap.value) {
      return svgCacheMap.value[svgUrl];
    }
    
    // 如果提供了元素ID且URL查找失败，尝试通过元素ID查找
    if (elementId && elementId in elementIdToUrl.value) {
      const cachedUrl = elementIdToUrl.value[elementId];
      return svgCacheMap.value[cachedUrl];
    }
    
    return undefined;
  }

  /**
   * 检查是否存在缓存
   * @param svgUrl SVG的URL
   * @param elementId 可选的元素ID
   * @returns 是否存在缓存
   */
  function hasCachedSvg(svgUrl: string, elementId?: string): boolean {
    // 优先使用URL查找
    if (svgUrl in svgCacheMap.value) {
      return true;
    }
    
    // 如果提供了元素ID且URL查找失败，尝试通过元素ID查找
    if (elementId && elementId in elementIdToUrl.value) {
      const cachedUrl = elementIdToUrl.value[elementId];
      return cachedUrl in svgCacheMap.value;
    }
    
    return false;
  }

  /**
   * 缓存SVG图层信息
   * @param svgUrl SVG的URL
   * @param layerInfos 图层信息数组
   * @param elementId 可选的元素ID
   */
  function cacheSvg(svgUrl: string, layerInfos: LayerInfo[], elementId?: string): void {
    svgCacheMap.value[svgUrl] = layerInfos;
    
    // 如果提供了元素ID，建立ID到URL的映射
    if (elementId) {
      elementIdToUrl.value[elementId] = svgUrl;
    }
  }

  /**
   * 更新SVG缓存的URL
   * @param oldUrl 旧的URL
   * @param newUrl 新的URL
   * @param elementId 元素ID
   */
  function updateSvgUrl(oldUrl: string, newUrl: string, elementId: string): void {
    // 如果旧URL存在缓存
    if (oldUrl in svgCacheMap.value) {
      // 复制缓存到新URL
      svgCacheMap.value[newUrl] = svgCacheMap.value[oldUrl];
      // 删除旧URL的缓存
      delete svgCacheMap.value[oldUrl];
      // 更新ID到URL的映射
      elementIdToUrl.value[elementId] = newUrl;
    }
  }

  /**
   * 清除指定SVG的缓存
   * @param svgUrl SVG的URL
   * @param elementId 可选的元素ID
   */
  function clearCachedSvg(svgUrl: string, elementId?: string): void {
    delete svgCacheMap.value[svgUrl];
    
    // 如果提供了元素ID，清除ID到URL的映射
    if (elementId && elementId in elementIdToUrl.value) {
      delete elementIdToUrl.value[elementId];
    }
  }

  /**
   * 清除所有缓存
   */
  function clearAllCache(): void {
    svgCacheMap.value = {};
    elementIdToUrl.value = {};
    svgTagCacheMap.value = {};
  }

  /**
   * 获取缓存的SVG图层tag信息
   * @param svgUrl SVG的URL
   * @returns tag信息数组，如果不存在则返回undefined
   */
  function getCachedSvgTags(svgUrl: string): TagInfo[] | undefined {
    return svgCacheMap.value[svgUrl] ? svgTagCacheMap.value[svgUrl] : undefined;
  }

  /**
   * 检查是否存在SVG图层tag缓存
   * @param svgUrl SVG的URL
   * @returns 是否存在缓存
   */
  function hasCachedSvgTags(svgUrl: string): boolean {
    return svgUrl in svgTagCacheMap.value;
  }

  /**
   * 缓存SVG图层tag信息
   * @param svgUrl SVG的URL
   * @param tagInfos tag信息数组
   */
  function cacheSvgTags(svgUrl: string, tagInfos: TagInfo[]): void {
    svgTagCacheMap.value[svgUrl] = tagInfos;
  }

  /**
   * 清除指定SVG的tag缓存
   * @param svgUrl SVG的URL
   */
  function clearCachedSvgTags(svgUrl: string): void {
    delete svgTagCacheMap.value[svgUrl];
  }

  return {
    svgCacheMap,
    elementIdToUrl,
    svgTagCacheMap,
    getCachedSvg,
    hasCachedSvg,
    cacheSvg,
    updateSvgUrl,
    clearCachedSvg,
    clearAllCache,
    getCachedSvgTags,
    hasCachedSvgTags,
    cacheSvgTags,
    clearCachedSvgTags
  };
}, {
  // persist: {
  //   // 启用持久化存储
  //   key: 'scipixa-svg-cache',
  //   // 使用 sessionStorage 进行持久化存储，避免长期占用空间
  //   storage: sessionStorage,
  // }
});
