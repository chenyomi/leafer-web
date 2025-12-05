import alovaInstance from '@/utils/request'

/**
 * 类别树节点
 */
export interface CategoryNode {
  id?: string | number
  name?: string
  /** 兼容部分接口字段 */
  categoryName?: string
  /** 分类类型：1-Icons, 2-Templates, 4-Component */
  categoryType?: number
  children?: CategoryNode[]
}

/**
 * 类别分页返回
 */
export interface CategoryListResponse {
  records: CategoryNode[]
  total: number
}

const auditCategoryApi = {
  /**
   * 查询所有类别树形
   */
  getCategoryTree: () => {
    return alovaInstance.Get<CategoryNode[]>('/oa/category/tree')
  },
  /**
   * 查询所有父类
   */
  getParentCategory: () => {
    return alovaInstance.Get<CategoryNode[]>('/oa/category/allParent')
  },
  /**
   * 查询类别列表分页
   */
  getCategoryList: (params: any) => {
    return alovaInstance.Get<CategoryListResponse>('/oa/category/list', { params })
  },
  /**
   * 新增类别
   */
  addCategory: (data: any) => {
    return alovaInstance.Post('/oa/category', data)
  },
  /**
   * 删除类别
   */
  deleteCategory: (ids: string) => {
    return alovaInstance.Delete(`/oa/category/${ids}`)
  },
  /**
   * 根据id查询所有子类
   */
  getCategoryById: (id: string) => {
    return alovaInstance.Get(`/oa/category/${id}`)
  },
  /**
   * 根据用户查询负责全部最小子类  默认1带数字返回,0不带数字返回
   */
  getCategoryByUserId: (isMore:number = 1) => {
    return alovaInstance.Get(`/oa/category/userCategory?isMore=${isMore}`)
  },
  /**
   * 根据名称搜索类别
   */
  getCategoryByName: (params: any) => {
    return alovaInstance.Get(`/oa/category/search`, { params })
  },
  /**
   * 管理员修改分类名称和分类级别
   */
  updateCategory: (data: any) => {
    return alovaInstance.Post(`/oa/category/${data.categoryId}?name=${data.name}&parentId=${data.parentId}`)
  },
}

export default auditCategoryApi
