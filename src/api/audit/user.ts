import alovaInstance from '@/utils/request'

export const userApi = {
  /**
   * 获取用户列表
   */
  getUserList: (params: any) => {
    return alovaInstance.Get<any>('/oa/user/search', { params })
  },
  /**
   * 新增用户
   */
  addUser: (data: any) => {
    return alovaInstance.Post<any>('/system/user', data)
  },
  /**
   * 修改用户
   */
  updateUser: (data: any) => {
    return alovaInstance.Put<any>('/system/user', data)
  },
  /**
   * 删除用户
   */
  deleteUser: (userIds: string[]) => {
    return alovaInstance.Delete<any>(`/system/user/${userIds.join(',')}`)
  },
  /**
   * 重置密码
   */
  resetPassword: (data: any) => {
    return alovaInstance.Put<any>(`/system/user/resetPwd`,data)
  },
  /**
   * 修改状态
   */
  updateStatus: (data: any) => {
    return alovaInstance.Put<any>('/system/user/changeStatus', data)
  },
  /**
   * 获取用户详情
   */
  getUserDetail: (userId: string) => {
    return alovaInstance.Get<any>(`/system/user/${userId}`)
  },
  /**
   * 添加编辑负责类别
   */
  updateUserCategory: (data: any) => {
    return alovaInstance.Post<any>('/oa/user/category', data)
  },
  /**
   * 草稿箱获取page列表
   */
  getDraftPageList: (params: any) => {
    return alovaInstance.Get<any>(`/core/board/${params.teamId}/${params.projectId}`, { params })
  },
  /**
   * 查询画板page列表
   */
  getPageList: (params: any) => {
    return alovaInstance.Get<any>(`/core/page/list`, { params })
  },
  /**
   * 草稿箱新增画板
   */
  addBoard: (data: any) => {
    return alovaInstance.Post<any>(`/core/board/${data.teamId}/${data.projectId}`,data)
  },
  /**
   * 草稿箱删除画板
   */
  deleteBoard: (ids: string) => {
    return alovaInstance.Delete<any>(`/core/board/${ids}`)
  },
}