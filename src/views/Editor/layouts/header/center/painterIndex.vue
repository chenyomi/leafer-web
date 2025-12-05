<template>
  <div class="flex items-center justify-between middle-menu">
    <template v-if="isShow">
      <!-- 文本 -->
      <div class="middle-menu-item flex items-center">
        <div class="flex items-center" @click="textOpen = !textOpen" ref="textOpenRef">
          <ali-icon
            type="icon-test2"
            :size="20"
            style="color: #6b6b6b"
            :class="{ 'text-active': textOpen }"
            :style="{ color: textOpen ? themeColor : '#6b6b6b' }"
          ></ali-icon>
          <icon-down
            style="color: #6b6b6b; margin-left: 0px"
            :size="10"
            :class="{ 'text-active': textOpen }"
            :style="{ color: textOpen ? themeColor : '#6b6b6b' }"
          />
        </div>
        <div class="menu-box menu-box1" v-if="textOpen">
          <div class="menu-box-item" v-for="item in textMenu" :key="item.name" @click="textClick(item.name)">
            {{ item.name }}{{ item.size }}
          </div>
        </div>
      </div>
      <!-- 图形 -->
      <div class="middle-menu-item flex items-center">
        <div class="flex items-center current-active" @click="graphicOpen = !graphicOpen" ref="graphicOpenRef">
          <ali-icon
            type="icon-Shapes_"
            :size="20"
            style="color: #6b6b6b"
            :class="{ 'text-active': graphicOpen || activeTool === 'graphic' }"
            :style="{ color: graphicOpen || activeTool === 'graphic' ? themeColor : '#6b6b6b' }"
          ></ali-icon>
          <icon-down
            style="color: #6b6b6b; margin-left: 0px"
            :size="10"
            :class="{ 'text-active': graphicOpen || activeTool === 'graphic' }"
            :style="{ color: graphicOpen || activeTool === 'graphic' ? themeColor : '#6b6b6b' }"
          />
        </div>
        <div class="menu-box graphic-box" v-if="graphicOpen">
          <template v-for="item in uniquegGraphic" :key="item.json.name">
            <div v-if="item.name" class="graphic-box-name" :style="{ color: themeColor }">{{ item.name }}</div>
            <div class="graphic-box-item" @click="graphicClick(item.json)">
              <ali-icon :type="item.icon" :size="item.size" style="stroke: none"></ali-icon>
            </div>
          </template>
        </div>
      </div>

      <!-- 线段 -->
      <div class="middle-menu-item flex items-center cursor-pointer">
        <div class="flex items-center" @click="shapeChange" ref="shapeOpenRef">
          <ali-icon
            type="icon-xianduan"
            :size="22"
            style="color: #6b6b6b"
            :class="{ 'text-active': shapeOpen }"
            :style="{ color: shapeOpen ? themeColor : '#6b6b6b' }"
          ></ali-icon>
          <icon-down
            style="color: #6b6b6b; margin-left: 0px"
            :size="10"
            :class="{ 'text-active': shapeOpen }"
            :style="{ color: shapeOpen ? themeColor : '#6b6b6b' }"
          />
        </div>
        <div class="menu-box graphic-box" v-if="shapeOpen">
          <template v-for="item in uniquegLine" :key="item.json.name">
            <div v-if="item.name" class="graphic-box-name" :style="{ color: themeColor }">{{ item.name }}</div>
            <div class="graphic-box-item" @click="shapeClick(item)">
              <ali-icon :type="item.icon" :size="item.size" style="stroke: none"></ali-icon>
            </div>
          </template>
        </div>
      </div>
      <!-- 画笔 -->
      <div class="middle-menu-item flex items-center">
        <div class="flex items-center" @click="penChange" ref="penOpenRef">
          <ali-icon
            type="icon-mingcute_pen-line"
            :size="20"
            :class="{ 'text-active': penOpen }"
            :style="{ color: penOpen ? themeColor : '#6b6b6b' }"
          ></ali-icon>
          <icon-down
            style="color: #6b6b6b; margin-left: 0px"
            :size="10"
            :class="{ 'text-active': penOpen }"
            :style="{ color: penOpen ? themeColor : '#6b6b6b' }"
          />
        </div>
        <div class="menu-box menu-box3" v-if="penOpen">
          <template v-for="item in penMenu" :key="item.name">
            <div class="menu-box-item flex items-center justify-between" @click="penClick(item)">
              <div class="flex items-center">
                <ali-icon :type="item.icon" :size="20" />
                <span class="ml13px item-title">{{ item.name }}</span>
              </div>
              <div class="flex items-center">
                <!-- <span class="item-title">{{ item.hotkey }}</span> -->
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
    <!-- 评论 -->
    <div class="middle-menu-item flex items-center">
      <div class="flex items-center" @click="handleCommentOpen" ref="commentOpenRef">
        <ali-icon
          type="icon-msg"
          :size="24"
          style="color: #6b6b6b"
          :class="{ 'text-active': commentOpen }"
          :style="{ color: commentOpen ? themeColor : '#6b6b6b' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SvgIcon from '@/components/svgIcon'
