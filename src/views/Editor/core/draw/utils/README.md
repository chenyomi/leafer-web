# pathUtils.ts 模块说明

## 概述

`pathUtils.ts` 是一个功能完整的路径处理工具模块，提供了从基础几何计算到复杂路径简化的全套解决方案。该模块采用模块化设计，支持多种路径格式，并实现了高效的路径简化算法。

## 模块结构

### 类型定义
- `Point`: 二维点坐标接口
- `PathSimplificationOptions`: 路径简化配置选项

### 主要功能模块
1. **贝塞尔曲线工具函数**
2. **几何计算工具函数**
3. **路径简化算法**
4. **路径解析和转换函数**

## 核心功能

### 1. 主要路径简化函数

#### `simplifyPenPathToLines(penPath: Point[], options?: PathSimplificationOptions): Point[]`

将画笔路径点数组转换为简化的直线段点数组。

**参数：**
- `penPath`: 画笔路径点数组
- `options`: 可选的简化配置参数

**返回值：**
- 简化后的点数组

#### `convertPathCommandsToLines(pathCommands: number[], options?: PathSimplificationOptions): number[]`

将路径命令数组转换为简化的直线段坐标数组。

**参数：**
- `pathCommands`: 路径命令数组（包含moveTo、lineTo、bezierCurveTo等命令）
- `options`: 可选的简化配置参数

**返回值：**
- 简化后的坐标数组 [x1, y1, x2, y2, ...]

### 2. 路径解析函数

#### `parsePathCommands(pathCommands: number[]): Point[]`

解析路径命令数组为点数组，支持以下命令：
- `1`: moveTo
- `2`: lineTo  
- `5`: bezierCurveTo
- `7`: quadraticCurveTo

### 3. 几何计算函数

#### `getAngleChange(p1: Point, p2: Point, p3: Point): number`
计算三点间的角度变化（度）。

#### `pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number`
计算点到直线的距离。

### 4. 路径简化算法

#### `douglasPeucker(points: Point[], tolerance: number): Point[]`
道格拉斯-普克算法实现，递归简化路径。

#### `removeCollinearPoints(points: Point[], tolerance: number): Point[]`
移除共线的冗余点。

### 5. 贝塞尔曲线函数

#### `cubicBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point`
计算三次贝塞尔曲线上的点。

#### `quadraticBezierPoint(t: number, p0: Point, p1: Point, p2: Point): Point`
计算二次贝塞尔曲线上的点。

## 配置选项

```typescript
interface PathSimplificationOptions {
  angleThreshold?: number     // 角度变化阈值（度），默认70
  minDistance?: number        // 最小距离阈值（像素），默认50
  dpTolerance?: number        // 道格拉斯-普克算法容差（像素），默认8
  collinearTolerance?: number // 共线性容差（像素），默认3
}
```

## 使用示例

### 基础使用

```typescript
import { 
  simplifyPenPathToLines, 
  convertPathCommandsToLines,
  PathSimplificationOptions,
  Point 
} from './pathUtils'

// 简化点数组
const penPath: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 5 },
  { x: 20, y: 10 },
  // ... 更多点
]

const simplifiedPoints = simplifyPenPathToLines(penPath)

// 处理路径命令
const pathCommands = [1, 0, 0, 2, 10, 5, 2, 20, 10] // moveTo(0,0), lineTo(10,5), lineTo(20,10)
const simplifiedCoords = convertPathCommandsToLines(pathCommands)
```

### 自定义配置

```typescript
const options: PathSimplificationOptions = {
  angleThreshold: 60,    // 更敏感的角度检测
  minDistance: 30,       // 更小的最小距离
  dpTolerance: 5,        // 更精确的道格拉斯-普克算法
  collinearTolerance: 2  // 更严格的共线性检测
}

const customSimplified = simplifyPenPathToLines(penPath, options)
```

### 几何计算

```typescript
import { getAngleChange, pointToLineDistance } from './pathUtils'

const p1 = { x: 0, y: 0 }
const p2 = { x: 10, y: 0 }
const p3 = { x: 10, y: 10 }

const angle = getAngleChange(p1, p2, p3) // 90度
const distance = pointToLineDistance({ x: 5, y: 5 }, p1, p3) // 计算点到直线距离
```

## 算法原理

### 三层简化策略

1. **基础角度变化检测**
   - 计算相邻三点之间的角度变化
   - 过滤距离过近的点
   - 只保留角度变化显著的关键点

2. **道格拉斯-普克算法**
   - 递归地找到距离起终点连线最远的点
   - 根据容差决定是否保留该点
   - 经典的线性简化算法

3. **共线点移除**
   - 移除在直线上的冗余中间点
   - 进一步减少路径复杂度
   - 保持路径的基本形状

## 兼容性

### 向后兼容
- `test(pathCommands: number[]): number[]` - 已废弃，使用 `convertPathCommandsToLines` 替代

## 优势

1. **完整的功能集**: 从基础几何计算到复杂路径处理的全套工具
2. **模块化设计**: 清晰的功能分离，易于维护和测试
3. **类型安全**: 完整的 TypeScript 类型定义和接口
4. **高性能**: 优化的算法实现，适合实时处理
5. **灵活配置**: 丰富的参数选项，适应不同应用场景
6. **易于扩展**: 清晰的架构设计，便于添加新功能
7. **代码复用**: 独立的工具函数，可在项目各处使用

## 最佳实践

1. **参数调优**: 根据具体应用场景调整简化参数
2. **性能考虑**: 对于大量路径数据，考虑分批处理
3. **质量平衡**: 在简化程度和路径质量之间找到平衡点
4. **测试验证**: 在实际数据上测试不同参数组合的效果

## 注意事项

- 过于激进的简化可能会丢失重要的路径特征
- 建议在生产环境中充分测试参数配置
- 对于特殊形状（如圆形、椭圆），可能需要调整算法参数