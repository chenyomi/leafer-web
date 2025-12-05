// import { optimize } from 'svgo';
import { optimize } from 'svgo/dist/svgo.browser'
import { useEditor } from '@/views/Editor/app'
import { Group, Image, Resource } from 'leafer-ui'
import type { IPaint } from '@leafer-ui/interface'
import { EditorEvent } from '@leafer-in/editor'
import { useSvgCacheStore } from '@/store/modules/svgCache'

interface LayerInfo {
  id: string
  name: string
  type: string
  childCount: number
  paths: number
}

/**
 * 分析SVG文件
 * @param url - SVG文件的URL或base64编码
 * @returns 返回解析图层
 */
export async function andysisSvg(url: string): Promise<any[]> {
  if (!url?.toLowerCase().includes('.svg') && !url?.toLowerCase().includes('data:image/svg+xml')) {
    return []
  }
  // 处理SVG
  try {
    const response = await fetch(url)
    const svgText = await response.text()
    const svgResult = optimize(svgText, {
      plugins: [
        'removeDoctype', // 移除DOCTYPE声明
        'removeXMLProcInst', // 移除XML处理指令
        'removeComments', // 移除注释
        'removeMetadata', // 移除元数据
        'removeEditorsNSData', // 移除编辑器特定数据
        'cleanupAttrs', // 清理属性
        'removeViewBox' // 移除 viewBox
      ]
    })

    // 检查优化结果是否成功
    if ('data' in svgResult) {
      // 预先创建图层信息数组
      const layerInfos: LayerInfo[] = []
      // 解析 SVG
      const parsedSvg = parseSVGAndSetOpacity(svgResult.data)
      if (!parsedSvg) return

      // 获取所有内容层级的元素
      const layerElements: Element[] = []
      Array.from(parsedSvg.doc.documentElement.children).forEach((child) => {
        const foundLayers = findContentGroups(child as Element)
        layerElements.push(...foundLayers) // 使用展开运算符添加到列表
      })

      layerElements.forEach((element, index) => {
        // 遍历 layerElements
        try {
          // 获取图层信息
          const info = {
            name: element.getAttribute('data-name') || `未知图层`,
            id: element.id || `未知图层`, // 使用元素的 id
            type: element.tagName,
            childCount: element.children.length,
            paths: element.querySelectorAll('path').length
          }

          // 添加到图层信息列表
          layerInfos.push(info as any)
        } catch (err) {}
      })

      // 重复图层合并
      const svgLayer = groupDataByIdPrefix(layerInfos)
      return svgLayer
    } else {
    }
  } catch (error) {}
}

/**
 * 分析SVG文件
 * @param url - SVG文件的URL或base64编码
 * @returns 返回解析图层的颜色
 */
export async function andysisSvgColor(url: string, svgId: string): Promise<string> {
  if (!url?.toLowerCase().includes('.svg') && !url?.toLowerCase().includes('data:image/svg+xml')) {
    return ''
  }

  // 处理SVG
  try {
    const response = await fetch(url)
    const svgText = await response.text()
    const svgResult = optimize(svgText, {
      plugins: [
        'removeDoctype', // 移除DOCTYPE声明
        'removeXMLProcInst', // 移除XML处理指令
        'removeComments', // 移除注释
        'removeMetadata', // 移除元数据
        'removeEditorsNSData', // 移除编辑器特定数据
        'cleanupAttrs', // 清理属性
        'removeViewBox' // 移除 viewBox
      ]
    })

    // 检查优化结果是否成功
    if ('data' in svgResult) {
      // 预先创建图层信息数组
      const layerInfos: LayerInfo[] = []
      // 解析 SVG
      const parsedSvg = parseSVGAndSetOpacity(svgResult.data)

      if (!parsedSvg) return

      // 获取所有内容层级的元素
      const layerElements: Element[] = []
      Array.from(parsedSvg.doc.documentElement.children).forEach((child) => {
        const foundLayers = findContentGroups(child as Element)
        layerElements.push(...foundLayers) // 使用展开运算符添加到列表
      })

      layerElements.forEach((element, index) => {
        // 遍历 layerElements
        try {
          // 获取图层信息
          const info = {
            name: element.getAttribute('data-name') || `未知图层`,
            id: element.id || `未知图层`, // 使用元素的 id
            type: element.tagName,
            childCount: element.children.length,
            paths: element.querySelectorAll('path').length
          }

          // 添加到图层信息列表
          layerInfos.push(info as any)
        } catch (err) {}
      })

      //  重复图层合并
      const svgLayer = groupDataByIdPrefix(layerInfos)

      // 如果提供了svgId，查找对应图层的填充色
      if (svgId) {
        const targetLayer = svgLayer.find((layer) => layer.id === svgId)
        if (targetLayer && targetLayer.content && targetLayer.content.length > 0) {
          // 获取content中的第一项
          const firstContent = targetLayer.content[0]
          // 在parsedSvg中查找对应ID的元素
          const targetElement = parsedSvg.doc.getElementById(firstContent.id)
          // 返回data-fill-color属性值，如果没有则返回空数组
          return targetElement?.getAttribute('data-fill-color') || ''
        }
        return ''
      }
    } else {
    }
  } catch (error) {}
}

