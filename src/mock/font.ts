import Mock from 'mockjs'
import setupMock, { successResponseWrap } from '@/utils/setup-mock'
// import fontData from '@/assets/data/fonts.json'
import fontData from '@/assets/data/newFonts.json';
import { MockParams } from '@/types/mock'

setupMock({
  setup() {
    // Mock.mock(new RegExp('/api/font/list'), (params: MockParams) => {
    //   console.log(params)
    //   // 从URL参数中获取分页信息
    //   const urlParams = new URLSearchParams(params.url.split('?')[1])
    //   const pageNum = parseInt(urlParams.get('pageNum') || '1')
    //   const pageSize = parseInt(urlParams.get('pageSize') || '10')

    //   var newDataList = fontData.list.slice((pageNum - 1) * pageSize, pageNum * pageSize)
    //   return successResponseWrap({ records: newDataList, total: fontData.list.length })
    // })
    // Mock.mock(new RegExp('/api/font/list'), (params: MockParams) => {
    //   // 从 URL 中获取参数，因为 alova 的 GET 请求会将参数添加到 URL 中
    //   const urlParams = new URLSearchParams(params.url.split('?')[1] || '')
    //   const pageNum = parseInt(urlParams.get('pageNum') || '1')
    //   const pageSize = parseInt(urlParams.get('pageSize') || '10')

    //   var newDataList = fontData.list.slice((pageNum - 1) * pageSize, pageNum * pageSize)
    //   return successResponseWrap({ records: newDataList, total: fontData.list.length })
    // })
  }
})
