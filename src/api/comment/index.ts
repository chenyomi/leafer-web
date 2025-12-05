import alovaInstance from '@/utils/request'

// 默认使用 memory 模式缓存
const cacheForConfig = { cacheFor: { expire: 50000, tag: 'v1' } }

const commentApi = {
  //创建评论
  createComment: (teamId: string, projectId: string, dashBoardId: string, pageId: string, data: any) => {
    return alovaInstance.Post(`/core/comment/${teamId}/${projectId}/${dashBoardId}/${pageId}`, data)
  },
  //获取评论列表
  getCommentList: (
    teamId: string,
    projectId: string,
    dashBoardId: string,
    pageId: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) => {
    return alovaInstance.Get(
      `/core/comment/viewport/${teamId}/${projectId}/${dashBoardId}/${pageId}?minX=${minX}&minY=${minY}&maxX=${maxX}&maxY=${maxY}`
    )
  },
  //分页获取所有评论列表
  getAllCommentList: (teamId: string, projectId: string, dashBoardId: string, params: any) => {
    return alovaInstance.Get(`/core/comment/page/${teamId}/${projectId}/${dashBoardId}`, { params })
  },
  //获取当前页面所有评论
  getCurrentPageCommentList: (teamId: string, projectId: string, dashBoardId: string, pageId: string, root?: string,resolved?:any,materialId?:string) => {
    return alovaInstance.Get(`/core/comment/all/${teamId}/${projectId}/${dashBoardId}/${pageId}`, { params: { root,resolved,materialId } })
  },
  //获取评论详情
  getCommentDetail: (commentId: string) => {
    return alovaInstance.Get(`/core/comment/${commentId}`)
  },
  //上传文件签名
  getUploadFileSignature: (teamId: string, projectId: string, dashBoardId: string, pageId: string, fileExtension: string) => {
    return alovaInstance.Get(`/core/comment/presign/${teamId}/${projectId}/${dashBoardId}/${pageId}`, { params: { fileExtension } })
  },
  //修改评论
  updateComment: (teamId: string, projectId: string, dashBoardId: string, pageId: string, data: any) => {
    return alovaInstance.Put(`/core/comment/${teamId}/${projectId}/${dashBoardId}/${pageId}`, data)
  },
  //删除评论
  deleteComment: (commentIds: string) => {
    return alovaInstance.Delete(`/core/comment/${commentIds}`)
  },
  //新增回复
  addReply: (data: any) => {
    return alovaInstance.Post(`/core/comment`, data)
  },
  //查询@用户列表
  getAtUserList: (dashBoardId: string, name: string) => {
    return alovaInstance.Get(`/core/comment/search/${dashBoardId}`, { params: { name } })
  },
  // 上传图片
  uploadToComment: (url: string, data: any, type: string, isJson = false) => {
    if(type === 'svg'){
      type = 'svg+xml'
    }
    if(type === 'jpg'){
      type = 'jpeg'
    }
    return alovaInstance.Put(url, data, {
      meta: { noReturn: true, skipAuth: true,isSign:false },
      headers: { 'Content-Type': isJson ? 'application/json' : 'image/' + type }
    })
  },
  //修改resolved状态
  updateResolved: (commentId: string, resolved: number) => {
    return alovaInstance.Post(`/core/comment/resolved?commentId=${commentId}&resolved=${resolved}`)
  },
}

export default commentApi
