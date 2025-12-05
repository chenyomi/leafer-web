import { useEditor } from '@/views/Editor/app'
import { keybindMap } from '@/views/Editor/utils/constants'
import { Group, Text, Point } from 'leafer-ui'
import type { MenuItem } from '@/components/contextMenu/ContextMenuDefine'
import { createComponent } from './components'
import { isMaterial } from '@/enums/materalType'
import { h } from 'vue'
import emitter from '@/utils/eventBus'
import { useUserStore } from '@/store/modules/user'
import { useCommonStore } from '@/store/modules/common'
import router from '@/router'
import { computed } from 'vue'
import { appInstance } from '@/views/Editor/app'
import { storeToRefs } from 'pinia'
import { auditMaterialApi } from '@/api/audit/material'
import { Message } from '@arco-design/web-vue'
// import { useRoute } from 'vue-router'
// const route = useRoute()

import { useMaterialType } from '@/hooks/useMaterialType'


// 辅助：判断当前是否为画师角色
const isPainterRole = (): boolean => {
  try {
    const userStore = useUserStore()
    const info = userStore.getUserInfo?.()
    return info?.roles?.[0]?.roleKey === 'Painter'
  } catch {
    return false
  }
}

// 判断是否为管理员或编辑（这些角色不显示右侧菜单）
const isAdminOrEditor = (): boolean => {
  try {
    const userStore = useUserStore()
    const info = userStore.getUserInfo?.()
    const roleKey = info?.roles?.[0]?.roleKey
    return roleKey === 'OAAdmin' || roleKey === 'IEditor' || roleKey === 'OEditor'
  } catch {
    return false
  }
}

// 判断是否是画师
const isPainter = (): boolean => {
  try {
    const userStore = useUserStore()
    const info = userStore.getUserInfo?.()
    return info?.roles?.[0]?.roleKey === 'Painter'
  } catch {
    return false
  }
}


export const layerItems = (): MenuItem[] => {
  if (isAdminOrEditor()) return []
  const { canvas, keybinding } = useEditor()
  const { mod } = keybinding
  return [
    {
      label: '向上移动一层',
      onClick: () => {
        keybinding.trigger('mod+]')
      },
      shortcut: `${mod} ]`
    },
    {
      // 使用阿里图标组件
      icon: h('AliIcon', {
        type: 'icon-to-top', // 阿里图标库的图标名称
        size: 20,
        class: 'menu-icon'
      }),
      label: '移到顶层',
      onClick: () => {
        keybinding.trigger('shift+]')
      },
      shortcut: ']'
    },
    {
      label: '向下移动一层',
      onClick: () => {
        keybinding.trigger('mod+[')
      },
      shortcut: `${mod} [`
    },
    {
      label: '移到底层',
      onClick: () => {
        keybinding.trigger('shift+[')
      },
      shortcut: '[',
      divided: true
    },
    {
      label: '创建分组',
      hidden: canvas.activeObjectIsType('Group', 'Box'),
      // disabled: canvas.getActiveObjects().length < 2,
      onClick: () => {
        keybinding.trigger(keybindMap.group)
      },
      shortcut: `${mod} G`
    },
    {
      label: '解除分组',
      hidden: !canvas.activeObjectIsType('Group', 'Box'),
      onClick: () => {
        keybinding.trigger(keybindMap.ungroup)
      },
      shortcut: `${mod} ⇧ G`
    },
    {
      label: '创建组件',
      hidden: canvas.getActiveObjects().length === 1 && isMaterial(canvas.getActiveObjects()[0].data.MaterialType),
      onClick: () => {
        new Promise((resolve) => {
          // 需要先编组
          keybinding.trigger(keybindMap.group)
          // 给键盘事件处理一些时间来完成
          setTimeout(resolve, 100)
        }).then(() => {
          // 组合操作完成后添加成为组件
          createComponent()
        })
      },
      shortcut: ``
    },
    {
      label: '重命名',
      hidden: canvas.getActiveObjects() instanceof Group,
      onClick: () => {
        keybinding.trigger('mod+r')
      },
      shortcut: `${mod} R`,
      divided: true
    },
    {
      label: '显示/隐藏',
      onClick: () => {
        keybinding.trigger('mod+shift+h')
      },
      shortcut: `${mod} ⇧ H`
    },
    {
      label: '锁定/解锁',
      onClick: () => {
        keybinding.trigger('shift+l')
      },
      shortcut: `${mod} ⇧ L`,
      divided: true
    },
    {
      label: `另存为PNG${canvas.getActiveObjects().length !== 1 ? '(需先合并为组)' : ''}`,
      disabled: canvas.getActiveObjects().length !== 1,
      onClick: () => {
        keybinding.trigger('mod+shift+k')
      },
      shortcut: `${mod} ⇧ K`
    }
  ]
}

