import alovaInstance from '@/utils/request'
import { DebounceUtil } from '@/utils/debounceUtil'

export const auditMaterialApi = {
  /**
   * 画师“我的分类以及数量查询“
   */
  getMaterialCategoryList: (params?: any) => {
    return alovaInstance.Get<any>('/oa/material/count', { params })
  },
  /**
   * 获取素材列表
   */
  getMaterialList: (params: any) => {
    return alovaInstance.Get<any>('/oa/material/list', { params })
  },
  /**
   * 素材上传签名
   */
  getMaterialUploadSignature: (dashBoardId: any, pageId: any, materialId?: any,showIndex?:any) => {
    return alovaInstance.Get<any>(`/oa/material/${dashBoardId}/${pageId}`, { params: { materialId,showIndex } })
  },
  /**
   * 获取素材tag列表
   */
  getMaterialTagList: (params: any) => {
    return alovaInstance.Get<any>('/oa/MaterialTag', { params })
  },
  /**
   * 新增素材tag
   */
  // addMaterialTag: async (data: any) => {
  //   let result: any;
  //   await DebounceUtil.submitDebounce('addMaterialTag', async () => {
  //     result = await alovaInstance.Post<any>('/oa/MaterialTag', data);
  //   });
  //   return result;
  // },
  addMaterialTag:(data: any) => {
    return alovaInstance.Post<any>('/oa/MaterialTag', data)
  },
  /**
   * 获取素材详细Tag信息
   */
  getMaterialTagDetail: (id: any) => {
    return alovaInstance.Get<any>(`/oa/MaterialTag/${id}`)
  },
  /**
   * 获取用户素材
   */
  getUserMaterialList: (params: any) => {
    return alovaInstance.Get<any>('/oa/material/listByUser', { params })
  },
  /**
   * 获取素材详情
   */
  getMaterialDetail: (id: any) => {
    return alovaInstance.Get<any>(`/oa/material/${id}`)
  },
  /**
   * 删除素材
   */
  deleteMaterial: (ids: any) => {
    return alovaInstance.Delete<any>(`/oa/material/${ids.join(',')}`)
  },
  /**
   *素材详情list
   */
  getMaterialDetailList: (params: any) => {
    return alovaInstance.Get<any>('/oa/material/materialList', { params })
  },
  /**
   * 查询素材历史列表
   */
  getMaterialHistoryList: (params: any) => {
    return alovaInstance.Get<any>('/oa/materialHistory/list', { params })
  },
  /**
   * 查询版本变更详情列表
   */
  getMaterialVersionChangeList: (params: any) => {
    return alovaInstance.Get<any>('/oa/materialHistory/record', { params })
  },
  /**
   * 获取旧的封面图
   */
  getOldCover: (params: any) => {
    return alovaInstance.Get<any>('/oa/materialHistory/old/cover', { params })
  },
  /**
   * 编辑素材
   */
  editMaterial: (data: any) => {
    return alovaInstance.Put<any>('/oa/material', data)
  },
  /**
   * 新增素材
   */
  addMaterial: (data: any) => {
    return alovaInstance.Post<any>('/oa/material', data)
  },
  /**
   * 分页查询画板列表
   */
  getCanvasList: (params: any) => {
    return alovaInstance.Get<any>(`/core/page/page/${params.teamId}/${params.projectId}/${params.dashBoardId}`, { params })
  },
  /**
   * 新增画板
   */
  addCanvas: (params: any) => {
    return alovaInstance.Get<any>(`/core/page/${params.teamId}/${params.projectId}/${params.dashBoardId}`, params)
  },
  /**
   * 修改画布名称
   */
  updateCanvasName: (params: any) => {
    return alovaInstance.Put<any>(`/core/page/${params.teamId}/${params.projectId}/${params.dashBoardId}/${params.pageId}?orderNum=${params.orderNum}&name=${params.name}`, params)
  },
  /**
   * 素材添加编辑
   */
  addEditMaterial: (params: any) => {
    return alovaInstance.Post<any>(`/oa/material/add/editor?materialId=${params.materialId}&userId=${params.userId}`, params)
  },
  /**
   * 获取编辑分配的素材列表
   */
  editAssignMaterialList: (params: any) => {
    return alovaInstance.Get<any>(`/oa/material/editorList`, { params })
  },
  /**
   * 获取编辑分配素材的数量
   */
  getEditAssignMaterialCount: () => {
    return alovaInstance.Get<any>(`/oa/material/editorCount`)
  },
  /**
   * 上传素材style签名
   */
  getMaterialUploadStyleSignature: (materialId?: any) => {
    return alovaInstance.Get<any>(`/oa/material/uploadStyleSign?materialId=${materialId}`)
  },
  /**
   * 新增素材style
   */
  addMaterialStyle: (data: any) => {
    return alovaInstance.Post<any>('/oa/style', data)
  },
  /**
   * 获取素材style列表
   */
  getMaterialStyleList: (materialOutId?: any,pageNum?:number,pageSize?:number) => {
    return alovaInstance.Get<any>(`/oa/style/list?materialOutId=${materialOutId}&pageNum=${pageNum}&pageSize=${pageSize}`)
  },
  /**
   * 获取素材style详情
   */
  getMaterialStyleDetail: (styleId: any) => {
    return alovaInstance.Get<any>(`/oa/style/${styleId}`)
  },
  /**
   * 删除素材style
   */
  deleteMaterialStyle: (ids: any) => {
    return alovaInstance.Delete<any>(`/oa/style/${ids}`)
  },
  /**
   * 查询对应素材的所有style列表
   */
  getMaterialAllStyleList: (materialId: any) => {
    return alovaInstance.Get<any>(`/oa/style/all/${materialId}`)
  },
  /**
   * 关闭素材编辑
   */
  closeMaterialEdit: (id: any) => {
    return alovaInstance.Get<any>(`/oa/material/close/${id}`)
  },
  /**
   * 素材修改画师
   */
  updateMaterialPainter: (params: any) => {
    return alovaInstance.Post<any>(`/oa/material/${params.materialId}/${params.painterId}`)
  },
}