// svg图层高亮预览
export async function previewSelectSvg(): Promise<void> {
  const { canvas, editor } = useEditor()
  const selectedId = canvas.ref.svgpreviewId.value
  // 这里old记录且操作 为啥呢？ 因为这个事焦事件 我看别的地方也绑了，用old可以避免其他提前触发造成list变化
  const old = canvas.app.editor.leafList.list
  // 添加失焦事件监听器
  const handleBlur = () => {
    try {
      old.forEach((e) => {
        // 删除克隆的SVG
        const svgBox = e as Group
        const existingClone = editor.contentFrame.findOne('.modified-svg-' + svgBox.innerId)
        if (existingClone) {
          // 忽略记录历史操作
          canvas.undoRedo.withoutListen(() => {
            editor.contentFrame.remove(existingClone)
          })
        }

        // 恢复原始SVG
        svgBox.visible = true
        svgBox.locked = false
      })
    } finally {
      // 退出预览模式
      canvas.ref.isSvgpreview.value = false
      // 移除失焦事件监听器
      canvas.app.editor.off(EditorEvent.SELECT, handleBlur)
    }
  }

  // 监听失焦事件
  canvas.app.editor.on(EditorEvent.SELECT, handleBlur)
  try {
    editor.dateEdit(async (e) => {
      const svgBox = e as Group

      // 获取SVG内容
      const fill = Array.isArray(svgBox.fill) ? svgBox.fill[0] : svgBox.fill
      const response = await fetch((fill as any).url)
      const svgText = await response.text()

      // 使用SVGO优化和解析SVG
      const result = optimize(svgText, {
        plugins: [
          'removeDoctype', // 移除DOCTYPE声明
          'removeXMLProcInst', // 移除XML处理指令
          'removeComments', // 移除注释
          'removeMetadata', // 移除元数据
          'removeEditorsNSData', // 移除编辑器特定数据
          'cleanupAttrs', // 清理属性
          'removeViewBox' // 移除 viewBox
        ]
      })

      if ('data' in result) {
        // 解析SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(result.data, 'image/svg+xml')

        // 获取所有内容层级的元素
        let contentLayers: Element[] = []
        Array.from(svgDoc.documentElement.children).forEach((child) => {
          const foundLayers = findContentGroups(child)
          contentLayers = contentLayers.concat(foundLayers)
        })

        // 检查是否已存在 defs 元素，如果不存在则创建
        let defsElement = svgDoc.querySelector('defs')
        if (!defsElement) {
          defsElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs')
          svgDoc.documentElement.appendChild(defsElement)
        }

        // 创建一个带透明度的白色滤镜
        const grayFilterId = 'gray-filter-' + Date.now()
        const grayFilterHTML = `
      <filter id="${grayFilterId}" color-interpolation-filters="sRGB">
        <!-- 创建一个接近白色的版本 -->
        <feColorMatrix type="matrix" values="
          0.2 0.2 0.2 0 0.8
          0.2 0.2 0.2 0 0.8
          0.2 0.2 0.2 0 0.8
          0   0   0   1 0
        " result="whitened"/>
        
        <!-- 混合原始图像和白色版本 -->
        <feBlend in="SourceGraphic" in2="whitened" mode="normal" result="blended"/>
        
        <!-- 控制混合比例，数值越小原始颜色越明显 -->
        <feComponentTransfer in="blended">
          <feFuncR type="linear" slope="0.3" intercept="0.7"/>
          <feFuncG type="linear" slope="0.3" intercept="0.7"/>
          <feFuncB type="linear" slope="0.3" intercept="0.7"/>
          <feFuncA type="linear" slope="1" intercept="0"/>
        </feComponentTransfer>
      </filter>
    `
        defsElement.innerHTML += grayFilterHTML

        // 应用高亮效果 - 只应用滤镜，不移动图层位置
        if (selectedId && selectedId.content) {
          // 为所有图层处理
          contentLayers.forEach((layer) => {
            const layerId = layer.getAttribute('id')
            // 检查当前图层是否在选中列表中
            const isSelected = selectedId.content.some((item: any) => item.id === layerId)

            if (!isSelected) {
              // 非选中图层应用灰白色滤镜，但保留原有颜色滤镜
              // 保存原始样式
              const currentStyle = (layer as SVGElement).getAttribute('style') || ''

              // 提取现有的filter属性（如果有）
              let existingFilter = ''
              const filterMatch = currentStyle.match(/filter:\s*([^;]+)/)
              if (filterMatch && filterMatch[1]) {
                existingFilter = filterMatch[1]
              }

              // 移除现有的filter属性
              const styleWithoutFilter = currentStyle
                .split(';')
                .filter((style) => !style.trim().startsWith('filter:'))
                .join(';')

              // 组合现有滤镜和新滤镜
              let newFilter = ''
              if (existingFilter && !existingFilter.includes(grayFilterId)) {
                // 如果已有滤镜且不包含当前灰度滤镜，则组合使用
                newFilter = `url(#${grayFilterId}) ${existingFilter}`
              } else {
                // 否则只使用灰度滤镜
                newFilter = `url(#${grayFilterId})`
              }

              // 应用新滤镜
              const newStyle = `${styleWithoutFilter}; filter: ${newFilter}; isolation: isolate;`.trim()
              ;(layer as SVGElement).setAttribute('style', newStyle)

              // 保存原始滤镜信息，以便恢复
              if (currentStyle.includes('filter:')) {
                layer.setAttribute('data-original-filter', currentStyle)
              }
            }
            // 选中的图层保持原样，不做特殊处理
          })
        }

        // 将修改后的SVG转换为字符串
        const serializer = new XMLSerializer()
        const highlightedSvgString = serializer.serializeToString(svgDoc)

        // 克隆原始图片
        const points = svgBox.getLayoutPoints('box', canvas.app.tree)
        //  获取顶层 zIndex
        const topLevel = canvas.hierarchyService.getTopLevel().zIndex
        const modifiedImage = svgBox.clone({
          rotation: svgBox.rotation,
          x: points[0].x,
          y: points[0].y,
          className: 'modified-svg-' + svgBox.innerId,
          draggable: false,
          editable: false,
          visible: true,
          zIndex: topLevel + 1
        })
        const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(highlightedSvgString)
        // 预加载图片 防止闪动
        Resource.loadImage(dataUrl).then(() => {
          ;(modifiedImage.fill as any)[0].url = dataUrl
          modifiedImage.set({
            fill: [...modifiedImage.fill]
          })
          if (svgBox.scaleX === -1) {
            modifiedImage.scaleX = -1
          }
          // 删除之前创建的克隆元素
          const existingClone = editor.contentFrame.findOne('.modified-svg-' + svgBox.innerId)
          if (existingClone) {
            // 忽略记录历史操作
            canvas.undoRedo.withoutListen(() => {
              editor.contentFrame.remove(existingClone)
            })
          }
          editor.contentFrame.add(modifiedImage)
          //等待渲染完成
          canvas.app.nextRender(() => {
            svgBox.visible = false
            svgBox.locked = true
          })
        })
      }
    })
  } finally {
  }
}

