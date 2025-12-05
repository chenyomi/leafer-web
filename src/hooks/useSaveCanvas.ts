import { useCommonStore } from '@/store/modules/common'
import { useUserStore } from '@/store/modules/user'
import { useEditor } from '@/views/Editor/app'
import { canvasApi } from '@/api/save/canvas'
import { Message } from '@arco-design/web-vue'
import { svgUrlToBase64 } from '@/utils/analysisSvg'
import { isUrl, isLocalPath } from '@/utils/stringUtils'

const isSaving = ref(false) //保存状态标志位
export const useSaveCanvas = async (teamId: any, projectId: any, dashBoardId: any, pageId: any) => {
  isSaving.value = true
  const commonStore = useCommonStore()
  // 加载动画状态
  const { loading } = storeToRefs(commonStore)
  loading.value = true
  try {
    const userStore = useUserStore()
    const { editor, canvas } = useEditor()
    // 获取画布上传地址与画布 id
    const saveInfo = (await canvasApi.getCanvasUploadUrl(teamId, projectId, dashBoardId, editor.contentFrame.data.pageId)) as {
      pageId: string
      presignList: { url: string; fileExtension: string }[]
    }

    editor.setPageId(saveInfo.pageId)

    const jsonUplod = saveInfo.presignList.find((item) => item.fileExtension === '.json')
    const coverUplod = saveInfo.presignList.find((item) => item.fileExtension === '.png')

    // 获取画布JSON数据
    const dataUrl = editor.contentFrame.toJSON()
    console.log(dataUrl, 'dataUrl')
    // 递归处理 JSON 数据中的 ClipImg 元素，将 URL 转换为 Base64
    const convertClipImgUrlToBase64 = async (obj: any) => {
      if (obj.tag === 'ClipImg' || obj.tag === 'CustomCilpImg') {
        if (obj.fill && obj.fill[0].url && (isUrl(obj.fill[0].url) || isLocalPath(obj.fill[0].url))) {
          obj.fill[0].url = await svgUrlToBase64(obj.fill[0].url)
        }
      }
      if (obj.children) {
        obj.children.forEach(convertClipImgUrlToBase64)
      }
    }
    await convertClipImgUrlToBase64(dataUrl)

    /**
     * 递归处理JSON数据中的fill属性，将字符串格式转换为数组格式
     * @param obj - 要处理的对象
     */
    const normalizeFillProperty = (obj: any) => {
      // 处理当前对象的fill属性
      if (obj.fill && typeof obj.fill === 'string') {
        obj.fill = [
          {
            type: 'solid',
            color: obj.fill
          }
        ]
      }

      // 递归处理子元素
      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach(normalizeFillProperty)
      }
    }

    // 统一处理fill属性格式，将字符串格式转换为数组格式
    await normalizeFillProperty(dataUrl)
    const jsonData = JSON.stringify(dataUrl, null, '\t')

    const materialType = localStorage.getItem('materialType') //当前素材类型
    let result = null
    const group = editor.contentFrame.children //获取所有子元素
    console.log(group, '3232323232')
    canvas.app.editor.select(group)
    canvas.app.editor.group()
    console.log(group)

    result = await group[0].export('png', {
      blob: true,
      trim: false,
      pixelRatio: 4,
      fill: 'transparent'
    })

    // 同时触发两个上传接口
    await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])
    // 上传回调
    await canvasApi.uploadCallback(teamId, projectId, dashBoardId, pageId, editor.contentFrame.name).then((res: any) => {
      Message.success('保存成功')
    })
  } catch (e) {
    Message.error('保存失败')
  } finally {
    // 无论成功失败都要重置保存状态
    isSaving.value = false
    loading.value = false
  }
}
