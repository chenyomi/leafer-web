/**
 * 防抖工具类 - 用于防止重复提交表单等场景
 * 提供函数防抖、方法防抖、表单提交防抖等功能
 */
export class DebounceUtil {
  // 存储正在执行的函数ID映射表
  private static executingFunctions = new Map<string, boolean>();
  
  /**
   * 基本防抖函数
   * @param func 需要防抖的函数
   * @param delay 延迟时间(ms)
   * @returns 防抖后的函数
   */
  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }
  
  /**
   * 立即执行防抖函数
   * @param func 需要防抖的函数
   * @param delay 延迟时间(ms)
   * @returns 防抖后的函数
   */
  public static debounceImmediate<T extends (...args: any[]) => any>(
    func: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeoutId === null) {
        func(...args);
      }
      clearTimeout(timeoutId!);
      timeoutId = setTimeout(() => {
        timeoutId = null;
      }, delay);
    };
  }
  
  /**
   * 表单提交防抖 - 确保同一时间只能执行一次提交操作
   * @param key 表单唯一标识
   * @param submitFn 提交函数
   * @param cooldown 冷却时间(ms)
   * @returns 是否成功执行了提交
   */
  public static async submitDebounce(
    key: string,
    submitFn: () => Promise<any> | void,
    cooldown: number = 1000
  ): Promise<boolean> {
    // 检查是否已经在执行中
    if (this.executingFunctions.has(key)) {
      console.warn(`表单提交已被防抖拦截: ${key}`);
      return false;
    }
    
    try {
      // 标记为正在执行
      this.executingFunctions.set(key, true);
      
      // 执行提交函数
      const result = submitFn();
      // 处理异步提交函数
      if (result instanceof Promise) {
        await result;
      }
      
      return true;
    } finally {
      // 冷却时间后解除标记
      setTimeout(() => {
        this.executingFunctions.delete(key);
      }, cooldown);
    }
  }
  
  /**
   * 清除指定key的防抖标记
   * @param key 表单唯一标识
   */
  public static clearSubmitDebounce(key: string): void {
    this.executingFunctions.delete(key);
  }
  
  /**
   * 清除所有防抖标记
   */
  public static clearAll(): void {
    this.executingFunctions.clear();
  }
  
  /**
   * 检查指定key是否正在防抖中
   * @param key 表单唯一标识
   * @returns 是否正在防抖中
   */
  public static isDebouncing(key: string): boolean {
    return this.executingFunctions.has(key);
  }
}

// 导出常用方法作为独立函数
export const { debounce, debounceImmediate, submitDebounce } = DebounceUtil;