export const zoomItems = (): MenuItem[] => {
  if (isAdminOrEditor()) return []
  const { keybinding, canvas } = useEditor()
  return [
    {
      label: 'zoom in',
      onClick: () => {
        keybinding.trigger('+')
      },
      shortcut: `Ctrl +`
    },
    {
      label: 'zoom out',
      onClick: () => {
        keybinding.trigger('-')
      },
      shortcut: `Ctrl -`
    },
    {
      label: 'zoom to fit',
      onClick: () => {
        keybinding.trigger('mod+1')
      },
      shortcut: `Ctrl 1`,
      divided: true
    }
  ]
}

let submit

// 通用菜单
/**
 * 通用右键菜单项生成
 * 仅限制“上传面板拖拽”进来的素材隐藏“Add To Style”，
 * 对于其他来源（如已审核素材库）的拖拽，正常显示。
 * @returns {MenuItem[]} 返回可用于渲染的菜单项数组
 */
export const generalItems = (): MenuItem[] => {
  if (isAdminOrEditor()) return []
  const { keybinding, canvas, editor } = useEditor()
  const { mod } = keybinding
  const activeObjectList = canvas.app.editor.list
  const isVisible = activeObjectList.every((item) => item.visible)
  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo()) //获取用户信息
  const role = userInfo.value?.roles?.[0]?.roleKey
  const userId = userInfo.value?.userId //当前登录用户的userId
  // 获取当前路由参数
  function getQuerySnapshot(): Record<string, string> {
    const rQuery = (router.currentRoute?.value?.query ?? {}) as Record<string, any>
    if (Object.keys(rQuery).length > 0) return rQuery as Record<string, string>
    const out: Record<string, string> = {}
    try {
      const searchParams = new URLSearchParams(window.location.search || '')
      searchParams.forEach((v, k) => (out[k] = v))
      if (Object.keys(out).length === 0) {
        const hash = window.location.hash || ''
        const qIndex = hash.indexOf('?')
        if (qIndex >= 0) {
          const hashQuery = hash.substring(qIndex + 1)
          const hashParams = new URLSearchParams(hashQuery)
          hashParams.forEach((v, k) => (out[k] = v))
        }
      }
    } catch {}
    return out
  }
  const query = getQuerySnapshot()
  const type = (query as any)?.type as string | undefined //素材类型
  const count = editor.contentFrame.children.length //当前画布上的元素数量
  const activeObj = canvas.getActiveObject()
  console.log(activeObj.data, 'activeObj')
  const status = (query as any)?.status as string | undefined //审核状态
  const createBy = (activeObj as any)?.data?.createBy || ((query as any)?.createBy as string | undefined) //创建人userId
  const materialIdFromActive = (activeObj as any)?.data?.materialId as string | undefined
  const outIdFromActive = (activeObj as any)?.data?.outId as string | undefined
  const routeMaterialId = (query as any)?.id as string | undefined
  const materialType = (query as any)?.materialType //获取通过草稿箱add进来的素材类型
  const storedOutId = (() => {
    try {
      return ((window.localStorage && (localStorage.getItem('outId') || localStorage.getItem('materialId'))) || undefined) as string | undefined
    } catch {
      return undefined
    }
  })()

  const currentMaterialId = outIdFromActive || materialIdFromActive || routeMaterialId || storedOutId
  console.log(currentMaterialId, 'currentMaterialId', materialIdFromActive, outIdFromActive, storedOutId, routeMaterialId)
  const isSvgClipImg = (() => {
    if (activeObj?.tag !== 'ClipImg' && activeObj?.tag !== 'CustomCilpImg') return false
    const url = (activeObj as any)?.fill?.[0]?.url as string
    return !!url && (url.toLowerCase().includes('.svg') || url.toLowerCase().includes('data:image/svg+xml'))
  })()

  /**
   * 是否来自上传面板的拖拽素材（仅用于隐藏菜单项）
   * @type {boolean}
   */
  /**
   * 右键菜单隐藏判定：仅在“上传面板拖拽且无素材ID”时隐藏 Add To Style。
   * - 若能解析到素材ID（data.materialId/outId 或 currentMaterialId），则允许显示
   * @returns {boolean} 是否需要隐藏 Add To Style
   */
  const hasRepoId = Boolean((activeObj as any)?.data?.materialId || (activeObj as any)?.data?.outId || currentMaterialId)
  const shouldHideAddStyle: boolean = Boolean((activeObj as any)?.data?.isDraggedMaterial)
  console.log(shouldHideAddStyle, 'shouldHideAddStyle')
  const baseEligible: boolean = role === 'Painter' && (status == '1' || activeObj.data.status == 1) && isSvgClipImg && !!currentMaterialId
  const addStyleMenuItem: MenuItem | null =
    baseEligible && !shouldHideAddStyle
      ? {
          icon: h('svg', { class: 'arco-icon context-menu-icon' }, [h('use', { 'xlink:href': '#icon-ic_round-add' })]),
          label: 'Add To Style',
          /**
           * 处理添加样式点击事件
           * - 上传面板拖拽（当前会话且未入库）：拒绝
           * - 非拖拽或路由选择：使用 activeObj/路由创建人判断
           * - 素材库拖拽：查询素材详情校验创建人
           */
          onClick: async (): Promise<void> => {
            const hasRepoIdClick = Boolean((activeObj as any)?.data?.materialId || (activeObj as any)?.data?.outId)
            const isUploadDragClick: boolean = Boolean((activeObj as any)?.data?.isDraggedMaterial) && !hasRepoIdClick
            if (isUploadDragClick) {
              Message.warning('上传素材不支持添加样式')
              return
            }

            // 判断是否为素材库拖拽（route 与当前 ID 不一致或无 route id）
            const isDraggedFromLibrary: boolean = !routeMaterialId || routeMaterialId !== currentMaterialId

            if (!isDraggedFromLibrary) {
              // 非拖拽或路由选择（例如从详情页进入）：直接依据创建人判断
              if (createBy && createBy !== userId) {
                Message.error('仅允许为自己创建的素材添加Style')
                return
              }
              emitter.emit('addStyle', true)
              return
            }

            // 素材库拖拽：查询详情校验创建人
            try {
              const detail = await auditMaterialApi.getMaterialDetail(currentMaterialId)
              if (detail?.createBy === userId || detail?.createBy === null) {
                emitter.emit('addStyle', true)
              } else {
                Message.error('仅允许为自己创建的素材添加Style')
              }
            } catch (error) {}
          }
        }
      : null
  // const materialType = router.currentRoute.value?.query?.materialType //获取通过草稿箱add进来的素材类型
  console.log(materialType, 'materialType')
  // 调用素材类型hooks
  const { isShow } = useMaterialType()
  if (isAdminOrEditor() || !isShow.value) return []
  return [
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-proicons_cut' })]
      ),
      label: 'Cut',
      onClick: () => {
        keybinding.trigger('mod+x')
      },
      shortcut: `${mod} + X`
    },
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-mynaui_copy' })]
      ),
      label: 'Copy',
      onClick: () => {
        keybinding.trigger('mod+c')
      },
      shortcut: `${mod} + C`
    },
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-hugeicons_file-paste' })]
      ),
      label: 'Paste',
      onClick: () => {
        // 获取当前选中的对象
        const activeObject = canvas.getActiveObject()
        // 获取选中对象的坐标
        const { x, y } = activeObject

        // 设置上下文菜单的指针位置为选中对象的坐标
        if (appInstance.editor.contextMenu) {
          //  粘贴元素位置与选中元素一致
          appInstance.editor.contextMenu.pointer = new Point(x, y)
        }

        // 触发粘贴到当前位置的快捷键
        keybinding.trigger('mod+shift+v')
      },
      shortcut: `${mod} + C`
    },
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-lucide_box-select' })]
      ),
      label: 'Select All',
      onClick: () => {
        // 触发全选快捷键
        keybinding.trigger('mod+a')
      },
      shortcut: `${mod} + A`,
      divided: true
    },
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-hugeicons_flip-top' })]
      ),
      label: 'Flip Vertical',
      onClick: () => {
        // 触发垂直翻转快捷键
        keybinding.trigger('shift+v')
      },
      shortcut: `${mod} + V`
    },
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-hugeicons_flip-right' })]
      ),
      label: 'Flip Horizontal',
      onClick: () => {
        // 触发水平翻转快捷键
        keybinding.trigger('shift+h')
      },
      shortcut: `${mod} + H`
    },
    // ...(submitMenuItem ? [submitMenuItem] : []) //画师右键提交按钮
    ...(addStyleMenuItem ? [addStyleMenuItem] : []) //画师右键添加样式按钮
  ]
}

