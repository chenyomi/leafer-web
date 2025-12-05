<template>
  <div class="collect-box">
    <!-- <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search> -->
    <div class="collect-list mt10px">
      <div class="tag-list flex align-center justify-between">
        <div
          class="tag-item"
          v-for="(item, index) in tagList"
          :key="index"
          :class="activeTag === item.id ? 'tag-active' : ''"
          @click="handleTagClick(item.id)"
        >
          {{ item.name }}
          <div class="tag-line" v-if="activeTag === item.id"></div>
        </div>
      </div>
      <div class="upload mt18px">
        <div class="upload-box flex justify-center" @click="$refs.fileInput.click()">
          <ali-icon type="icon-upload" :size="24" style="color: #ffffff" class="upload-icon" />
          <div class="upload-text ml10px">Upload</div>
        </div>
        <div class="upload-tips mt10px">Support：PNG/JPEG/SVG Max:10MB</div>
        <input v-show="false" ref="fileInput" type="file" @change="handleUpload" accept="image/*" multiple />
      </div>
      <div class="upload-list-box">
        <!-- 个人上传 -->
        <div class="upload-list mt10px" v-if="activeTag === 1">
          <div
            class="upload-item"
            v-for="(item, index) in uploadList"
            :key="index"
            @mouseenter="handleMouseEnter(item)"
            @mouseleave="handleMouseLeave"
          >
            <drag-item :url="item.url" :name="item.name" :id="item.id" :width="75" :height="75" />
            <div class="upload-delete" @click="handleDelete(item)">
              <img src="@/assets/images/close-btn.png" alt="" />
            </div>
          </div>
          <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" :top="165" :right="-125" />
        </div>
        <!-- 团队上传 -->
        <div class="upload-list mt10px" v-if="activeTag === 2">
          <div class="upload-item" v-for="(item, index) in teamList" :key="index" @mouseenter="handleMouseEnter(item)" @mouseleave="handleMouseLeave">
            <drag-item :url="item.url" :name="item.name" :id="item.id" :width="75" :height="75" />
            <div class="upload-delete" @click="handleDelete(item)">
              <img src="@/assets/images/close-btn.png" alt="" />
            </div>
          </div>
          <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" :top="165" :right="-125" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import dragItem from './dragItem.vue'
import img from '@/assets/images/upload-img.png'
import hoverPreview from '@/components/hoverPreview/hoverPreview.vue'
import emitter from '@/utils/eventBus'
import { setPainterUploadInstance } from '@/views/Editor/app/editor/clipboard'

const searchValue = ref('') //搜索内容

//搜索
const handleSearch = (value: string) => {
  console.log(value)
}

const tagList = ref([
  {
    name: 'Personal',
    id: 1
  },
  // {
  //   name: 'Teams',
  //   id: 2
  // }
])

const activeTag = ref(1)
const handleTagClick = (id: number) => {
  activeTag.value = id
}

//图片列表
const originalList = []
const uploadList = ref([]) //个人上传列表
const originalTeamList = []
const teamList = ref([]) //团队上传列表

onMounted(() => {
  // loadImages();
  loadPersonalImages()
  loadTeamImages()
  
  // 注册当前组件实例到 clipboard.ts，用于复制图片后更新视图
  const instance = getCurrentInstance()
  if (instance) {
    setPainterUploadInstance({
      updateView: async () => {
        await loadPersonalImages()
        await loadTeamImages()
      }
    })
  }
})

/**
 * 组件卸载时清理实例引用
 */
onUnmounted(() => {
  setPainterUploadInstance(null)
})


const isShowPreview = ref(false) //是否显示预览
const currentIcon = ref('') //当前预览图片
const currentName = ref('Cell Name') //当前预览名称
const handleMouseEnter = (item: any) => {
  isShowPreview.value = true
  currentIcon.value = item.url
  currentName.value = item.name
}
const handleMouseLeave = () => {
  isShowPreview.value = false
}

const boardId = localStorage.getItem('dashboardId')  //获取当前画板id
console.log(boardId,'boardId')
/*
 * 上传图片相关
 */
