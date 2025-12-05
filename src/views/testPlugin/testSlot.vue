<script setup lang="ts">
// import type { useEditor } from '@/views/Editor/app'
import { Trace } from '@/views/Editor/core/instantiation/instantiationService'
import svg2 from '@/assets/svg/test99.svg'
import { Image } from 'leafer-ui'
// const { canvas } = inject('useEditor')!()
import { useEditor } from '@/views/Editor/app'
import { log } from 'console'
const { editor, canvas } = useEditor()

const printTrace = () => {
  if (Trace.all.size === 0) {
    console.log('Enable via `instantiationService.ts#_enableAllTracing`')
    return
  }

  for (const item of Trace.all) {
    console.log(item)
  }
}
const printJson = () => {
  console.log(canvas.activeObject)
  console.log(canvas.getCurrentPage())
}
const test = () => {
  console.log(canvas.activeObject)
  const test = canvas.activeObject.value?.clone()
  console.log(test, '---test')
  canvas.undoRedo.withoutListen(() => {
    canvas.contentFrame.add(test)
  })

  // canvas.activeObject.value?.set({
  //   // editInner: 'ClipEditor', // 指定内部编辑器
  //   fill: [
  //     {
  //       type: 'image',
  //       url: '/src/assets/svg/401.svg',
  //       mode: 'clip',
  //       clipSize: {
  //         width: 654.4520782968939,
  //         height: 510.4049969983962
  //       },
  //       offset: {
  //         x: -203,
  //         y: -118
  //       },
  //       scale: {
  //         x: 6.232876936160894,
  //         y: 3.402699979989308
  //       }
  //     }
  //   ]
  // })

  return
  // return canvas.app.tree.toJSON()
  console.log(canvas.app.tree.toJSON(), '---canvas.app.tree.toJSON()')
  console.log(canvas.app.toJSON(), '---canvas.app.toJSON()')
  console.log(canvas.contentFrame.toJSON(), '---canvas.contentFrame.toJSON()')

  const xx = {
    tag: 'Leafer',
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    fill: 'transparent',
    children: [
      {
        tag: 'Frame',
        fill: [
          {
            type: 'solid',
            color: '#fff'
          }
        ],
        overflow: 'show',
        solid: [],
        shadow: [
          {
            x: 0,
            y: 2,
            blur: 16,
            color: 'rgba(41, 48, 57, 0.08)'
          }
        ],
        innerShadow: [],
        width: 1900,
        height: 800,
        id: '3257bdf6-4131-44c5-b84a-121c957aa880',
        name: 'Page',
        stroke: '#d0d9e6',
        data: {
          pageId: ''
        },
        states: {},
        children: [
          {
            tag: 'ClipImg',
            zIndex: 1,
            x: 907.5,
            y: 229.5,
            width: 105,
            height: 150,
            lockRatio: true,
            draggable: true,
            editable: true,
            fill: [
              {
                type: 'image',
                url: '/src/assets/svg/401.svg',
                mode: 'stretch'
              }
            ],
            data: {
              MaterialType: 'OFFICIAL_MATERIAL'
            },
            states: {}
          }
        ]
      }
    ]
  }
  const xx2 = {
    tag: 'Frame',
    fill: [
      {
        type: 'solid',
        color: '#fff'
      }
    ],
    overflow: 'show',
    solid: [],
    shadow: [
      {
        x: 0,
        y: 2,
        blur: 16,
        color: 'rgba(41, 48, 57, 0.08)'
      }
    ],
    innerShadow: [],
    width: 1920,
    height: 800,
    id: '8466e914-1446-42c2-8231-25af54b533c8',
    name: 'Page',
    stroke: '#d0d9e6',
    data: {
      pageId: ''
    },
    states: {},
    children: [
      {
        tag: 'ClipImg',
        zIndex: 1,
        x: 841,
        y: 184,
        width: 238,
        height: 150,
        lockRatio: true,
        draggable: true,
        editable: true,
        fill: [
          {
            type: 'image',
            url: '/src/assets/svg/svg8.svg',
            mode: 'stretch'
          }
        ],
        data: {
          MaterialType: 'OFFICIAL_MATERIAL'
        },
        states: {}
      }
    ]
  }
  canvas.contentFrame.set(xx2)

  // canvas.activeObject.value.set({
  //   opacity: 0.5
  // })
  // console.log(canvas.app.editor, '---editor')
  // canvas.app.editor.closeInnerEditor()
  // const { proxyData } = canvas.activeObject.value
  // console.log('proxyData', proxyData.width, proxyData.height)
  // const bounds = canvas.activeObject.value.getBounds()
  // console.log('bounds', bounds.width, bounds.height)
  // const bounds2 = canvas.activeObject.value.getLayoutBounds()
  // console.log('getLayoutBounds', bounds2.width, bounds2.height)
  // proxyData.width = 300
  // canvas.activeObject.value.width = 300
  // canvas.activeObject.value.resizeWidth(300)
}
/**
 * 渲染500个图片，每行100个换行显示
 */
const test3 = (num: number) => {
  const itemsPerRow = 20 // 每行显示的图片数量
  const itemWidth = 200 // 每个图片的宽度间距
  const itemHeight = 200 // 每个图片的高度间距
  const startX = -360 // 起始X坐标
  const startY = 300 // 起始Y坐标

  for (let i = 0; i < num; i++) {
    const row = Math.floor(i / itemsPerRow) // 计算当前行数
    const col = i % itemsPerRow // 计算当前列数

    const rect = new Image({
      x: startX + col * itemWidth,
      y: startY + row * itemHeight,
      url: svg2,
      editable: true,
      draggable: true
    })
    canvas.contentFrame.add(rect)
  }
}
const clearHistory = () => {
  canvas.undoRedo.clear()
}
</script>

<template>
  <div class="p2">
    <div>测试</div>
    <a-space>
      <!-- <a-button @click="printTrace" hidden>打印Trace</a-button> -->
      <!-- <a-button @click="printJson">打印JSON</a-button> -->
      <a-button @click="test3(500)">渲染500个</a-button>
      <a-button @click="test3(1000)">渲染1000个</a-button>
    </a-space>
    <a-button @click="test">test</a-button>
    <a-button @click="clearHistory" style="margin-left: 10px">清除历史</a-button>

    <!--    <template v-for="(value, key) in canvas.activeObject.value?.proxyData" :key="key">-->
    <!--      <div>{{ key }}: {{ value }}</div>-->
    <!--    </template>-->
  </div>
</template>
