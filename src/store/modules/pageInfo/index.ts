import { defineStore } from 'pinia'
import { canvasApi } from '@/api/save/canvas'
import { useUserStore } from '@/store/modules/user'
import { useCommonStore } from '@/store/modules/common'
import { useEditor } from '@/views/Editor/app'
import emitter from '@/utils/eventBus'
import { nextTick } from 'vue'

/**
 * 画布页面信息接口
 */
export interface PageInfo {
  /** 页面ID */
  id: string
  /** 页面名称 */
  name: string
  /** 创建时间 */
  createTime?: string
  /** 更新时间 */
  updateTime?: string
  /** 封面URL */
  coverUrl?: string
  /** 团队ID */
  teamId?: string
  /** 项目ID */
  projectId?: string
  /** 画板ID */
  dashBoardId?: string
  /** 其他属性 */
  [key: string]: any
}

/**
 * 页面信息状态接口
 */
export interface PageInfoState {
  /** 页面信息列表 */
  pageInfoList: PageInfo[]
  /** 当前选中的页面 */
  currentPage: PageInfo
  /** 加载状态 */
  loading: boolean
  /** 总页数 */
  total: number
  /** 每页数量 */
  pageSize: number
  /** 当前页码 */
  pageNum: number
}

/**
 * 页面信息 Store
 * @description 管理画布页面信息的状态
 */
export const usePageInfoStore = defineStore('pageInfo', {
  /**
   * 状态定义
   */
  state: (): PageInfoState => ({
    pageInfoList: [],
    currentPage: null,
    loading: false,
    total: 0,
    pageSize: 20,
    pageNum: 1
  }),

  /**
   * Actions
   */
  actions: {
    /**
     * 获取画布列表
     */
    async fetchPageList() {
      try {
        this.loading = true

        // 获取画布列表
        const response = (await canvasApi.getCanvasList(this.pageSize, this.pageNum)) as {
          rows: PageInfo[]
          total: number
        }
        // 更新状态
        this.pageInfoList = response.rows || []
        this.total = response.total || 0

        this.pageNum++
        // return this.pageInfoList;
      } catch (error) {
        console.error('获取画布列表失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 选择页面函数
     * 当选择的页面与当前页面不同时，更新当前页面并获取页面数据
     * @param item {PageInfo} - 要选择的页面信息
     */
    async selectPage(item: PageInfo) {
      console.log(item)
      // 如果当前页面已存在且与要选择的页面相同，则不执行后续操作
      if (this.currentPage && item.outId === this.currentPage.outId) return

      const commonStore = useCommonStore()
      const { loading } = storeToRefs(commonStore)
      loading.value = true
      // 更新当前页面为选择的页面
      this.currentPage = item

      // 获取用户信息
      const userStore = useUserStore()

      try {
        // 调用API获取页面数据
        const res = (await canvasApi.getCanvasPage(item.teamOutId, item.projectOutId, item.boardOutId, item.outId)) as {
          url: string
          fileExtension: string
        }[]

        const pageJsonUrl = res.find((item) => item.fileExtension === '.json').url

        try {
          // 获取 JSON 数据
          const jsonResponse = await fetch(pageJsonUrl)
          const jsonData = await jsonResponse.json()
          console.log('获取到的JSON数据:', jsonData)
          const { editor } = useEditor()

          // 渲染新画布数据
          editor.importJsonToCurrentPage(jsonData, true)
          // 等待画布完成渲染后触发事件
          await nextTick()
          loading.value = false
          // 页面渲染完成事件
          emitter.emit('page-loaded', item.outId)
        } catch (error) {
          loading.value = false
          console.error('获取JSON数据失败:', error)
          throw new Error('获取JSON数据失败')
        }
      } catch (e) {
        loading.value = false
        // 如果获取页面数据时发生错误，则创建一个新的错误对象
        throw new Error('读取失败')
      }
    }
  }
})