/**
 * 修改图层饱和度
 * @param num - 饱和度值，范围通常为0-200，100为正常饱和度
 * @returns 返回处理结果
 */
export async function changeSaturation(num: number): Promise<string> {
  // 获取编辑器和画布实例
  const { canvas, editor } = useEditor()
  // 获取当前选中的SVG图层ID
  const selectedId = canvas.ref.svgpreviewId.value

  editor.dateEdit(async (e) => {
    // 获取当前活动对象
    const svgBox = e as any

    // 获取SVG内容
    const response = await fetch(svgBox.fill[0].url)
    const svgText = await response.text()

    // 使用SVGO优化SVG
    const svgResult = optimize(svgText, {
      plugins: [
        'removeDoctype', // 移除DOCTYPE声明
        'removeXMLProcInst', // 移除XML处理指令
        'removeComments', // 移除注释
        'removeMetadata', // 移除元数据
        'removeEditorsNSData', // 移除编辑器特定数据
        'cleanupAttrs', // 清理属性
        'removeViewBox' // 移除 viewBox
      ]
    })

    // 检查优化结果是否成功
    if ('data' in svgResult) {
      try {
        // 解析SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgResult.data, 'image/svg+xml')

        // 获取所有内容层级的元素
        let contentLayers: Element[] = []
        Array.from(svgDoc.documentElement.children).forEach((child) => {
          const foundLayers = findContentGroups(child)
          contentLayers = contentLayers.concat(foundLayers)
        })

        // 检查是否已存在 defs 元素，如果不存在则创建
        let defsElement = svgDoc.querySelector('defs')
        if (!defsElement) {
          defsElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs')
          svgDoc.documentElement.appendChild(defsElement)
        }

        // 创建饱和度滤镜
        const saturationFilterId = 'saturation-filter-' + Date.now()
        const saturationFilterHTML = `
        <filter id="${saturationFilterId}" color-interpolation-filters="sRGB">
          <!-- 饱和度调整 -->
          <feColorMatrix type="saturate" values="${num / 100}" />
        </filter>
      `

        // 将滤镜配置添加到 defs 元素
        defsElement.innerHTML += saturationFilterHTML

        // 如果是局部调整，只对指定图层应用滤镜
        if (selectedId && selectedId.content) {
          // 获取选中的图层ID列表
          const selectedLayerIds = selectedId.content.map((item: any) => item.id)

          // 遍历所有内容层
          contentLayers.forEach((layer) => {
            const layerId = layer.getAttribute('id')

            // 只对选中的图层应用滤镜
            if (selectedLayerIds.includes(layerId)) {
              // 清除可能存在的旧滤镜属性
              const currentStyle = (layer as SVGElement).getAttribute('style') || ''

              // 提取现有的filter属性（如果有）
              let existingFilter = ''
              const filterMatch = currentStyle.match(/filter:\s*([^;]+)/)
              if (filterMatch && filterMatch[1]) {
                // 保留所有现有滤镜，只移除旧的饱和度滤镜
                existingFilter = filterMatch[1].replace(/url\(#saturation-filter-[0-9]+\)\s*/g, '')
              }

              // 移除现有的filter属性
              const styleWithoutFilter = currentStyle
                .split(';')
                .filter((style) => !style.trim().startsWith('filter:'))
                .join(';')

              // 组合现有滤镜和新滤镜
              let newFilter = ''
              if (existingFilter && existingFilter.trim() !== '') {
                // 如果已有其他滤镜（如颜色滤镜），则组合使用
                // 将饱和度滤镜放在后面，这样它会后应用，影响之前的颜色滤镜效果
                newFilter = `${existingFilter} url(#${saturationFilterId})`
              } else {
                // 否则只使用饱和度滤镜
                newFilter = `url(#${saturationFilterId})`
              }

              // 应用新滤镜
              const newStyle = `${styleWithoutFilter}; filter: ${newFilter}; isolation: isolate;`.trim()
              ;(layer as SVGElement).setAttribute('style', newStyle)

              // 添加自定义数据属性，存储饱和度值
              layer.setAttribute('data-saturation', num.toString())
              layer.setAttribute('data-saturation-filter-id', saturationFilterId)
              layer.setAttribute('data-last-modified', new Date().toISOString())

              // 将饱和度信息追加到 activeObject.value.children[1].data 中
              const imgData = canvas.activeObject.value.data || {}
              if (!imgData.saturationInfo) {
                imgData.saturationInfo = {}
              }

              // 使用 childSaturationInfo 数组存储饱和度信息（与颜色信息共用）
              if (!imgData.saturationInfo.childSaturationInfo) {
                imgData.saturationInfo.childSaturationInfo = []
              }

              // 检查是否已存在相同 id 的信息
              const existingIndex = imgData.saturationInfo.childSaturationInfo.findIndex((item: { id: string }) => item.id === selectedId.id)

              if (existingIndex !== -1) {
                // 如果存在，则只更新饱和度相关字段，保留其他字段（如颜色信息）
                const existingItem = imgData.saturationInfo.childSaturationInfo[existingIndex]

                // 只更新饱和度相关字段
                existingItem.saturation = num
              } else {
                // 如果不存在，则追加新项
                imgData.saturationInfo.childSaturationInfo.push({
                  id: selectedId.id,
                  content: selectedId.content,
                  saturation: num
                })
              }

              // 更新 svgImg 的数据
              canvas.activeObject.value.data = imgData
            }
          })
        }

        // 将修改后的SVG转换为字符串
        const serializer = new XMLSerializer()
        const modifiedSvgString = serializer.serializeToString(svgDoc)

        // 更新SVG图像 - 修复这里的问题
        const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(modifiedSvgString)

        Resource.loadImage(dataUrl).then(() => {
          if (Array.isArray(svgBox.fill)) {
            ;(svgBox.fill[0] as any).url = dataUrl
          } else {
            ;(svgBox.fill as any).url = dataUrl
          }
          // 更新原始SVG图像的URL
          const [first, ...rest] = svgBox.fill as IPaint[]
          svgBox.set({ fill: [{ ...first, url: dataUrl }, ...rest] })
          // svgBox.set({
          //   fill: Object.assign({}, svgBox.fill, { url: dataUrl })
          // })
          // 如果当前处于图层高亮预览状态，需要重新调用预览函数更新高亮图层
          if (canvas.ref.isSvgpreview.value) {
            previewSelectSvg()
          }
        })

        return dataUrl
      } catch (error) {
        return ''
      }
    }
  })

  return ''
}

/**
 * 修改svg所有图层饱和度
 * @param num - 饱和度值，范围通常为0-200，100为正常饱和度
 * @returns 返回处理结果
 */
export async function changeSvgSaturation(num: number): Promise<string> {
  // 获取编辑器和画布实例
  const { canvas, editor } = useEditor()
  // 获取当前活动对象
  editor.dateEdit(async (e) => {
    const svgBox = e as any
    // 获取SVG内容
    const response = await fetch(svgBox.fill[0].url)
    const svgText = await response.text()

    // 使用SVGO优化SVG
    const svgResult = optimize(svgText, {
      plugins: [
        'removeDoctype', // 移除DOCTYPE声明
        'removeXMLProcInst', // 移除XML处理指令
        'removeComments', // 移除注释
        'removeMetadata', // 移除元数据
        'removeEditorsNSData', // 移除编辑器特定数据
        'cleanupAttrs', // 清理属性
        'removeViewBox' // 移除 viewBox
      ]
    })

    // 检查优化结果是否成功
    if ('data' in svgResult) {
      try {
        // 解析SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgResult.data, 'image/svg+xml')

        // 获取所有内容层级的元素
        let contentLayers: Element[] = []
        Array.from(svgDoc.documentElement.children).forEach((child) => {
          const foundLayers = findContentGroups(child)
          contentLayers = contentLayers.concat(foundLayers)
        })

        // 检查是否已存在 defs 元素，如果不存在则创建
        let defsElement = svgDoc.querySelector('defs')
        if (!defsElement) {
          defsElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs')
          svgDoc.documentElement.appendChild(defsElement)
        }

        // 创建饱和度滤镜
        const saturationFilterId = 'saturation-filter-' + Date.now()
        const saturationFilterHTML = `
        <filter id="${saturationFilterId}" color-interpolation-filters="sRGB">
          <!-- 饱和度调整 -->
          <feColorMatrix type="saturate" values="${num / 100}" />
        </filter>
      `

        // 将滤镜配置添加到 defs 元素
        defsElement.innerHTML += saturationFilterHTML

        // 遍历所有内容层，应用全局饱和度滤镜
        contentLayers.forEach((layer) => {
          const currentStyle = (layer as SVGElement).getAttribute('style') || ''

          // 提取现有的filter属性（如果有）
          let existingFilter = ''
          const filterMatch = currentStyle.match(/filter:\s*([^;]+)/)

          if (filterMatch && filterMatch[1]) {
            // 保留颜色滤镜，移除所有饱和度滤镜
            existingFilter = filterMatch[1].replace(/url\(#saturation-filter-[0-9]+\)\s*/g, '')
          }

          // 移除现有的filter属性
          const styleWithoutFilter = currentStyle
            .split(';')
            .filter((style) => !style.trim().startsWith('filter:'))
            .join(';')

          // 组合现有滤镜和新滤镜
          let newFilter = ''
          if (existingFilter && existingFilter.trim() !== '') {
            // 如果存在其他滤镜（如颜色滤镜），则组合使用
            // 将饱和度滤镜放在后面，这样它会后应用，影响之前的颜色滤镜效果
            newFilter = `${existingFilter} url(#${saturationFilterId})`
          } else {
            // 否则只使用饱和度滤镜
            newFilter = `url(#${saturationFilterId})`
          }

          // 应用新滤镜
          const newStyle = `${styleWithoutFilter}; filter: ${newFilter}; isolation: isolate;`.trim()
          ;(layer as SVGElement).setAttribute('style', newStyle)

          // 添加自定义数据属性，存储饱和度值
          layer.setAttribute('data-saturation', num.toString())
          layer.setAttribute('data-saturation-filter-id', saturationFilterId)
          layer.setAttribute('data-last-modified', new Date().toISOString())
        })

        // 更新数据存储
        const imgData = e.data || {}

        // 清除所有子图层的饱和度设置
        if (imgData.saturationInfo && imgData.saturationInfo.childSaturationInfo) {
          imgData.saturationInfo.childSaturationInfo = []
        }

        // 设置全局饱和度
        if (!imgData.saturationInfo) {
          imgData.saturationInfo = {}
        }

        // 记录全局饱和度设置
        imgData.saturationInfo.globalSaturation = num

        // 更新 svgImg 的数据
        canvas.activeObject.value.data = imgData

        // 将修改后的SVG转换为字符串
        const serializer = new XMLSerializer()
        const modifiedSvgString = serializer.serializeToString(svgDoc)

        // 更新SVG图像
        const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(modifiedSvgString)

        Resource.loadImage(dataUrl).then(() => {
          if (Array.isArray(svgBox.fill)) {
            ;(svgBox.fill[0] as any).url = dataUrl
          } else {
            ;(svgBox.fill as any).url = dataUrl
          }
          const [first, ...rest] = svgBox.fill as IPaint[]
          svgBox.set({ fill: [{ ...first, url: dataUrl }, ...rest] })
          // 如果当前处于图层高亮预览状态，需要重新调用预览函数更新高亮图层
          if (canvas.ref.isSvgpreview.value) {
            previewSelectSvg()
          }
        })

        return dataUrl
      } catch (error) {
        return ''
      }
    }
  })
  return ''
}

/**
 * 修改svg所有图层透明度
 * @param num - 透明度值，范围通常为0-100
 * @returns 返回处理结果
 */
export async function changeSvgTransparency(num: number): Promise<string> {
  // 获取编辑器和画布实例
  const { canvas, editor } = useEditor()
  // 获取当前活动对象
  editor.dateEdit(async (e) => {
    const svgBox = e as any

    // 获取SVG内容
    const fill = Array.isArray(svgBox.fill) ? svgBox.fill[0] : svgBox.fill
    const response = await fetch((fill as any).url)
    const svgText = await response.text()

    // 使用SVGO优化SVG
    const svgResult = optimize(svgText, {
      plugins: [
        'removeDoctype', // 移除DOCTYPE声明
        'removeXMLProcInst', // 移除XML处理指令
        'removeComments', // 移除注释
        'removeMetadata', // 移除元数据
        'removeEditorsNSData', // 移除编辑器特定数据
        'cleanupAttrs', // 清理属性
        'removeViewBox' // 移除 viewBox
      ]
    })

    // 检查优化结果是否成功
    if ('data' in svgResult) {
      try {
        // 解析SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgResult.data, 'image/svg+xml')

        // 获取所有内容层级的元素
        let contentLayers: Element[] = []
        Array.from(svgDoc.documentElement.children).forEach((child) => {
          const foundLayers = findContentGroups(child)
          contentLayers = contentLayers.concat(foundLayers)
        })

        // 透明度值转换为0-1之间的小数
        const opacityValue = num / 100

        // 遍历所有内容层，应用全局透明度
        contentLayers.forEach((layer) => {
          const currentStyle = (layer as SVGElement).getAttribute('style') || ''

          // 移除现有的opacity属性
          const styleWithoutOpacity = currentStyle
            .split(';')
            .filter((style) => !style.trim().startsWith('opacity:'))
            .join(';')

          // 应用新透明度
          const newStyle = `${styleWithoutOpacity}; opacity: ${opacityValue};`.trim()
          ;(layer as SVGElement).setAttribute('style', newStyle)

          // 添加自定义数据属性，存储透明度值
          layer.setAttribute('data-transparency', num.toString())
          layer.setAttribute('data-last-modified', new Date().toISOString())
        })

        // 更新数据存储
        const imgData = e.data || {}

        // 确保透明度信息对象存在
        if (!imgData.transparencyInfo) {
          imgData.transparencyInfo = {}
        }

        // 清除所有子图层的透明度设置
        if (imgData.transparencyInfo.childTransparencyInfo) {
          imgData.transparencyInfo.childTransparencyInfo = []
        }

        // 记录全局透明度设置
        imgData.transparencyInfo.globalTransparency = num

        // 更新 svgImg 的数据
        canvas.activeObject.value.data = imgData

        // 将修改后的SVG转换为字符串
        const serializer = new XMLSerializer()
        const modifiedSvgString = serializer.serializeToString(svgDoc)

        // 更新SVG图像
        const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(modifiedSvgString)
        Resource.loadImage(dataUrl).then(() => {
          // 更新原始SVG图像的URL
          // 安全地处理 fill 可能为数组或对象的情况
          const fill = Array.isArray(svgBox.fill) ? svgBox.fill[0] : svgBox.fill
          if (fill && typeof fill === 'object' && 'url' in fill) {
            ;(fill as any).url = dataUrl
          }
          const [first, ...rest] = svgBox.fill as IPaint[]
          svgBox.set({ fill: [{ ...first, url: dataUrl }, ...rest] })
          // 如果当前处于图层高亮预览状态，需要重新调用预览函数更新高亮图层
          if (canvas.ref.isSvgpreview.value) {
            previewSelectSvg()
          }
        })

        return dataUrl
      } catch (error) {
        return ''
      }
    }
  })
  return ''
}

/**
 * 修改特定SVG图层的透明度
 * @param num - 透明度值，范围通常为0-100
 * @returns 返回处理结果
 */
export async function changeTransparency(num: number): Promise<string> {
  // 获取编辑器和画布实例
  const { canvas, editor } = useEditor()
  // 获取当前选中的SVG图层ID
  const selectedId = canvas.ref.svgpreviewId.value
  editor.dateEdit(async (e) => {
    // 获取当前活动对象
    const svgBox = e as Group

    // 获取SVG内容
    const response = await fetch((svgBox.fill as any)[0].url)
    const svgText = await response.text()

    // 使用SVGO优化SVG
    const svgResult = optimize(svgText, {
      plugins: [
        'removeDoctype', // 移除DOCTYPE声明
        'removeXMLProcInst', // 移除XML处理指令
        'removeComments', // 移除注释
        'removeMetadata', // 移除元数据
        'removeEditorsNSData', // 移除编辑器特定数据
        'cleanupAttrs', // 清理属性
        'removeViewBox' // 移除 viewBox
      ]
    })

    // 检查优化结果是否成功
    if ('data' in svgResult) {
      try {
        // 解析SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgResult.data, 'image/svg+xml')

        // 获取所有内容层级的元素
        let contentLayers: Element[] = []
        Array.from(svgDoc.documentElement.children).forEach((child) => {
          const foundLayers = findContentGroups(child)
          contentLayers = contentLayers.concat(foundLayers)
        })

        // 透明度值转换为0-1之间的小数
        const opacityValue = num / 100

        // 如果是局部调整，只对指定图层应用透明度
        if (selectedId && selectedId.content) {
          // 获取选中的图层ID列表
          const selectedLayerIds = selectedId.content.map((item: any) => item.id)

          // 遍历所有内容层
          contentLayers.forEach((layer) => {
            const layerId = layer.getAttribute('id')

            // 只对选中的图层应用透明度
            if (selectedLayerIds.includes(layerId)) {
              // 获取当前样式
              const currentStyle = (layer as SVGElement).getAttribute('style') || ''

              // 移除现有的opacity属性
              const styleWithoutOpacity = currentStyle
                .split(';')
                .filter((style) => !style.trim().startsWith('opacity:'))
                .join(';')

              // 应用新透明度
              const newStyle = `${styleWithoutOpacity}; opacity: ${opacityValue};`.trim()
              ;(layer as SVGElement).setAttribute('style', newStyle)

              // 添加自定义数据属性，存储透明度值
              layer.setAttribute('data-transparency', num.toString())
              layer.setAttribute('data-last-modified', new Date().toISOString())
            }
          })

          // 更新数据存储
          const imgData = canvas.activeObject.value.data || {}

          // 确保透明度信息对象存在
          if (!imgData.transparencyInfo) {
            imgData.transparencyInfo = {}
          }

          // 确保子透明度信息数组存在
          if (!imgData.transparencyInfo.childTransparencyInfo) {
            imgData.transparencyInfo.childTransparencyInfo = []
          }

          // 检查是否已存在相同 id 的信息
          const existingIndex = imgData.transparencyInfo.childTransparencyInfo.findIndex((item: { id: string }) => item.id === selectedId.id)

          if (existingIndex !== -1) {
            // 如果存在，则更新透明度值
            imgData.transparencyInfo.childTransparencyInfo[existingIndex].transparency = num
          } else {
            // 如果不存在，则追加新项
            imgData.transparencyInfo.childTransparencyInfo.push({
              id: selectedId.id,
              content: selectedId.content,
              transparency: num
            })
          }

          // 更新 svgImg 的数据
          canvas.activeObject.value.data = imgData
        }

        // 将修改后的SVG转换为字符串
        const serializer = new XMLSerializer()
        const modifiedSvgString = serializer.serializeToString(svgDoc)

        // 更新SVG图像
        const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(modifiedSvgString)

        Resource.loadImage(dataUrl).then(() => {
          // 更新原始SVG图像的URL
          if (Array.isArray(svgBox.fill)) {
            ;(svgBox.fill[0] as any).url = dataUrl
          } else {
            ;(svgBox.fill as any).url = dataUrl
          }
          const [first, ...rest] = svgBox.fill as IPaint[]
          svgBox.set({ fill: [{ ...first, url: dataUrl }, ...rest] })
          // 如果当前处于图层高亮预览状态，需要重新调用预览函数更新高亮图层
          if (canvas.ref.isSvgpreview.value) {
            previewSelectSvg()
          }
        })

        return dataUrl
      } catch (error) {
        return ''
      }
    }
  })

  return ''
}

/**
 * 设置特定SVG图层的显示/隐藏状态
 * @param isVisible - 是否可见，true为显示，false为隐藏
 * @param layerInfo - 指定的图层信息，格式与svgpreviewId相同
 * @returns 返回处理结果
 */
export async function changeLayerVisibility(isVisible: boolean, layerInfo: any): Promise<string> {
  // 获取编辑器和画布实例
  const { canvas, editor } = useEditor()
  // 获取SVG缓存store
  const svgCacheStore = useSvgCacheStore()

  // 确保 layerInfo 有正确的格式
  const selectedId = {
    id: layerInfo.id,
    content: layerInfo.content || [layerInfo]
  }

  // 获取当前活动对象
  const svgBox = canvas.activeObject.value as any
  const oldSvgUrl = svgBox.fill[0].url as string
  const elementId = svgBox.id as string // 获取元素ID

  // 获取SVG内容
  const response = await fetch(svgBox.fill[0].url)
  const svgText = await response.text()

  // 使用SVGO优化SVG
  const svgResult = optimize(svgText, {
    plugins: [
      'removeDoctype', // 移除DOCTYPE声明
      'removeXMLProcInst', // 移除XML处理指令
      'removeComments', // 移除注释
      'removeMetadata', // 移除元数据
      'removeEditorsNSData', // 移除编辑器特定数据
      'cleanupAttrs', // 清理属性
      'removeViewBox' // 移除 viewBox
    ]
  })

  // 检查优化结果是否成功
  if ('data' in svgResult) {
    try {
      // 解析SVG
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgResult.data, 'image/svg+xml')

      // 获取所有内容层级的元素
      let contentLayers: Element[] = []
      Array.from(svgDoc.documentElement.children).forEach((child) => {
        const foundLayers = findContentGroups(child)
        contentLayers = contentLayers.concat(foundLayers)
      })

      // 如果是局部调整，只对指定图层应用可见性
      if (selectedId && selectedId.content) {
        // 获取选中的图层ID列表
        const selectedLayerIds = selectedId.content.map((item: any) => item.id)

        // 遍历所有内容层
        contentLayers.forEach((layer) => {
          const layerId = layer.getAttribute('id')

          // 只对选中的图层应用可见性
          if (selectedLayerIds.includes(layerId)) {
            // 获取当前样式
            const currentStyle = (layer as SVGElement).getAttribute('style') || ''

            // 移除现有的display属性
            const styleWithoutDisplay = currentStyle
              .split(';')
              .filter((style) => !style.trim().startsWith('display:'))
              .join(';')

            // 应用新的显示状态
            const displayValue = isVisible ? 'inline' : 'none'
            const newStyle = `${styleWithoutDisplay}; display: ${displayValue};`.trim()
            ;(layer as SVGElement).setAttribute('style', newStyle)

            // 添加自定义数据属性，存储可见性状态
            layer.setAttribute('data-visibility', isVisible.toString())
            // 添加特殊标识，表示这是通过我们的操作隐藏的
            layer.setAttribute('data-scipixa-hidden', isVisible ? 'false' : 'true')
            layer.setAttribute('data-last-modified', new Date().toISOString())
          }
        })

        // 更新数据存储
        const imgData = canvas.activeObject.value.data || {}

        // 更新 svgImg 的数据
        canvas.activeObject.value.data = imgData
      }

      // 将修改后的SVG转换为字符串
      const serializer = new XMLSerializer()
      const modifiedSvgString = serializer.serializeToString(svgDoc)

      // 更新SVG图像
      const dataUrl = 'data:image/svg+xml;base64,' + utf8ToBase64(modifiedSvgString)
      //图片预加载 防止闪动
      Resource.loadImage(dataUrl).then(() => {
        //更新填充
        const [first, ...rest] = svgBox.fill as IPaint[]
        svgBox.set({ fill: [{ ...first, url: dataUrl }, ...rest] })

        // 在函数末尾，成功修改SVG后，更新缓存
        if (svgCacheStore.hasCachedSvg(oldSvgUrl, elementId)) {
          const cachedLayers = svgCacheStore.getCachedSvg(oldSvgUrl, elementId)
          if (cachedLayers) {
            // 更新缓存中的可见性状态
            cachedLayers.forEach((layer) => {
              if (layer.id === selectedId.id) {
                layer.visible = isVisible
              }
            })

            // 如果URL发生了变化，更新URL映射
            if (oldSvgUrl !== dataUrl) {
              svgCacheStore.updateSvgUrl(oldSvgUrl, dataUrl, elementId)
            } else {
              // 否则只更新缓存内容
              svgCacheStore.cacheSvg(dataUrl, cachedLayers, elementId)
            }
          }
        }

        // 如果当前处于图层高亮预览状态，需要重新调用预览函数更新高亮图层
        if (canvas.ref.isSvgpreview.value) {
          previewSelectSvg()
        }
        canvas.undoRedo.save(2)
        return dataUrl
      })
    } catch (error) {
      return ''
    }
  }

  return ''
}

/**
 * @description 将字符串转换为 base64
 * @param str 要编码的字符串
 * @returns base64编码的字符串
 */
function utf8ToBase64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt('0x' + p1))
      })
    )
  } catch (e) {
    return ''
  }
}

