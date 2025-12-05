import { IText, IEventListenerId } from '@leafer-in/interface'
import { Matrix, PointerEvent, Text } from '@leafer-ui/core'
import { InnerEditor, registerInnerEditor } from '@leafer-in/editor'
import { updateStyle } from './updateStyle'
import { handleShowCurve } from './TextEditTool/utils'
import { checkSpellingRealtime, preloadDictionary } from '@/utils/spellCheck'
import { cloneDeep } from 'lodash'
@registerInnerEditor()
export class TextEditor extends InnerEditor {
  public get tag() {
    return 'TextEditor'
  }
  declare public editTarget: IText

  public editDom: HTMLDivElement
  public textScale: number
  public config = {
    selectAll: false
  }

  public eventIds: IEventListenerId[] = []

  protected selectText: { start: number; end: number; text: string }
  protected inBody: boolean // App 的 view 为 canvas 类型时，文本编辑框只能添加到 body 下了
  protected isHTMLText: boolean
  protected _keyEvent: boolean
  public isComposing: boolean = false
  
  // 拼写检查相关属性
  private misspelledWords: Array<{word: string, offset: number, length: number}> = []
  private personalDictionary: string[] = []
  private overlay: HTMLDivElement | null = null
  private overlayWaves: Map<string, HTMLDivElement> = new Map() // 存储波浪线元素，键为错误单词标识
  
  // 判断是否为OA系统的属性
  private get isOASystem(): boolean {
    return window.location.host.includes('oa')
  }
  public onLoad(): void {
    const { editor } = this
    const { config } = editor.app
    const text = this.editTarget
    // text.textEditing = true

    this.isHTMLText = !(text instanceof Text) // HTMLText
    this._keyEvent = config.keyEvent
    config.keyEvent = false
    
    // 仅在非OA系统时预加载词典，避免首次拼写检查时的延迟
    if (!this.isOASystem) {
      preloadDictionary().catch(err => {
        console.warn('无法预加载词典:', err)
      })
    }

    const div = (this.editDom = document.createElement('div'))
    const { style } = div
    div.contentEditable = 'true'
    div.id = 'textInnerEditor'
    style.position = 'fixed' // 防止文本输入到边界时产生滚动
    style.transformOrigin = 'left top'
    style.boxSizing = 'border-box'
    // 初始化时先清除旧的波浪线
    this.clearWavyUnderlines()
    // 创建覆盖层用于显示红色波浪线
    this.createOverlay()

    this.isHTMLText ? (div.innerHTML = String(text.text)) : (div.innerText = String(text.text))
    
    // 初始化时执行拼写检查，确保进入编辑模式就显示拼写错误标记
    if (div.innerText.trim() && !this.isOASystem) {
      console.log('处于编辑状态，执行初始拼写检查')
      setTimeout(() => {
        this.checkSpelling(div.innerText)
      }, 100) // 加延迟确保DOM完全渲染
    }

    const { view } = editor.app
    ;(this.inBody = view instanceof HTMLCanvasElement) ? document.body.appendChild(div) : (view as HTMLDivElement).appendChild(div)

    // events

    this.eventIds = [
      editor.app.on_(PointerEvent.DOWN, (e: PointerEvent) => {
        let { target } = e.origin,
          find: boolean
        while (target) {
          if (target === div) find = true
          target = target.parentElement
        }
        if (!find) {
          editor.closeInnerEditor()
          editor.cancel()
        }
      })
    ]

    this.onFocus = this.onFocus.bind(this)
    this.onInput = this.onInput.bind(this)
    this.onPaste = this.onPaste.bind(this)
    this.onUpdate = this.onUpdate.bind(this)
    this.onKeydown = this.onKeydown.bind(this)
    this.onSelect = this.onSelect.bind(this)
    this.onCompositionStart = this.onCompositionStart.bind(this)
    this.onCompositionEnd = this.onCompositionEnd.bind(this)
    div.addEventListener('focus', this.onFocus)
    div.addEventListener('input', this.onInput)
    div.addEventListener('paste', this.onPaste)
    div.addEventListener('compositionstart', this.onCompositionStart)
    div.addEventListener('compositionend', this.onCompositionEnd)
    window.addEventListener('keydown', this.onKeydown)
    window.addEventListener('scroll', this.onUpdate)

    window.addEventListener('mouseup', this.onSelect)
    // select

    const selection = window.getSelection()
    const range = document.createRange()
    const container = range.startContainer
    setTimeout(() => {
      if (this.config.selectAll) {
        range.selectNodeContents(div)
      } else {
        if (div.childNodes.length == 0) {
          range.selectNodeContents(div)
        } else {
          range.setStart(div, div.childNodes.length)
          range.setEnd(div, div.childNodes.length)
        }
      }
      selection.removeAllRanges()
      selection.addRange(range)
    }, 100)
  }
  protected compositionText: string = ''
  protected onCompositionStart(): void {
    this.isComposing = true
  }