import { useClickBlank } from '@/hooks/useClickBlank'
import { useAppStore } from '@/store'
import { usePainterRole } from '@/hooks/usePainterRole'
import { UI } from 'leafer-ui'
import { useEditor } from '@/views/Editor/app'
import { graphic, line } from './data'
import '@/components/ShapeLine/index'
import { useRoleTheme } from '@/hooks/useRoleTheme'
const { themeColor } = useRoleTheme()
import { useMaterialType } from '@/hooks/useMaterialType'

// 调用素材类型hooks
const { isShow } = useMaterialType()

const { activeTool, textType, graphicType } = storeToRefs(useAppStore())

const { editor } = useEditor()

const textOpen = ref(false)
const graphicOpen = ref(false)
const shapeOpen = ref(false)
const penOpen = ref(false)
const commentOpen = ref(false)

const { isPainterRole } = usePainterRole()
console.log(isPainterRole.value)

const uniquegGraphic = computed(() => {
  const map: any = []
  for (const item of graphic.children) {
    if (!map.includes(item.name)) {
      map.push(item.name)
    } else {
      item.name = null
    }
  }
  return [...graphic.children]
})

const uniquegLine = computed(() => {
  const map: any = []
  // 获取需要处理的children数组
  let children = line.children

  // 如果是画师角色，过滤掉下标为1和10的元素
  if (isPainterRole.value) {
    children = line.children.filter((item: any, index: number) => {
      return index !== 1 && index !== 10
    })
  }

  for (const item of children) {
    if (!map.includes(item.name)) {
      map.push(item.name)
    } else {
      item.name = null
    }
  }
  return [...children]
})

console.log(uniquegLine.value)

//文本菜单
const textMenu = ref([
  {
    name: 'Citation',
    size: ' (9pt)'
  },
  {
    name: 'Text',
    size: ' (12pt)'
  },
  {
    name: 'Subheading',
    size: ' (16pt)'
  },
  {
    name: 'Heading',
    size: ' (20pt)'
  }
])
//选择文本类型
const textClick = (name: string) => {
  textOpen.value = false
  switch (name) {
    case 'Citation':
      activeTool.value = 'text'
      textType.value = 'Citation'
      break
    case 'Text':
      activeTool.value = 'text'
      textType.value = 'Text'
      break
    case 'Subheading':
      activeTool.value = 'text'
      textType.value = 'Subheading'
      break
    case 'Heading':
      activeTool.value = 'text'
      textType.value = 'Heading'
      break
  }
}
//选择文本类型
const graphicClick = (json: any) => {
  graphicOpen.value = false
  activeTool.value = 'graphic'
  graphicType.value = json
}
const textOpenRef = ref<HTMLElement | null>(null)
useClickBlank([textOpenRef, '.menu-box'], () => {
  textOpen.value = false
})
const graphicOpenRef = ref<HTMLElement | null>(null)
useClickBlank([graphicOpenRef, '.menu-box'], () => {
  graphicOpen.value = false
})
const shapeOpenRef = ref<HTMLElement | null>(null)
useClickBlank([shapeOpenRef, '.menu-box'], () => {
  shapeOpen.value = false
})
const penOpenRef = ref<HTMLElement | null>(null)
useClickBlank([penOpenRef, '.menu-box'], () => {
  penOpen.value = false
})
const commentOpenRef = ref<HTMLElement | null>(null)
// useClickBlank([commentOpenRef],() => {
//     commentOpen.value = false
// })