// group菜单
export const groupItems = (): MenuItem[] => {
  if (isAdminOrEditor()) return []
  const { keybinding, canvas } = useEditor()
  const { mod } = keybinding
  if (isPainter()) {
    return [
      {
        icon: h(
          'svg',
          {
            class: 'arco-icon context-menu-icon'
          },
          [h('use', { 'xlink:href': '#icon-proicons_component' })]
        ),
        label: 'Creat Component',
        onClick: () => {
          createComponent()
        },
        divided: true
      }
    ]
  } else {
    return [
      {
        icon: h(
          'svg',
          {
            class: 'arco-icon context-menu-icon'
          },
          [h('use', { 'xlink:href': '#icon-right_menu' })]
        ),
        label: 'Edit Property',
        onClick: () => {
          const commonStore = useCommonStore()
          // 右侧面板是否显示
          const { settingPopup } = storeToRefs(commonStore)
          settingPopup.value = true
        },
        shortcut: `F7`
      },
      {
        icon: h(
          'svg',
          {
            class: 'arco-icon context-menu-icon'
          },
          [h('use', { 'xlink:href': '#icon-proicons_component' })]
        ),
        label: 'Creat Component',
        onClick: () => {
          createComponent()
        },
        divided: true
      }
    ]
  }
}

// 显示右侧配置栏
export const rightMenu = () => {
  // 管理员或编辑不显示右侧菜单，其它角色正常显示
  if (isPainter() || isAdminOrEditor()) return []
  const { keybinding, canvas } = useEditor()
  const { mod } = keybinding

  return [
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-right_menu' })]
      ),
      label: 'Edit Property',
      onClick: () => {
        const commonStore = useCommonStore()
        // 右侧面板是否显示
        const { settingPopup } = storeToRefs(commonStore)
        settingPopup.value = true
      },
      shortcut: `F7`,
      divided: true
    }
  ]
}

// 画板右键菜单
export const emptyMenu = () => {
  const materialType = router.currentRoute.value?.query?.materialType //获取通过草稿箱add进来的素材类型
  if (isAdminOrEditor() || materialType == '1') return []
  const { keybinding, canvas } = useEditor()
  const { mod } = keybinding

  return [
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-hugeicons_file-paste' })]
      ),
      label: 'Paste here',
      onClick: () => {
        keybinding.trigger('mod+shift+vv')
      },
      shortcut: '',
      divided: true
    },
    {
      icon: h(
        'svg',
        {
          class: 'arco-icon context-menu-icon'
        },
        [h('use', { 'xlink:href': '#icon-biyanjing' })]
      ),
      label: 'Show/Hide comments',
      onClick: () => {
        keybinding.trigger('Shift+C')
      },
      shortcut: ''
    }
  ]
}