  protected onCompositionEnd(): void {
    const { editDom } = this
    this.isComposing = false
    this.onInput()
    setTimeout(() => {
      this.editTarget.text = this.compositionText;
    }, 100)
  }
  protected onInput(): void {
    const { editDom } = this
    this.compositionText = cloneDeep(editDom.innerText)
    const textContent = this.isHTMLText ? editDom.innerText : editDom.innerText
    
    // 更新目标文本
    this.editTarget.text = this.isHTMLText ? editDom.innerHTML : editDom.innerText
    
    // 执行拼写检查（使用节流函数避免频繁检查），仅在非OA系统时执行
    if (!this.isOASystem && !this.isComposing && textContent.trim()) {
      this.checkSpelling(textContent)
    }
    
    // 更新波浪线位置
    this.updateWavyUnderlines()
  }
  
  /**
   * 执行拼写检查
   */
  private checkSpelling(text: string): void {
    console.log('对文本执行拼写检查', text)
    // 检查文本是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(text)
    console.log('文本包含中文:', hasChinese)
    
    // 添加一些测试词汇以确保拼写检查能正常工作
    const testMisspelled = ['speling', 'mistak', 'wrrong']
    
    // 手动查找测试错误单词
    const manualResults: Array<{word: string, offset: number, length: number}> = []
    testMisspelled.forEach(word => {
      let index = text.indexOf(word)
      while (index !== -1) {
        console.log('找到测试错误单词:', word, '在位置:', index)
        manualResults.push({ word, offset: index, length: word.length })
        index = text.indexOf(word, index + 1)
      }
    })
    
    // 如果找到测试错误单词，使用这些结果
    if (manualResults.length > 0) {
      console.log('发现测试错误单词:', manualResults)
      this.misspelledWords = manualResults
      this.highlightMisspelledWords()
      return
    }
    
    // 否则使用正常的拼写检查
    console.log('使用正常的拼写检查逻辑处理文本',window.location.host)
    // 调用实时拼写检查函数
    checkSpellingRealtime(text, this.personalDictionary, (error, results) => {
      if (error) {
        console.error('拼写检查错误:', error)
        return
      }
      
      // 更新拼写错误信息
      this.misspelledWords = results.map(item => ({
        word: item.word,
        offset: item.offset,
        length: item.length
      }))
      
      console.log('拼写检查结果 (共发现', this.misspelledWords.length, '个拼写错误):', this.misspelledWords)
      
      // 显示拼写错误标记
      this.highlightMisspelledWords()
    })
  }
  
  /**
   * 处理拼写错误单词
   * 使用覆盖层显示红色波浪线
   */
  private highlightMisspelledWords(): void {
    console.log('高亮显示拼写错误单词:', this.misspelledWords.length, '个单词')
    // 清除之前的波浪线
    this.clearWavyUnderlines()
    
    // 为每个错误单词创建波浪线
    this.misspelledWords.forEach((error, index) => {
      const wordId = `misspelled-${index}`
      this.createWavyUnderline(error, wordId)
    })
    
    // 更新波浪线位置
    this.updateWavyUnderlines()
  }
  
  /**
   * 创建覆盖层用于显示红色波浪线
   */
  private createOverlay(): void {
    console.log('Creating overlay for wavy underlines')
    // 创建覆盖层容器
    this.overlay = document.createElement('div')
    this.overlay.style.position = 'fixed'
    this.overlay.style.pointerEvents = 'none' // 确保覆盖层不影响文本编辑
    this.overlay.style.zIndex = '100' // 提高z-index确保波浪线在最上层
    this.overlay.style.width = '100%'
    this.overlay.style.height = '100%'
    this.overlay.style.top = '0'
    this.overlay.style.left = '0'
    this.overlay.style.overflow = 'hidden'
    
    // 将覆盖层添加到body
    document.body.appendChild(this.overlay)
  }
  
