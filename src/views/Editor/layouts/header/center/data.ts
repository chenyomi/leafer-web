import { rotatePath } from '@/views/Editor/utils/svgPathParser'

export const graphic = {
  type: 'Shapes',
  children: [
    {
      icon: 'icon-shape-shape01',
      name: 'Rectangle',
      size: 33,
      json: {
        tag: 'Rect',
        name: '矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'RectEditTool'
      }
    },
    {
      icon: 'icon-shape-shape02',
      name: 'Rectangle',
      size: 33,
      json: {
        tag: 'Rect',
        name: '圆角矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        cornerRadius: 10,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'RectEditTool'
      }
    },
    {
      icon: 'icon-shape-shape13',
      name: 'Rectangle',
      size: 33,
      json: {
        tag: 'Rect',
        name: '半圆角矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        cornerRadius: [20, 0, 20, 0],
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'RectEditTool'
      }
    },
    {
      icon: 'icon-shape-shape31',
      name: 'Rectangle',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '梯形',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        path: 'M 20 0 L 180 0 L 200 100 L 0 100 Z',
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        strokeAlign: 'inside',
        editOuter: 'TrapezoidEditTool'
      }
    },
    {
      icon: 'icon-shape-shape32',
      name: 'Rectangle',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '扭曲矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        path: 'M 20 0 L 220 0 L 200 100 L 0 100 Z',
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        strokeAlign: 'inside',
        editOuter: 'RectSkewEditTool'
      }
    },
    {
      icon: 'icon-shape-shape03',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '三角形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 3,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape04',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '圆角三角形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 3,
        cornerRadius: 20,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape14',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '等腰三角形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        points: [200, 0, 200, 200, 0, 200],
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        strokeAlign: 'inside',
        editOuter: 'FreeTriangleEditTool'
      }
    },
    {
      icon: 'icon-shape-shape17',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '棱形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 4,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape18',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '圆角棱形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 4,
        cornerRadius: 20,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape15',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '五边形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 5,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape16',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '圆角五边形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 5,
        cornerRadius: 20,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape09',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '六角形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 6,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape10',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '圆角六角形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 6,
        cornerRadius: 33,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape19',
      name: 'Polygon',
      size: 33,
      json: {
        tag: 'Polygon',
        name: '八边形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        sides: 8,
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'PolygonEditTool'
      }
    },
    {
      icon: 'icon-shape-shape05',
      name: 'Ellipse',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '圆',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        strokeAlign: 'inside',
        textEdit: true,
        strokeJoin: 'miter',
        editOuter: 'EllipseEditTool'
      }
    },
    {
      icon: 'icon-shape-shape21',
      name: 'Ellipse',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '椭圆',
        x: 0,
        y: 0,
        width: 200,
        height: 140,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        strokeAlign: 'inside',
        textEdit: true,
        strokeJoin: 'miter',
        editOuter: 'EllipseEditTool'
      }
    },
    {
      icon: 'icon-shape-shape07',
      name: 'Ellipse',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '扇形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        startAngle: 0,
        endAngle: 270,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'EllipseEditTool'
      }
    },
    {
      icon: 'icon-shape-shape06',
      name: 'Ellipse',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '圆环',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        innerRadius: 0.7,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'EllipseEditTool'
      }
    },

    {
      icon: 'icon-shape-shape22',
      name: 'Ellipse',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '圆环扇形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        startAngle: 0,
        endAngle: 270,
        innerRadius: 0.7,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'EllipseEditTool'
      }
    },
    {
      icon: 'icon-shape-shape23',
      name: 'Star',
      size: 33,
      json: {
        tag: 'Star',
        name: '三角星',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        innerRadius: 0.282, // 这个也是默认参哦
        corners: 3,
        strokeAlign: 'inside',
        editOuter: 'StarEditTool'
      }
    },
    {
      icon: 'icon-shape-shape11',
      name: 'Star',
      size: 33,
      json: {
        tag: 'Star',
        name: '五角星',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        innerRadius: 0.382, // 这个也是默认参哦
        corners: 5,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'StarEditTool'
      }
    },
    {
      icon: 'icon-shape-shape24',
      name: 'Star',
      size: 33,
      json: {
        tag: 'Star',
        name: '粗五角星',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        innerRadius: 0.625, // 这个也是默认参哦
        corners: 5,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'StarEditTool'
      }
    },
    {
      icon: 'icon-shape-shape25',
      name: 'Star',
      size: 33,
      json: {
        tag: 'Star',
        name: '九角星',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        innerRadius: 0.382, // 这个也是默认参哦
        corners: 9,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'StarEditTool'
      }
    },
    {
      icon: 'icon-shape-shape12',
      name: 'Star',
      size: 33,
      json: {
        tag: 'Star',
        name: '圆角八角星',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        innerRadius: 0.382, // 这个也是默认参哦
        corners: 8,
        cornerRadius: 20,
        strokeAlign: 'inside',
        strokeJoin: 'miter',
        editOuter: 'StarEditTool'
      }
    },
    {
      icon: 'icon-shape-shape26',
      name: 'Text Shapes',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '文字圆',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        data: { text: 'A' },
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'EllipseEditTool'
      }
    },
    {
      icon: 'icon-shape-shape27',
      name: 'Text Shapes',
      size: 33,
      json: {
        tag: 'Ellipse',
        name: '文字椭圆',
        x: 0,
        y: 0,
        width: 200,
        height: 140,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        data: { text: 'A' },
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'EllipseEditTool'
      }
    },
    {
      icon: 'icon-shape-shape28',
      name: 'Text Shapes',
      size: 33,
      json: {
        tag: 'Rect',
        name: '文字矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        data: { text: 'A' },
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'RectEditTool'
      }
    },
    {
      icon: 'icon-shape-shape29',
      name: 'Text Shapes',
      size: 33,
      json: {
        tag: 'Rect',
        name: '文字圆角矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        cornerRadius: 10,
        data: { text: 'A' },
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'RectEditTool'
      }
    },
    {
      icon: 'icon-shape-shape30',
      name: 'Text Shapes',
      size: 33,
      json: {
        tag: 'Rect',
        name: '半圆角矩形',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        stroke: [
          {
            type: 'solid',
            color: 'rgba(149,170,211,1)'
          }
        ],
        strokeWidth: 2,
        data: { text: 'A' },
        fill: [
          {
            type: 'solid',
            color: 'rgba(238,244,251,1)'
          }
        ],
        cornerRadius: [20, 0, 20, 0],
        textEdit: true,
        strokeAlign: 'inside',
        editOuter: 'RectEditTool'
      }
    }
  ]
}
export const line = {
  type: 'Line',
  children: [
    {
      icon: 'icon-line-line17',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '直线',
        rotation: 0,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        editInner: 'MultiPointLineEditTool',
        editOuter: 'EditTool',
        hitRadius: 20,
        data: {
          editInner: 'line'
        }
      }
    },
    {
      icon: 'icon-line-line18',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '渐变填充线',
        rotation: 0,
        // stroke: '#000000',
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        editInner: 'MultiPointLineEditTool',
        hitRadius: 20,
        stroke: {
          type: 'linear',
          stops: [
            {
              offset: 0,
              color: 'rgba(255, 255, 255, 1)'
            },
            {
              offset: 1,
              color: 'rgba(36, 38, 35, 1)'
            }
          ],
          from: {
            x: 0,
            y: 0.5000000000000001,
            type: 'percent'
          },
          to: {
            x: 1,
            y: 0.5,
            type: 'percent'
          }
        },
        data: {
          editInner: 'line'
        }
      }
    },
    {
      icon: 'icon-line-line19',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '虚线',
        rotation: 0,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        dashPattern: [10],
        editInner: 'MultiPointLineEditTool',
        hitRadius: 20
      }
    },
    {
      icon: 'icon-line-line20',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '弧线',
        rotation: 0,
        points: [0, 0, 50, 60, 160, 80],
        curve: 0.5,
        motionPath: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        endArrow: 'triangle',
        editInner: 'MultiPointLineCurveEditTool',
        hitRadius: 20,
        data: {
          editInner: 'curved'
        }
      }
    },
    {
      icon: 'icon-line-line21',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '半弧线',
        rotation: 0,
        points: [0, 200, 150, -120, 300, 200],
        curve: 0.5,
        motionPath: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        endSize: 0.6,
        // endArrow: 'circle',
        editInner: 'MultiPointLineCurveEditTool',
        hitRadius: 20,
        data: {
          editInner: 'curved'
        }
      }
    },
    {
      icon: 'icon-line-line22',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '右折线',
        rotation: 0,
        points: [100, 100, 100, 0, 300, 0],
        // curve: 0.5,
        // motionPath: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 8,
        endSize: 0.6,
        endArrow: 'circle',
        editInner: 'MultiPointLineEditTool',
        hitRadius: 20,
        data: {
          editInner: 'line'
        }
      }
    },
    {
      icon: 'icon-line-line23',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '虚线s折线线',
        rotation: 0,
        points: [100, 100, 100, 0, 250, 0, 250, -100],
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        endSize: 1.3,
        endArrow: 'mark',
        dashPattern: [10],
        cornerRadius: 8,
        editInner: 'MultiPointLineEditTool',
        hitRadius: 20,
        data: {
          editInner: 'line'
        }
      }
    },
    {
      icon: 'icon-line-line24',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: '小半弧线',
        rotation: 0,
        points: [0, 200, 150, 140, 300, 200],
        curve: 0.5,
        motionPath: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        endSize: 1,
        endArrow: 'mark',
        editInner: 'MultiPointLineCurveEditTool',
        hitRadius: 20,
        data: {
          editInner: 'curved'
        }
      }
    },
    {
      icon: 'icon-line-line25',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: 's弧线',
        rotation: 0,
        points: [-25, 80, 35, 20, 120, 130, 185, 90],
        curve: 0.5,
        motionPath: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        endSize: 1,
        // endArrow: 'triangle-flip',
        editInner: 'MultiPointLineCurveEditTool',
        hitRadius: 20,
        data: {
          editInner: 'curved'
        }
      }
    },
    {
      icon: 'icon-line-line27',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: 'u弧线',
        rotation: 0,
        points: [-25, 120, 35, 20, 120, 130, 185, 40],
        curve: 0.5,
        motionPath: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        endSize: 1,
        // endArrow: 'circle',
        // startArrow:'triangle-flip',
        dashPattern: [10],
        editInner: 'MultiPointLineCurveEditTool',
        hitRadius: 20,
        data: {
          editInner: 'curved'
        }
      }
    },
    {
      icon: 'icon-line-line26',
      name: 'Lines and arrows',
      activetool: 'line',
      size: 20,
      json: {
        tag: 'Line',
        name: 'u弧线',
        rotation: 0,
        points: [172.027, 245, 199.527, 230, 247.027, 129.46, 294.527, 230, 322.027, 245],
        curve: 0.5,
        motionPath: true,
        hitRadius: 20,
        stroke: [
          {
            type: 'linear',
            stops: [
              {
                offset: 0,
                color: 'rgba(0, 0, 0, 0)'
              },
              {
                offset: 1,
                color: 'rgba(0, 0, 0, 1)'
              }
            ],
            from: {
              x: 0.0759759519217873,
              y: 0.764959632116603,
              type: 'percent'
            },
            to: {
              x: 0.9240240480782129,
              y: 0.2350403678833975,
              type: 'percent'
            }
          }
        ],
        enableCursorStyle: true,
        strokeWidth: 2,
        editable: true,
        cornerRadius: 0,
        endSize: 1,
        // endArrow: 'arrow',
        editInner: 'MultiPointLineCurveEditTool',
        data: {
          editInner: 'curved'
        }
      }
    },
    {
      icon: 'icon-line-line01',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
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
        hitFill: 'all',
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        strokeWidth: 2,
        startArrow: 'none',
        endArrow: 'none',
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line10',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Bracket',
        name: '花括号2',
        x: 0,
        y: 0,
        width: 70,
        height: 200,
        points: [40, 200, 0, 200, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 0, 40, 0],
        draggable: true,
        editable: true,
        hitFill: 'all',
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
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line04',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Bracket',
        name: '花括号3',
        x: 0,
        y: 0,
        width: 70,
        height: 200,
        points: [70, 200, 33, 200, 33, 100, 0, 100, 0, 100, 0, 100, 33, 100, 33, 0, 70, 0],
        draggable: true,
        editable: true,
        hitFill: 'all',
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        strokeWidth: 2,
        startArrow: 'none',
        endArrow: 'none',
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line02',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Bracket',
        name: '花括号4',
        x: 0,
        y: 0,
        width: 70,
        height: 200,
        points: [70, 200, 33, 200, 33, 110, 0, 100, 0, 100, 0, 100, 33, 90, 33, 0, 70, 0],
        draggable: true,
        editable: true,
        hitFill: 'all',
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        strokeWidth: 2,
        startArrow: 'none',
        endArrow: 'none',
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line03',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Bracket',
        name: '花括号5',
        x: 0,
        y: 0,
        width: 70,
        height: 200,
        points: [70, 200, 33, 200, 33, 110, 0, 100, 0, 100, 0, 100, 33, 90, 33, 0, 70, 0],
        draggable: true,
        editable: true,
        hitFill: 'all',
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
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line11',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Bracket',
        name: '花括号6',
        hitFill: 'all',
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
        startArrow: 'triangle',
        endArrow: 'triangle',
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line12',
      name: 'Brackets',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Bracket',
        name: '花括号7',
        hitFill: 'all',
        x: 0,
        y: 0,
        width: 70,
        height: 200,
        points: [70, 200, 33, 200, 33, 100, 0, 100, 0, 100, 0, 100, 33, 100, 33, 0, 70, 0],
        draggable: true,
        editable: true,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        strokeWidth: 2,
        startArrow: 'triangle',
        endArrow: 'triangle',
        editInner: 'BracketEditTool',
        hitRadius: 20,
        strokeJoin: 'miter'
      }
    },
    {
      icon: 'icon-line-line05',
      name: 'Circular',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Circular',
        name: '圆环1',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        path: 'G 0 0 100 100 0 0 250 0',
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
        hitRadius: 20
      }
    },
    {
      icon: 'icon-line-line13',
      name: 'Circular',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Circular',
        name: '圆环2',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        path: 'G 0 0 100 100 0 0 250 0',
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
        endArrow: 'mark',
        hitRadius: 20
      }
    },
    {
      icon: 'icon-line-line14',
      name: 'Circular',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Circular',
        name: '圆环3',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        path: 'G 0 0 100 100 0 0 250 0',
        editable: false,
        draggable: false,
        stroke: [
          {
            type: 'solid',
            color: '#000000'
          }
        ],
        strokeWidth: 2,
        dashPattern: [10],
        startArrow: 'none',
        endArrow: 'triangle',
        hitRadius: 20
      }
    },
    {
      icon: 'icon-line-line16',
      name: 'Circular',
      activetool: 'graphic',
      size: 33,
      json: {
        tag: 'Circular',
        name: '圆环4',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        path: 'G 0 0 100 100 0 0 110 0',
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
        endArrow: 'triangle',
        hitRadius: 20
      }
    }
  ]
}
