// import alovaInstance from '@/utils/request';
// import {PageParams} from "@/types/page";

// /**
//  * 获取字体
//  * @param params
//  */
// export function getFonts(params:PageParams) {
//   return alovaInstance.Get('/api/font/list',{params});
// }


import alovaInstance from '@/utils/request';
import { PageParams } from "@/types/page";
// import fontData from '@/assets/data/fonts.json';
import fontData from '@/assets/data/newFonts.json';
import { successResponseWrap } from '@/utils/setup-mock';

/**
 * 获取字体
 * @param params 分页参数
 * @returns Promise 返回字体列表和总数
 */
export function getFonts(params: PageParams) {
  // 在开发环境下使用 mock 数据
  if (import.meta.env.DEV || import.meta.env.PROD) {
    const pageNum = params.pageNum || 1;
    const pageSize = params.pageSize || 10;
    const newDataList = fontData.list.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    return Promise.resolve(successResponseWrap({ records: newDataList, total: fontData.list.length }));
  }
  
  // 生产环境使用真实接口
  // return alovaInstance.Get('/api/font/list', { params });
}