import { useEditor } from '@/views/Editor/app'

interface ImageRecord {
  id?: number
  url: string
  boardId: string
  /**
   * 文件名（已去除扩展名）。
   * 可选字段，旧数据可能不存在。
   */
  name?: string
}

const loadPersonalImages = async () => {
  const { DB } = useEditor()
  const images = await DB.table<ImageRecord>('painter_personal').toArray()
  // const images2 = await DB.table<ImageRecord>('painter').toArray()
  console.log(images,'images')
  uploadList.value = [
    ...images
      .reverse()
      .map((img: ImageRecord) => ({ id: img.id, name: img.name || 'Image', url: img.url, boardId: img.boardId }))
      .filter((item: any) => item.boardId === boardId),
    // ...images2.reverse().map((img: any) => ({ name: 'painter_personal', url: img.url }))
  ]
}

const loadTeamImages = async () => {
  const { DB } = useEditor()
  const images = await DB.table<ImageRecord>('painter_team').toArray()
  teamList.value = [
    ...images.map((img: ImageRecord) => ({ id: img.id, name: img.name || 'Image', url: img.url, boardId: img.boardId })).filter((item: any) => item.boardId === boardId) // 转换为对象形式
  ]
}
const handleUpload = (event: Event) => {
  if (activeTag.value === 1) {
    handlePersonalUpload(event)
  } else {
    handleTeamUpload(event)
  }
}
//个人上传
/**
 * 去掉文件名末尾的 `.svg` 扩展名（不区分大小写）。
 * 仅移除末尾扩展，不影响中间的 `.svg`。
 * @param {string} name - 原始文件名，例如 `意-肿瘤细胞 (5).svg`
 * @returns {string} 移除末尾 `.svg` 后的文件名，例如 `意-肿瘤细胞 (5)`
 */
const removeSvgExt = (name: string): string => {
  return name.replace(/\.svg$/i, '')
}
/**
 * 个人上传：支持一次选择最多 10 张，上传完成后清空 input 值，允许再次选择同一文件触发 change。
 * @param {Event} event - 文件输入的 change 事件
 * @returns {Promise<void>} 无返回值
 */
const handlePersonalUpload = async (event: Event): Promise<void> => {
  const inputEl = event.target as HTMLInputElement
  const files = inputEl.files
  console.log(files, '---files')

  if (!files || files.length === 0) return

  // 限制最多上传10张图片
  const MAX_UPLOAD = 10
  const filesToProcess = Array.from(files).slice(0, MAX_UPLOAD)

  if (files.length > MAX_UPLOAD) {
    // Message.warning({
    //   content: `最多只能上传${MAX_UPLOAD}张图片`,
    //   duration: 3000,
    // });
  }

  // 处理每个文件
  for (const file of filesToProcess) {
    /** 文件名（移除末尾 .svg 扩展，大小写不敏感） */
    const fileName = removeSvgExt(file.name)
    const reader = new FileReader()
    await new Promise<void>((resolve) => {
      reader.onload = async (e) => {
        if (e.target?.result) {
          // 将文件名一并存入记录（Dexie 允许存储未索引字段）
          const { DB } = useEditor()
          await DB.table<ImageRecord>('painter_personal').add({ url: e.target.result as string, boardId: boardId || '', name: fileName })
          resolve()
        }
      }
      reader.readAsDataURL(file)
    })
  }

  await loadPersonalImages()
  // 关键：清空 input 的值，避免选择同一文件不触发 change
  inputEl.value = ''
}

/**
 * 团队上传：上传完成后清空 input 值，允许再次选择同一文件触发 change。
 * @param {Event} event - 文件输入的 change 事件
 * @returns {Promise<void>} 无返回值
 */
const handleTeamUpload = async (event: Event): Promise<void> => {
  const inputEl = event.target as HTMLInputElement
  const files = inputEl.files
  if (files && files.length > 0) {
    const file = files[0]
    /** 文件名（移除末尾 .svg 扩展，大小写不敏感） */
    const fileName = removeSvgExt(file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      if (e.target?.result) {
        const { DB } = useEditor()
        await DB.table<ImageRecord>('painter_team').add({ url: e.target.result as string, boardId: boardId || '', name: fileName })
        await loadTeamImages()
        // 关键：清空 input 的值，避免选择同一文件不触发 change
        inputEl.value = ''
      }
    }
    reader.readAsDataURL(file)
  }
}