//形状菜单对象
const shapeMenu = ref([
  {
    name: 'line',
    icon: 'Line1',
    iconActive: 'Line1-active',
    // hotkey: 'L',
    json: {
      tag: 'Line',
      x: 100,
      y: 100,
      width: 100,
      rotation: 0,
      fill: '',
      stroke: '#000000',
      strokeWidth: 2,
      draggable: true,
      editable: true
    }
  }
  // {
  //   name: 'Rectangle',
  //   icon: 'rectangel',
  //   iconActive: 'rectangel-active',
  //   // hotkey: 'R',
  //   json: {
  //     tag: 'Rect',
  //     x: 100,
  //     y: 100,
  //     width: 100,
  //     height: 100,
  //     rotation: 0,
  //     fill: '',
  //     stroke: '#000000',
  //     strokeWidth: 2,
  //     draggable: true,
  //     editable: true
  //   }
  // },
  // {
  //   name: 'Polygon',
  //   icon: 'palygon',
  //   iconActive: 'palygon-active',
  //   json: {
  //     tag: 'Polygon',
  //     x: 100,
  //     y: 100,
  //     width: 100,
  //     height: 100,
  //     rotation: 0,
  //     fill: '',
  //     stroke: '#000000',
  //     strokeWidth: 2,
  //     sides: 3,
  //     draggable: true,
  //     editable: true
  //   }
  // },
  // {
  //   name: 'Ellipse',
  //   icon: 'ellips',
  //   iconActive: 'ellips-active',
  //   // hotkey: 'O',
  //   json: {
  //     tag: 'Ellipse',
  //     x: 100,
  //     y: 100,
  //     width: 100,
  //     height: 100,
  //     rotation: 0,
  //     fill: '',
  //     stroke: '#000000',
  //     strokeWidth: 2,
  //     draggable: true,
  //     editable: true
  //   }
  // },
  // {
  //   name: 'Arrow',
  //   icon: 'Arrow',
  //   iconActive: 'Arrow-active',
  //   // hotkey: 'Shift + L',
  //   json: {
  //     tag: 'Arrow',
  //     x: 100,
  //     y: 100,
  //     width: 150,
  //     rotation: 0,
  //     fill: '',
  //     stroke: '#000000',
  //     strokeWidth: 2,
  //     draggable: true,
  //     editable: true
  //   }
  // },
  // {
  //   name: 'Star',
  //   icon: 'star',
  //   iconActive: 'star-active',
  //   json: {
  //     tag: 'Star',
  //     x: 100,
  //     y: 100,
  //     width: 100,
  //     height: 100,
  //     rotation: 0,
  //     fill: '',
  //     stroke: '#000000',
  //     strokeWidth: 2,
  //     corners: 5,
  //     draggable: true,
  //     editable: true
  //   }
  // }
])

// const currentShape = ref({
//   name: 'line',
//   icon: 'Line1',
//   iconActive: 'Line1-active',
//   json: {}
// }) //当前选中的形状
const shapeChange = () => {
  shapeOpen.value = !shapeOpen.value
}
//线段菜单选择
const shapeClick = (item: any) => {
  shapeOpen.value = false
  activeTool.value = item.activetool
  graphicType.value = item.json
}

