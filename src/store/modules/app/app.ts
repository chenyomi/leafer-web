import type { EditTool } from 'app'
import { UI } from 'leafer-ui'

export const useAppStore = defineStore('app', () => {
  const activeTool = ref<EditTool>('select')
  const textType = ref<string>('Text')
  const graphicType = ref<UI>()
  const commentOpen = ref<boolean>(false)

  return {
    /** 当前激活的工具 */
    activeTool,
    textType,
    graphicType,
    commentOpen,
  }
})