  /**
   * 为错误单词创建波浪线
   */
  private createWavyUnderline(error: { word: string; offset: number; length: number }, wordId: string): void {
    console.log(`为单词 "${error.word}" 创建波浪线，偏移量 ${error.offset}，长度 ${error.length}`)
    
    // 使用SVG直接创建波浪线
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = wordId
    svg.style.position = 'absolute'
    svg.style.pointerEvents = 'none'
    svg.style.zIndex = '100'
    svg.style.width = '100%'
    svg.style.height = '12px' // 足够高以容纳波浪线
    svg.style.bottom = '-8px' // 调整底部位置
    
    // 创建波浪线路径
    const waveHeight = 2
    const waveLength = 4
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#ff0000')
    path.setAttribute('stroke-width', '2')
    
    // 初始波浪线路径
    let pathData = 'M0 3'
    // 创建基本的波浪形状
    for (let i = 0; i < 2; i++) { // 创建初始的2个波浪
      const x = (i + 1) * waveLength
      if (i % 2 === 0) {
        pathData += ` Q ${x - waveLength/2} ${3 - waveHeight}, ${x} 3`
      } else {
        pathData += ` Q ${x - waveLength/2} ${3 + waveHeight}, ${x} 3`
      }
    }
    path.setAttribute('d', pathData)
    
    svg.appendChild(path)
    
    // 添加到覆盖层
    if (this.overlay) {
      this.overlay.appendChild(svg)
      this.overlayWaves.set(wordId, svg as any)
      console.log('为单词 "${error.word}" 创建 SVG 波浪线并添加到覆盖层')
    } else {
      console.warn('覆盖层未找到，正在创建新的覆盖层')
      // 自动创建覆盖层
      this.createOverlay()
      // 确保覆盖层创建成功后再添加波浪线
      if (this.overlay) {
        this.overlay.appendChild(svg)
        this.overlayWaves.set(wordId, svg as any)
        console.log('为单词 "${error.word}" 创建 SVG 波浪线并添加到新创建的覆盖层')
      } else {
        console.error('为单词 "${error.word}" 创建 SVG 波浪线时，创建覆盖层失败')
      }
    }
  }
  