/**
 * @description 将SVG链接转换为base64编码
 * @param url SVG的URL地址
 * @returns Promise<string> 返回base64编码的SVG数据，格式为 'data:image/svg+xml;base64,...'
 */
export async function svgUrlToBase64(url: string): Promise<string> {
  try {
    // 获取SVG内容
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`获取SVG失败: ${response.status} ${response.statusText}`)
    }

    // 读取SVG文本内容
    const svgText = await response.text()

    // 转换为base64
    const base64 = utf8ToBase64(svgText)

    // 返回完整的data URL
    return `data:image/svg+xml;base64,${base64}`
  } catch (error) {
    console.error('SVG转base64失败:', error)
    return ''
  }
}
// 将重名图层合并
function groupDataByIdPrefix(data: LayerInfo[]) {
  const result: any[] = []
  const idMap = new Map()

  data.forEach((item) => {
    console.log(item, '---item')

    // 检查是否已存在该前缀的分组
    if (!idMap.has(item.name)) {
      // 创建新分组对象
      const group = {
        id: item.id,
        content: [item]
      }
      result.push(group)
      idMap.set(item.name, group)
    } else {
      // 将当前项添加到已存在的分组
      idMap.get(item.name).content.push(item)
    }
  })

  return result
}

/**
 * @description 解析 SVG 并设置图层透明度
 * @param svgText SVG 文本内容
 */
