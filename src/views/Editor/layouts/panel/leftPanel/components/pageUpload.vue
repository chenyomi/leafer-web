<template>
  <div class="collect-box">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
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
            <drag-item :url="item.url" :width="75" :height="75" />
          </div>
          <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" :top="165" :right="-125" />
        </div>
        <!-- 团队上传 -->
        <div class="upload-list mt10px" v-if="activeTag === 2">
          <div class="upload-item" v-for="(item, index) in teamList" :key="index" @mouseenter="handleMouseEnter(item)" @mouseleave="handleMouseLeave">
            <drag-item :url="item.url" :width="75" :height="75" />
          </div>
          <hoverPreview :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName" :top="165" :right="-125" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import dragItem from './dragItem.vue'
import img from '@/assets/images/upload-img.png'
import hoverPreview from '@/components/hoverPreview/hoverPreview.vue'
import {useEditor} from '@/views/Editor/app'
const { DB } = useEditor()
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
  {
    name: 'Teams',
    id: 2
  }
])

const activeTag = ref(1)
const handleTagClick = (id: number) => {
  activeTag.value = id
}

//图片列表
const originalList = []
const uploadList = ref([]) //个人上传列表
const originalTeamList = [
  {
    name: '1',
    url: img
  },
  {
    name: '2',
    url: img
  },
  {
    name: '3',
    url: img
  },
  {
    name: '4',
    url: img
  },
  {
    name: '5',
    url: img
  },
  {
    name: '6',
    url: img
  },
  {
    name: '7',
    url: img
  },
  {
    name: '8',
    url: img
  },
  {
    name: '9',
    url: img
  }
]
const teamList = ref([...originalTeamList]) //团队上传列表

onMounted(() => {
  // loadImages();
  loadPersonalImages()
  loadTeamImages()
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
/*
 * 上传图片相关
 */
interface ImageRecord {
  id?: number
  url: string
}

const loadPersonalImages = async () => {
  const images = await DB.table<ImageRecord>('images_personal').toArray()
  const images2 = await DB.table<ImageRecord>('images').toArray()

  uploadList.value = [
    // ...originalList,
    ...images.reverse().map((img: any) => ({ name: 'Image', url: img.url })),
    ...images2.reverse().map((img: any) => ({ name: 'images_personal', url: img.url }))
  ]
}

const loadTeamImages = async () => {
  const images = await DB.table<ImageRecord>('images_team').toArray()
  teamList.value = [
    ...originalTeamList,
    ...images.map((img: any) => ({ name: 'Image', url: img.url })) // 转换为对象形式
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
const handlePersonalUpload = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files
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
    const reader = new FileReader()
    await new Promise<void>((resolve) => {
      reader.onload = async (e) => {
        if (e.target?.result) {
          await DB.table<ImageRecord>('images_personal').add({ url: e.target.result as string })
          resolve()
        }
      }
      reader.readAsDataURL(file)
    })
  }

  await loadPersonalImages()
}

//团队上传
const handleTeamUpload = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length > 0) {
    const file = files[0]
    const reader = new FileReader()
    reader.onload = async (e) => {
      if (e.target?.result) {
        await DB.table<ImageRecord>('images_team').add({ url: e.target.result as string })
        await loadTeamImages()
      }
    }
    reader.readAsDataURL(file)
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
    color: var(--primary-color);
  }
  .tag-line {
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 100%;
    height: 4px;
    background: var(--primary-color);
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
  background: #1ca6c5;
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
    &:hover {
      // border: 1px solid var(--primary-color);
      .upload-img {
        transform: scale(1.1);
      }
    }
    .upload-img {
      width: 50px;
      height: 50px;
    }
  }
}
</style>
