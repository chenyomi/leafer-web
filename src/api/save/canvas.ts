import key from '@/components/key'
import alovaInstance from '@/utils/request'
import { orderBy } from 'lodash'
// 默认使用 memory 模式缓存
const cacheForConfig = { cacheFor: { expire: 50000 } }

export const canvasApi = {
  /**
   * 获取画布上传地址
   * @param {string} teamId - 团队ID
   * @param {string} projectId - 项目ID
   * @param {string} dashBoardId - 画板ID
   * @param {string} [pageId] - 页面ID，可选参数
   * @returns {Promise<any>} 返回上传策略信息，包含上传URL
   */
  getCanvasUploadUrl: (teamId: string, projectId: string, dashBoardId: string, pageId?: string) => {
    return alovaInstance.Get(`/core/page/${teamId}/${projectId}/${dashBoardId}`, {
      params: { pageId }
    })
  },
  // 上传画布
  uploadToServer: (url: string, data: any, isJson?: boolean) => {
    return alovaInstance.Put(url, data, {
      meta: { noReturn: true, skipAuth: true,isSign:false },
      headers: { 'Content-Type': isJson ? 'application/json' : 'image/png' }
    })
  },
  // 上传style到data
  uploadToData: (url: string, data: any) => {
    return alovaInstance.Put(url, data, {
      meta: { noReturn: true, skipAuth: true,isSign:false },
      headers: { 'Content-Type': 'application/octet-stream' }
    })
  },
  // 获取画布 id
  getCanvasId: (url: string, data: any, isJson?: boolean) => {
    return alovaInstance.Put(url, data)
  },
  // 上传成功回调
  uploadCallback: (
    teamId: string,
    projectId: string,
    dashBoardId: string,
    pageId: string,
    pageName: string,
    materialType?: string
  ) => {
    return alovaInstance.Get(
      `/core/page/callback/${teamId}/${projectId}/${dashBoardId}/${pageId}`,
      { params: { pageName, materialType } }
    )
  },
  // 获取单画板信息
  getCanvasPage: (teamId: string, projectId: string, dashBoardId: string, pageId?: string) => {
    return alovaInstance.Get(`/core/page/${teamId}/${projectId}/${dashBoardId}/${pageId}`)
  },
  // 获取画板列表
  getCanvasList: (pageSize: number, pageNum: number) => {
    return alovaInstance.Get(`/core/page/list`, {
      params: { pageSize, pageNum, orderByColumn: 'id', isAsc: 'desc' }
    })
  },
  // 更新画布名称
  updateCanvasName: (
    teamId: string,
    projectId: string,
    dashBoardId: string,
    pageId: string,
    name: string,
    orderNum: number
  ) => {
    return alovaInstance.Put(`/core/page/${teamId}/${projectId}/${dashBoardId}/${pageId}`,undefined, {
      params: {
        name,
        orderNum
      }
    })
  },
  // 删除画布
  deleteCanvas: (ids: string[]) => {
    return alovaInstance.Delete(`/core/page/${ids.join(',')}`)
  }
}

// 封面上传

// 画布没 id

// policy-> 返回 id key

// 画布id

// policy -> 返回 id key

// 上传key

// 校验
