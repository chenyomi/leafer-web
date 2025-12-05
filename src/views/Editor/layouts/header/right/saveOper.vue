<template>
  <a-space class="mr-5">
    <a-button @click="preview()" style="background: #ffffff; border: var(--chakra-border)">
      <template #icon>
        <icon-eye />
      </template>
      预览
    </a-button>
    <a-button type="primary" @click="save()">
      <template #icon>
        <icon-save />
      </template>
      保存
    </a-button>
    <a-dropdown-button type="primary" @select="handleSelect" @click="handleDownload()">
      <icon-download class="m-r-8px" />下载作品
      <template #icon>
        <icon-down />
      </template>
      <template #content>
        <a-doption value="json">另存为JSON</a-doption>
      </template>
    </a-dropdown-button>
  </a-space>
  <a-image-preview :src="previewUrl" v-model:visible="visiblePreview" />
  <a-modal v-model:visible="exportVisible" title="下载作品" @ok="handleExport()" width="600px" :top="50" :align-center="false">
    <a-form ref="formRef" :model="exportForm" :rules="rules">
      <a-form-item field="fileType" label="导出文件类型">
        <a-radio-group v-model="exportForm.fileType" type="button" :options="exportFileTypes"></a-radio-group>
      </a-form-item>
      <a-form-item field="quality" label="图片质量" v-if="['jpg', 'webp'].includes(exportForm.fileType)">
        <a-space>
          <a-radio-group v-model="exportForm.quality" type="button" :options="scQtaRate"></a-radio-group>
          <a-input-number
            v-model="exportForm.quality"
            mode="button"
            style="width: 120px"
            :max="1"
            :step="0.1"
            :min="0.1"
            placeholder="1"
          ></a-input-number>
        </a-space>
      </a-form-item>
      <a-form-item field="scale" label="缩放比例" extra="可用于生成小尺寸的缩略图">
        <a-space>
          <a-radio-group v-model="exportForm.scale" type="button" :options="scQtaRate"></a-radio-group>
          <a-input-number
            v-model="exportForm.scale"
            mode="button"
            style="width: 120px"
            :max="1"
            :step="0.1"
            :min="0.1"
            placeholder="1"
          ></a-input-number>
        </a-space>
      </a-form-item>
      <a-form-item field="pixelRatio" label="像素比" extra="可导出适配高清屏的2倍图、3倍图">
        <a-input-number v-model="exportForm.pixelRatio" allow-clear hide-button style="width: 200px" placeholder="默认为1倍图">
          <template #suffix> 倍 </template>
        </a-input-number>
      </a-form-item>
      <a-form-item field="isTansparent" label="是否透明背景">
        <a-switch type="round" v-model="isTansparent">
          <template #checked> 是 </template>
          <template #unchecked> 否 </template>
        </a-switch>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { useEditor } from '@/views/Editor/app'

const { editor, keybinding, canvas, workspaces } = useEditor()
import { downFile } from '@/utils/designUtil.js'
import { v4 as uuidv4 } from 'uuid'
import { Notification } from '@arco-design/web-vue'
import { canvasApi } from '@/api/save/canvas'
import alovaInstance from '@/utils/request'
import { useUploader } from 'alova/client'
import { useUserStore } from '@/store/modules/user'
import { Message } from '@arco-design/web-vue'

const userStore = useUserStore()
const visiblePreview = ref(false)
const previewUrl = ref()
const isTansparent = ref(false)
const exportFileTypes = reactive([
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WEBP' }
])
const scQtaRate = reactive([
  { value: 1, label: '正常' },
  { value: 0.7, label: '0.7倍' },
  { value: 0.5, label: '0.5倍' },
  { value: 0.3, label: '0.3倍' },
  { value: 0.1, label: '0.1倍' }
])
const exportVisible = ref(false)
const exportForm = ref({
  fileType: 'jpg',
  quality: 1,
  scale: 1,
  pixelRatio: 1,
  trim: false
})
const rules = {}
const resetForm = () => {
  exportForm.value = {
    fileType: 'jpg',
    quality: 1,
    scale: 1,
    pixelRatio: 1,
    trim: false
  }
}
const preview = async () => {
  const result = await editor.contentFrame.export('png', { blob: true })
  const url = URL.createObjectURL(result.data)
  previewUrl.value = url
  visiblePreview.value = true
}
const save = () => {
  Notification.info({
    closable: true,
    content: '请到控制台查看打印的JSON值'
  })
  console.log('多页面JSON：', editor.getPages())
  editor.getCurrentPage()
  console.log(editor.getCurrentPage(), '---editor.getCurrentPage()')
  console.log(editor.contentFrame, '---editor.contentFrame')

  let json = editor.contentFrame.toJSON()
  console.log('当前页JSON：', json)
}

const handleDownload = () => {
  resetForm()
  exportVisible.value = true
}

// 导出
const handleExport = async () => {
  let fileName = uuidv4()
  if (isTansparent.value) {
    exportForm.value.fill = 'transparent'
    exportForm.value.fileType = 'png'
  }
  editor.contentFrame.export(`${fileName}.${exportForm.value.fileType}`, exportForm.value)
  console.log(exportForm.value, '---exportForm.value')
}

const handleSelect = (v) => {
  let fileName = uuidv4()
  switch (v) {
    case 'png':
      editor.contentFrame.export(fileName + '.png')
      break
    case 'jpg':
      editor.contentFrame.export(fileName + '.jpg')
      break
    case 'webp':
      editor.contentFrame.export(fileName + '.webp')
      break
    case 'json':
      saveJson()
      break
    default:
      editor.contentFrame.export(fileName + '.jpg')
      break
  }
}
async function saveJson() {
  return
  // 获取画布上传地址与画布 id
  const saveInfo = (await canvasApi.getCanvasUploadUrl(
    '1943592763522187300',
    userStore.userInfo.userId,
    userStore.userInfo.userId,
    editor.contentFrame.data.pageId
  )) as { pageId: string; presignList: { url: string; fileExtension: string }[] }

  console.log(saveInfo, '---saveInfo')
  editor.setPageId(saveInfo.pageId)

  const jsonUplod = saveInfo.presignList.find((item) => item.fileExtension === '.json')
  const coverUplod = saveInfo.presignList.find((item) => item.fileExtension === '.png')

  // 获取画布JSON数据
  const dataUrl = editor.contentFrame.toJSON()
  const jsonData = JSON.stringify(dataUrl, null, '\t')

  // 生成PNG图片
  const result = await editor.contentFrame.export('png', {
    blob: true,
    pixelRatio: 3
  })

  try {
    // 同时触发两个上传接口
    await Promise.all([canvasApi.uploadToServer(jsonUplod.url, jsonData, true), canvasApi.uploadToServer(coverUplod.url, result.data)])

    console.log('JSON和封面都上传成功')
  } catch (e) {
    console.error('上传失败:', e)
    throw new Error('上传失败')
  }

  try {
    await canvasApi.uploadCallback('1943592763522187300', userStore.userInfo.userId, userStore.userInfo.userId, editor.contentFrame.data.pageId)
    Message.success('保存成功')
  } catch (e) {
    new Error('上传失败')
  }

  try {
    await canvasApi.getCanvasPage('1943592763522187300', userStore.userInfo.userId, userStore.userInfo.userId, editor.contentFrame.data.pageId)
  } catch (e) {
    new Error('保存失败')
  }
}
</script>

<style scoped></style>
