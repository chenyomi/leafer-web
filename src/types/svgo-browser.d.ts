// ts声明导入模块
declare module 'svgo/dist/svgo.browser' {
  import { OptimizeOptions, OptimizedSvg } from 'svgo';
  
  export function optimize(
    svgString: string,
    options?: OptimizeOptions
  ): OptimizedSvg;
  
  export const plugins: Record<string, any>;
}