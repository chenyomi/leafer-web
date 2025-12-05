<template>
  <div class="page-shape">
    <a-input-search v-model="searchValue" @search="handleSearch"></a-input-search>
    <div class="shape-list">
      <ElementDragItem :data="shapeList" @selectElement="handleClick"></ElementDragItem>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ElementDragItem from './elementDragItem.vue'

import { useEditor } from '@/views/Editor/app'
import { Group, Image, Line, Rect, Polygon, UI, Box } from 'leafer-ui'

import { ShapeRect, ShapePolygon, ShapeStar, ShapeEllipse } from '@/components/shapeUI'
import { ShapeLine } from '@/components/ShapeLine/Arrow'

import { svgToPath } from '@/views/Editor/utils/svgPathParser'
import { Path } from 'leafer-ui'
import { getDefaultName } from '@/views/Editor/utils/utils'
import isString from 'lodash/isString'

const { editor } = useEditor()

import cell1 from '@/assets/images/Cells-1.png'
import cell2 from '@/assets/images/Cells-2.png'
import cell3 from '@/assets/images/Cells-3.png'

const searchValue = ref('') //搜索内容

//搜索
const handleSearch = (value: string) => {
  console.log(value)
}

const shapeList = ref([
  {
    type: 'Lines',
    children: [
      {
        icon: 'icon-line-line08',
        name: 'Line',
        size: 25,
        json: {
          tag: 'Line',
          name: '直线',
          x: 100,
          y: 100,
          points: [0, 0, 200, 0],
          draggable: true,
          editable: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none',
          cornerRadius: 20,
          editOuter: 'EditTool'
        }
      },
      {
        icon: 'icon-line-line09',
        name: 'Line',
        size: 25,
        json: {
          tag: 'Line',
          name: '折线',
          x: 100,
          y: 100,
          points: [10, 30, 10, 10, 60, 10, 60, -10],
          draggable: true,
          editable: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none'
        }
      },
      {
        icon: 'icon-line-line07',
        name: 'Line',
        size: 25,
        json: {
          tag: 'Line',
          name: '曲线',
          x: 100,
          y: 100,
          points: [0, 100, 20, 70, 60, 110, 80, 90],
          curve: true,
          draggable: true,
          editable: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none'
        }
      }
    ]
  },
  {
    type: 'Shapes',
    children: [
      {
        icon: 'icon-shape-shape01',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Rect',
          name: '矩形',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          strokeAlign: 'inside',
          editOuter: 'RectEditTool'
        }
      },
      {
        icon: 'icon-shape-shape02',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Rect',
          name: '圆角矩形',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          cornerRadius: 10,
          strokeAlign: 'inside',
          editOuter: 'RectEditTool'
        }
      },
      {
        icon: 'icon-shape-shape13',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Rect',
          name: '半圆角矩形',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          cornerRadius: [20, 0, 20, 0],
          strokeAlign: 'inside',
          editOuter: 'RectEditTool'
        }
      },
      {
        icon: 'icon-shape-shape03',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Polygon',
          name: '三角形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          sides: 3,
          strokeAlign: 'inside',
          editOuter: 'PolygonEditTool'
        }
      },
      {
        icon: 'icon-shape-shape04',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Polygon',
          name: '圆角三角形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          sides: 3,
          cornerRadius: 20,
          strokeAlign: 'inside',
          editOuter: 'PolygonEditTool'
        }
      },
      {
        icon: 'icon-shape-shape14',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Polygon',
          name: '等腰三角形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          points: [0, 0, 100, 0, 100, -100],
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          strokeAlign: 'inside',
          editOuter: 'FreeTriangleEditTool'
        }
      },
      {
        icon: 'icon-shape-shape05',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Ellipse',
          name: '圆',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          strokeAlign: 'inside',
          editOuter: 'EllipseEditTool'
        }
      },
      {
        icon: 'icon-shape-shape06',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Ellipse',
          name: '圆环',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          innerRadius: 0.7,
          strokeAlign: 'inside',
          editOuter: 'EllipseEditTool'
        }
      },
      {
        icon: 'icon-shape-shape07',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Ellipse',
          name: '扇形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          startAngle: 0,
          endAngle: 270,
          strokeAlign: 'inside',
          editOuter: 'EllipseEditTool'
        }
      },
      {
        icon: 'icon-shape-shape08',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Ellipse',
          name: '扇形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          startAngle: 180,
          endAngle: 315,
          strokeAlign: 'inside',
          editOuter: 'EllipseEditTool'
        }
      },
      {
        icon: 'icon-shape-shape09',
        name: 'shape',
        size: 25,
        json: {
          tag: 'Polygon',
          name: '六角形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          sides: 6,
          strokeAlign: 'inside',
          editOuter: 'PolygonEditTool'
        }
      },
      {
        icon: 'icon-shape-shape10',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Polygon',
          name: '圆角六角形',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          sides: 6,
          cornerRadius: 30,
          strokeAlign: 'inside',
          editOuter: 'PolygonEditTool'
        }
      },
      {
        icon: 'icon-shape-shape11',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Star',
          name: '五角星',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          innerRadius: 0.382, // 这个也是默认参哦
          corners: 5,
          strokeAlign: 'inside',
          editOuter: 'StarEditTool'
        }
      },
      {
        icon: 'icon-shape-shape12',
        name: 'Shape',
        size: 25,
        json: {
          tag: 'Star',
          name: '圆角五角星',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          draggable: true,
          editable: true,
          stroke: '#95AAD3',
          strokeWidth: 2,
          fill: '#eef4fb',
          corners: 7,
          innerRadius: 0.382, // 这个也是默认参哦
          cornerRadius: 20,
          strokeAlign: 'inside',
          editOuter: 'StarEditTool'
        }
      }
    ]
  },
  {
    type: 'Brackets',
    children: [
      {
        icon: 'icon-line-line01',
        name: 'graphic',
        size: 25,
        json: {
          tag: 'Bracket',
          name: '花括号1',
          x: 0,
          y: 0,
          width: 70,
          height: 200,
          points: [40, 200, 0, 200, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 0, 40, 0],
          draggable: true,
          editable: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none',
          cornerRadius: 15,
          editInner: 'BracketEditTool'
        }
      },
      {
        icon: 'icon-line-line02',
        name: 'graphic',
        size: 25,
        json: {
          tag: 'Bracket',
          name: '花括号2',
          x: 0,
          y: 0,
          width: 70,
          height: 200,
          points: [70, 200, 30, 200, 30, 110, 0, 100, 0, 100, 0, 100, 30, 90, 30, 0, 70, 0],
          draggable: true,
          editable: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none',
          editInner: 'BracketEditTool'
        }
      },
      {
        icon: 'icon-line-line03',
        name: 'graphic',
        size: 25,
        json: {
          tag: 'Bracket',
          name: '花括号3',
          x: 0,
          y: 0,
          width: 70,
          height: 200,
          points: [70, 200, 30, 200, 30, 110, 0, 100, 0, 100, 0, 100, 30, 90, 30, 0, 70, 0],
          draggable: true,
          editable: true,
          // taper: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none',
          cornerRadius: 15,
          editInner: 'BracketEditTool'
        }
      },
      {
        icon: 'icon-line-line04',
        name: 'graphic',
        size: 25,
        json: {
          tag: 'Bracket',
          name: '花括号4',
          x: 0,
          y: 0,
          width: 70,
          height: 200,
          points: [70, 200, 30, 200, 30, 100, 0, 100, 0, 100, 0, 100, 30, 100, 30, 0, 70, 0],
          draggable: true,
          editable: true,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none',
          editInner: 'BracketEditTool'
        }
      }
    ]
  },
  {
    type: 'Circular',
    children: [
      {
        icon: 'icon-line-line05',
        name: 'graphic',
        size: 25,
        json: {
          tag: 'Circular',
          name: '圆环1',
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          path: 'G 0 0 100 100 0 0 270 0',
          editable: false,
          draggable: false,
          stroke: [
            {
              type: 'solid',
              color: '#000000'
            }
          ],
          strokeWidth: 2,
          startArrow: 'none',
          endArrow: 'none',
          hitRadius: 10
        }
      }
    ]
  },
  {
    type: 'Font',
    children: [
      {
        icon: cell1,
        name: 'Shape',
        size: 40
      },
      {
        icon: cell2,
        name: 'Shape',
        size: 40
      },
      {
        icon: cell3,
        name: 'Shape',
        size: 40
      }
    ]
  }
])