function parseSVGAndSetOpacity(svgText: string, opacityId?: LayerInfo[]): any {
  try {
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    // 获取所有内容层级的元素
    let contentLayers: Element[] = []

    // 从 SVG 根元素的子元素开始查找可能的内容层包裹层
    Array.from(svgDoc.documentElement.children).forEach((child) => {
      // 调用 findContentGroups 来找到内容层列表
      const foundLayers = findContentGroups(child)
      // 将找到的层级添加到总列表中
      contentLayers = contentLayers.concat(foundLayers)
    })

    // 将修改后的 SVG 文档转换回字符串
    const serializer = new XMLSerializer()
    const modifiedSvgString = serializer.serializeToString(svgDoc)

    return {
      doc: svgDoc,
      string: modifiedSvgString
    }
  } catch (error) {
    return null
  }
}

/**
 * @description 递归查找内容层包裹层，并返回其子元素作为内容层列表
 * @param element 当前 SVG 元素
 * @returns 找到的内容层元素数组，如果未找到则为空数组
 */
function findContentGroups(element: Element): Element[] {
  const tagName = element.tagName.toLowerCase()

  // 跳过 defs 标签和其他非图形容器标签
  if (tagName === 'defs' || tagName === 'title' || tagName === 'desc') {
    return [] // 跳过这些元素及其子树
  }

  const children = Array.from(element.children)

  // 如果当前元素是 g 标签
  if (tagName === 'g') {
    // 判断是否为包裹层 (只有一个 g 子元素)
    const isWrapper = children.length === 1 && children[0].tagName.toLowerCase() === 'g'

    if (isWrapper) {
      // 如果是包裹层，继续向下递归其唯一的 g 子元素
      return findContentGroups(children[0])
    } else {
      // 如果不是包裹层，说明找到了内容层所在的父级 (内容层包裹层)
      // 返回它的所有子元素作为内容层
      // 可以在这里过滤掉不想要的子元素类型
      return children.filter((child) => {
        const childTagName = child.tagName.toLowerCase()
        return (
          childTagName === 'g' ||
          childTagName === 'path' ||
          childTagName === 'circle' ||
          childTagName === 'rect' ||
          childTagName === 'ellipse' ||
          childTagName === 'line' ||
          childTagName === 'polygon' ||
          childTagName === 'polyline'
        )
      })
    }
  }
  return []
}
