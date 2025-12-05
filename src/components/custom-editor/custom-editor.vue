<template>
  <div style="border: 1px solid #ccc;height: 180px !important;">
    <Toolbar style="border-bottom: 1px solid #ccc;" :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" />
    <Editor style="height: 138px; overflow-y: hidden;border-bottom: 1px solid #ccc" v-model="valueHtml"
      :defaultConfig="editorConfig" :mode="mode" @onCreated="handleCreated" />
  </div>
</template>

<script>
import '@wangeditor/editor/dist/css/style.css' // 引入 css

import { onBeforeUnmount, ref, shallowRef, onMounted } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

export default {
  components: { Editor, Toolbar },
  setup () {
    // 编辑器实例，必须用 shallowRef
    const editorRef = shallowRef()

    // 内容 HTML
    const valueHtml = ref('<p>hello</p>')

    // 模拟 ajax 异步获取内容
    onMounted(() => {
      setTimeout(() => {
        valueHtml.value = '<p>please enter your description</p>'
      }, 1500)
    })

    //自定义配置需要显示的菜单
    const toolbarConfig = {
      toolbarKeys: ['bold', 'italic', 'insertLink', 'bulletedList', 'numberedList']
    }
    const editorConfig = { placeholder: '请输入内容...' }

    // 组件销毁时，也及时销毁编辑器
    onBeforeUnmount(() => {
      const editor = editorRef.value
      if (editor == null) return
      editor.destroy()
    })

    const handleCreated = (editor) => {
      editorRef.value = editor // 记录 editor 实例，重要！
    }

    return {
      editorRef,
      valueHtml,
      mode: 'default', // 或 'simple'
      toolbarConfig,
      editorConfig,
      handleCreated,
    }
  },
}
</script>

<style scoped lang="less">
:deep(.w-e-text-container) {
  height: 140px !important;
}

:deep(.w-e-modal) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 1000 !important;
}
</style>