const handleClick = async (item: any, isDrag?: boolean) => {
  item.json.name = getDefaultName(editor.contentFrame)
  // console.log(item.json.fill)
  if (isString(item.json.fill)) {
    item.json.fill = [
      {
        type: 'solid',
        color: item.json.fill
      }
    ]
  }
  if (item.json.fill && item.json.fill[0].color == '') {
    item.json.fill = ''
  }
  let group
  if (item.json.tag === 'Path') {
    try {
      // 使用 fetch 获取 SVG 文件内容
      const response = await fetch(item.json.path)
      const svgString = await response.text()

      const svg = svgToPath(svgString)
      // 如果需要获取纯路径数据
      const pathData = svg.data.commands
      group = new Path({
        ...item.json,
        path: pathData
      })
    } catch (error) {
      console.error('SVG 转换失败:', error)
    }
  } else if (item.json.tag === 'Circular') {
    group = new Box({
      draggable: true,
      editable: true,
      width: 200,
      height: 200,
      lockRatio: true,
      editInner: 'CircularEditTool',
      resizeChildren: true
    })
    group.add(new ShapeLine(item.json))
  } else if (item.json.tag === 'Bracket') {
    group = new ShapeLine(item.json)
  } else if (item.json.tag === 'Rect') {
    group = new Group()
    group.add(new ShapeRect({ ...item.json }))
  } else if (item.json.tag === 'Polygon') {
    group = new Group()
    group.add(new ShapePolygon({ ...item.json }))
  } else if (item.json.tag === 'Star') {
    group = new Group()
    group.add(new ShapeStar({ ...item.json }))
  } else if (item.json.tag === 'Ellipse') {
    group = new Group()
    group.add(new ShapeEllipse({ ...item.json }))
  } else {
    group = UI.one(item.json)
  }
  //   画布中央显示
  if (!isDrag) {
    const canvasWidth = editor.app.width
    const canvasHeight = editor.app.height

    // 获取画布的缩放和偏移
    const scale = Number(editor.app.tree.scale)
    const offsetX = Number(editor.app.tree.x)
    const offsetY = Number(editor.app.tree.y)
    if (group.tag == 'Group') {
      // 应该没影响这里只管shape，而shape只有这几个有group
      group.x = 0
      group.y = 0
      group.children[0].x = (canvasWidth / 2 - offsetX) / scale - group.width / 2
      group.children[0].y = (canvasHeight / 2 - offsetY) / scale - group.height / 2
    } else {
      group.x = (canvasWidth / 2 - offsetX) / scale - group.width / 2
      group.y = (canvasHeight / 2 - offsetY) / scale - group.height / 2
    }
  }
  // 添加元素
  editor.add(group)
}
</script>

<style scoped lang="less"></style>