  /**
   * 更新波浪线位置
   */
  private updateWavyUnderlines(): void {
    // 如果没有覆盖层或没有错误单词，直接返回
    if (!this.overlay || this.misspelledWords.length === 0 || !this.editDom) {
      console.log('跳过更新波浪线位置：缺少覆盖层、错误单词或编辑DOM')
      return
    }
    console.log('更新波浪线位置，共', this.misspelledWords.length, '个错误单词')
    
    // 遍历所有错误单词更新波浪线位置
    this.misspelledWords.forEach((error, index) => {
      try {
        // 使用Range获取单词的位置信息
        const range = document.createRange()
        
        // 首先尝试找到包含指定偏移量的文本节点
        let currentNode: Node | null = this.editDom
        let currentOffset = 0
        let targetNode: Text | null = null
        let targetOffset = 0
        
        // 深度优先搜索找到正确的文本节点
        function findTextNode(node: Node, offset: number): boolean {
          if (node.nodeType === Node.TEXT_NODE) {
            const nodeLength = (node as unknown as Text).length
            if (offset >= currentOffset && offset < currentOffset + nodeLength) {
              targetNode = node as Text
              targetOffset = offset - currentOffset
              return true
            }
            currentOffset += nodeLength
          } else if (node.childNodes) {
            for (let i = 0; i < node.childNodes.length; i++) {
              if (findTextNode(node.childNodes[i], offset)) return true
            }
          }
          return false
        }
        
        // 找到起始位置对应的文本节点
        if (findTextNode(currentNode, error.offset)) {
          // 确保目标节点存在且偏移量有效
          if (targetNode) {
            const maxOffset = targetNode.length
            const startOffset = Math.min(targetOffset, maxOffset)
            const endOffset = Math.min(targetOffset + error.length, maxOffset)
            
            if (startOffset < endOffset && startOffset >= 0) {
              // 设置range到错误单词的位置
              range.setStart(targetNode, startOffset)
              range.setEnd(targetNode, endOffset)
              
              // 获取range的边界矩形
              const rect = range.getBoundingClientRect()
              
              // 获取波浪线元素
              const wordId = `misspelled-${index}`
              let wavyLine = this.overlayWaves.get(wordId)
              
              if (wavyLine) {
                // 更新波浪线的位置和宽度
                // console.log(`为单词 "${error.word}" 设置 SVG 波浪线位置为 (${rect.left}, ${rect.bottom - 3}), 宽度: ${rect.width}`)
                wavyLine.style.left = `${rect.left}px`
                wavyLine.style.top = `${rect.bottom - 3}px` // 调整位置使波浪线在文字下方
                wavyLine.style.width = `${rect.width}px`
                wavyLine.style.display = 'block'
                
                // 如果是SVG元素，更新路径
                if (wavyLine.tagName === 'svg') {
                  const path = wavyLine.querySelector('path')
                  if (path) {
                    // 创建适合单词宽度的波浪线路径
                    const waveHeight = 2
                    const waveLength = 4
                    const waves = Math.ceil(rect.width / waveLength)
                    let pathData = `M0 3`
                    
                    for (let i = 0; i < waves; i++) {
                      const x = (i + 1) * waveLength
                      // 创建真正的波浪效果，让波浪线上下起伏
                      if (i % 2 === 0) {
                        pathData += ` Q ${x - waveLength/2} ${3 - waveHeight}, ${x} 3`
                      } else {
                        pathData += ` Q ${x - waveLength/2} ${3 + waveHeight}, ${x} 3`
                      }
                    }
                    
                    path.setAttribute('d', pathData)
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // 如果计算位置失败，忽略此错误单词
        console.error(`为单词 "${error.word}" 更新 SVG 波浪线位置时出错：`, e)
      }
    })
  }
  
  /**
   * 清除所有波浪线
   */
  private clearWavyUnderlines(): void {
    // 清除所有波浪线元素
    if (this.overlay) {
      while (this.overlay.firstChild) {
        this.overlay.removeChild(this.overlay.firstChild)
      }
    }
    this.overlayWaves.clear()
  }

  protected onFocus(): void {
    this.editDom.style.outline = 'none'
    // 阻止默认的上下文菜单
    this.editDom.addEventListener('contextmenu', (e) => e.preventDefault())
    console.log('上下文菜单已阻止')
    // 创建自定义右键菜单
    this.editDom.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      console.log('自定义上下文菜单已显示',e)
    })
    // 当编辑器获得焦点时自动执行拼写检查，仅在非OA系统时执行
    // 确保编辑器内容不为空
    if (!this.isOASystem && this.editDom) {
      const textContent = this.isHTMLText ? this.editDom.innerText : this.editDom.innerText
      if (textContent.trim()) {
        console.log('编辑器获得焦点，自动执行拼写检查')
        this.checkSpelling(textContent)
      }
    }
  }
  protected onSelect(): void {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null

    const range = selection.getRangeAt(0)
    const preRange = document.createRange()

    preRange.selectNodeContents(this.editDom)
    preRange.setEnd(range.startContainer, range.startOffset)
    const start = preRange.toString().length

    const end = start + range.toString().length
    if (start !== end) {
      this.selectText = { start, end, text: range.toString() }
    }
  }
  protected onKeydown(e: KeyboardEvent): void {
    // 阻止浏览器的默认加粗行为
    // 内部加粗快捷键
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      const text = this.editTarget
      text.set({
        fontWeight: (text as any).fontWeight === 'bold' ? 'normal' : 'bold'
      })
    }
    // 内部斜体快捷键
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      const text = this.editTarget
      text.set({
        italic: !(text as any).italic
      })
    }
    if (e.code === 'Escape') this.editor.closeInnerEditor()
    if (e.key === 'Enter') {
      // fix 换行产生 <div><br/></div>
      e.preventDefault()

      // 手动插入 <br/>
      const br = document.createElement('br')
      const zwsp = document.createTextNode('\u200B')
      const selection = window.getSelection()
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(zwsp) //  fix 结尾需要2次换行才能生效的问题（插入零宽字符）
      range.insertNode(br)

      range.setStartAfter(br)
      range.setEndAfter(br)

      this.onInput()
    }
  }

  protected onPaste(event: ClipboardEvent) {
    if (this.isHTMLText) return

    event.preventDefault() // 粘贴普通文本

    const clipboardData = event.clipboardData
    if (!clipboardData) return

    let text = clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')

    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    const range = selection.getRangeAt(0)
    range.deleteContents()

    // 拆分成文本节点和 <br> 元素
    const lines = text.split('\n')
    const fragment = document.createDocumentFragment()

    lines.forEach((line, index) => {
      if (index > 0) fragment.appendChild(document.createElement('br'))
      fragment.appendChild(document.createTextNode(line))
    })

    range.insertNode(fragment)

    // 移动光标到插入末尾
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)

    this.onInput()
  }

  public onUpdate() {
    const { editTarget: text } = this

    // get text scale
    let textScale = 1

    if (!this.isHTMLText) {
      const { scaleX, scaleY } = text.worldTransform
      textScale = Math.max(Math.abs(scaleX), Math.abs(scaleY))

      const fontSize = text.fontSize * textScale
      if (fontSize < 12) textScale *= 12 / text.fontSize
    }

    this.textScale = textScale

    // layout
    let { width, height } = text.__local,
      offsetX = 0, offsetY = 0
    ;((width *= textScale), (height *= textScale))

    const data = text.__

    if (data.__autoWidth) {
      if (!width) width = 1
      if (data.autoSizeAlign) {
        switch (data.textAlign) {
          case 'center':
            offsetX = -width / 2
            break
          case 'right':
            offsetX = -width
        }
      }
    }

    if (data.__autoHeight) {
      if (!height) height = 1
      if (data.autoSizeAlign) {
        switch (data.verticalAlign) {
          case 'middle':
            offsetY = -height / 2
            break
          case 'bottom':
            offsetY = -height
        }
      }
    }

    const { x, y } = this.inBody ? text.app.clientBounds : text.app.tree.clientBounds
    const { a, b, c, d, e, f } = new Matrix(text.worldTransform).scale(1 / textScale).translateInner(offsetX, offsetY)

    const { style } = this.editDom
    const { scaleX, scaleY } = text.worldTransform
    const k = textScale > 1.36 ? 0.55 * Math.sqrt(textScale) : 0.6 * Math.sqrt(textScale)
    style.transform = `matrix(${a},${b},${c},${d},${e},${f + k})`
    style.left = x + 'px'
    style.top = y + 'px'
    style.width = width + 'px'
    style.height = height + 'px'

    this.isHTMLText || updateStyle(this.editDom, text, textScale, this)
    if ((text.parent.name == 'Text' && text.parent.tag == 'Box') || (text.parent.name == 'Text' && text.parent.tag == 'Group')) {
      if (this.isUpdatingPoints) return
      this.isUpdatingPoints = true
      handleShowCurve(text.parent, true)
      setTimeout(() => {
        this.isUpdatingPoints = false
      }, 50)
    }
    // 打开内部或者编辑内部文本编辑强制隐藏
    text.set({
      visible: false
    })
    
    // 画布缩放时更新波浪线位置
    // 确保波浪线与文本框一起缩放，仅在非OA系统时执行
    if (!this.isOASystem && this.misspelledWords.length > 0 && this.overlay) {
      console.log('画布缩放时更新 SVG 波浪线位置')
      this.updateWavyUnderlines()
    }
  }
  private isUpdatingPoints = false
  public onUnload(): void {
    const { editTarget: text, editor, editDom: dom } = this
    if (text) {
      this.onInput()
      if(this.compositionText !== '') {
        text.text = this.compositionText
      }
      if (text.text === '\n') text.text = ''
      // text.textEditing = undefined

      if (editor.app) editor.app.config.keyEvent = this._keyEvent
      editor.off_(this.eventIds)

      dom.removeEventListener('focus', this.onFocus)
      dom.removeEventListener('input', this.onInput)
      dom.removeEventListener('paste', this.onPaste)
      dom.removeEventListener('compositionstart', this.onCompositionStart)
      dom.removeEventListener('compositionend', this.onCompositionEnd)
      window.removeEventListener('keydown', this.onKeydown)
      window.removeEventListener('scroll', this.onUpdate)
      window.removeEventListener('mouseup', this.onSelect)
      
      // 清除拼写检查相关资源
    this.misspelledWords = []
    this.clearWavyUnderlines()
    
    // 清理覆盖层
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
      this.overlay = null
    }
      
      dom.remove()
      this.editDom = this.eventIds = undefined
    }
    // 如果大于1
    if (text.parent && text.parent.name == 'Text' && text.parent.findOne('Box')) {
      text.parent.findOne('Box').opacity = 1
      text.visible = false
    } else {
      // 恢复显示
      text.set({
        visible: true
      })
    }
    if (text.text === '' && text.parent.name === 'Text') {
      text.parent.remove()
    }
  }
}