/**
 * 删除素材：从当前标签对应的列表与本地缓存（Dexie）移除。
 * - 个人上传：表 `painter_personal`
 * - 团队上传：表 `painter_team`
 * 删除优先按 `id` 进行；若缺少 `id`，回退到 `url + boardId` 匹配。
 * @param {ImageRecord} item - 要删除的图片项，至少需要包含 `url` 与 `boardId`。
 * @returns {Promise<void>} 无返回值；删除完成后会同步更新对应的列表。
 */
const handleDelete = async (item: ImageRecord): Promise<void> => {
  try {
    const { DB } = useEditor()
    const currentBoardId = boardId || ''
    const tableName = activeTag.value === 1 ? 'painter_personal' : 'painter_team'

    // 删除 Dexie 中匹配的记录（优先按 id）
    if (typeof item.id === 'number') {
      await DB.table<ImageRecord>(tableName).delete(item.id)
    } else {
      await DB
        .table<ImageRecord>(tableName)
        .where('url')
        .equals(item.url)
        .and((rec) => rec.boardId === currentBoardId)
        .delete()
    }

    // 删除后主动关闭预览（删除不会触发 mouseleave 导致预览残留）
    if (isShowPreview.value) {
      isShowPreview.value = false
      if (currentIcon.value === item.url) {
        currentIcon.value = ''
        // currentName.value = 'Cell Name'
      }
    }

    // 同步更新内存列表，避免用户感知延迟
    if (activeTag.value === 1) {
      uploadList.value = uploadList.value.filter((it: any) => it.id !== item.id)
      await loadPersonalImages()
    } else {
      teamList.value = teamList.value.filter((it: any) => it.id !== item.id)
      await loadTeamImages()
    }
  } catch (err) {
    console.error('删除图片失败：', err)
  }
}

// 粘贴图片更新视图方法
const updateView = async () => {
  await loadPersonalImages()
  await loadTeamImages()
}
// 暴露方法给别的组件调用
defineExpose({
  updateView
})
</script>

<style lang="less" scoped>
.tag-list {
  padding: 0 20px;
  .tag-item {
    font-size: 16px;
    color: #000000;
    cursor: pointer;
    position: relative;
  }
  .tag-active {
    font-weight: bold;
    color: var(--audit-color);
  }
  .tag-line {
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 4px;
    background: var(--audit-color);
    border-radius: 5px;
  }
}
.upload {
  width: 100%;
}
.upload-box {
  width: 100%;
  height: 38px;
  border-radius: 10px;
  background: var(--audit-color);
  align-items: center;
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
  .upload-text {
    font-size: 20px;
    font-weight: bold;
    color: #ffffff;
  }
}
.upload-tips {
  font-size: 10px;
  color: #6b6b6b;
  text-align: center;
}
.upload-list-box {
  overflow-y: auto;
  height: calc(100vh - 300px);
  width: 320px;
}
.upload-list-box::-webkit-scrollbar {
  display: none;
}
.upload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  overflow: visible;
  .upload-item {
    width: 90px;
    height: 90px;
    background: #f5f5f5;
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid #eaeaea;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    position: relative;
    overflow: visible;
    z-index: 0;
    &:hover {
      z-index: 10; 
     .upload-delete {
      display: block;
     }
    }
    .upload-img {
      width: 50px;
      height: 50px;
    }
    .upload-delete{
      position: absolute;
      right: -6px; // 保持负偏移，按钮出现在右上角外侧
      top: -6px;  // 保持负偏移，按钮出现在右上角外侧
      z-index: 100;
     display: none; // 默认隐藏删除按钮，避免界面拥挤
      img{
        width: 16px;
        height: 16px;
        display: block; // 避免行内元素基线导致可视区域异常
      }
    }
  }
}
</style>