//画笔菜单对象
const penMenu = ref([
  {
    name: 'Pen',
    icon: 'icon-mingcute_pen-line',
    iconActive: '',
    hotkey: 'P'
  }
])

//画笔切换
const penChange = () => {
  penOpen.value = !penOpen.value
}

//画笔菜单选择
const penClick = (item: any) => {
  penOpen.value = false
  switch (item.name) {
    case 'Pen':
      activeTool.value = 'penDrawToLine'
      break
  }
}

//评论打开
const handleCommentOpen = () => {
  commentOpen.value = !commentOpen.value
  if (commentOpen.value) {
    activeTool.value = 'comment'
  } else {
    activeTool.value = 'select'
  }
}

//监听activeTool，如果为comment，则打开评论，否则关闭评论
watch(
  activeTool,
  (newVal) => {
    if (newVal === 'comment') {
      commentOpen.value = true
    } else {
      commentOpen.value = false
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="less">
.middle-menu {
  // width: 250px;
  height: 38px;
  border-radius: 10px;
  background: #ffffff;
  padding: 0 20px;
  box-shadow: var(--chakra-shadows-touch);
  border: var(--chakra-border);
  .middle-menu-item {
    cursor: pointer;
    position: relative;
    padding: 0 10px;
    .menu-box {
      position: absolute;
      top: 30px;
      left: 0;
      border-radius: 5px;
      background: #ffffff;
      box-sizing: border-box;
      border: 1px solid #eaeaea;
      box-shadow: 0px 4px 4px 0px rgba(135, 135, 135, 0.25);
      z-index: 999;
      padding: 10px 0 5px;
      .menu-box-item {
        color: #6b6b6b;
        font-size: 14px;
        padding: 0 10px;
        margin: 0 5px;
        height: 35px;
        line-height: 35px;
        margin-bottom: 2px;
        &:hover {
          border-radius: 5px;
          background: #e6e8e9;
        }
        // &:nth-last-child(1) {
        //   margin-bottom: 0;
        //   font-size: 12px;
        // }
        // &:nth-child(2) {
        //   font-size: 16px;
        // }
        // &:nth-child(3) {
        //   font-style: italic;
        //   font-size: 21.33px;
        // }
        // &:nth-child(4) {
        //   font-weight: bold;
        //   font-size: 26.67px;
        // }
      }
    }
    .menu-box1 {
      width: 155px;
    }
    .menu-box2 {
      width: 180px;
    }
    .menu-box3 {
      width: 160px;
    }
    .text-active {
      color: #1ca6c5;
    }
    .item-title {
      font-size: 12px;
      color: #6b6b6b;
      font-weight: 400;
    }
    &:nth-last-child(1) {
      margin-bottom: 0;
    }
    &:nth-child(2) {
      font-weight: bold;
    }
    &:nth-child(3) {
      font-weight: bold;
      font-size: 14px;
    }
  }
}
.menu-box1 {
  width: 103px;
}
.menu-box2 {
  width: 180px;
}
.menu-box3 {
  width: 160px;
}
.text-active {
  color: #1ca6c5;
}
.item-title {
  font-size: 12px;
  color: #6b6b6b;
  font-weight: 400;
}
.current-active {
  // background: #e6e8e9;
  border-radius: 5px;
}
.graphic-box {
  padding-left: 10px !important;
  padding-right: 10px !important;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  .graphic-box-item {
    text-align: center;
    padding: 5px;
    &:hover {
      border-radius: 5px;
      background: #e6e8e9;
    }
  }
  .graphic-box-name {
    grid-column: 1 / -1;
    font-size: 12px;
    color: var(--primary-color);
  }
}
.icon-mingcute_pen-line {
  color: #6b6b6b;
}
</style>
