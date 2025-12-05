/**
 * 表情文件清单生成脚本
 * 自动扫描 public/emoji 目录并生成表情文件清单
 */

const fs = require('fs')
const path = require('path')

/**
 * 文件夹对应的分类映射
 */
const categoryMap = {
  '1': 'face',      // 表情类
  '2': 'emotion',   // 情感类
  '3': 'body',      // 身体部位类
  '4': 'gesture',   // 手势类
  '5': 'object',    // 物品类
}

/**
 * 获取文件名（不含扩展名）作为表情名称
 * @param {string} filename - 文件名
 * @returns {string} 处理后的表情名称
 */
function getEmojiName(filename) {
  return filename.replace(/\.(png|jpg|jpeg|gif)$/i, '')
}

/**
 * 递归扫描目录获取所有图片文件
 * @param {string} dir - 目录路径
 * @param {string} baseDir - 基础目录路径
 * @returns {Array} 文件信息数组
 */
function scanDirectory(dir, baseDir = '') {
  const files = []
  
  try {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // 递归扫描子目录
        const subFiles = scanDirectory(fullPath, path.join(baseDir, item))
        files.push(...subFiles)
      } else if (stat.isFile() && /\.(png|jpg|jpeg|gif)$/i.test(item)) {
        // 处理图片文件
        const relativePath = baseDir ? path.join(baseDir, item) : item
        const urlPath = relativePath.replace(/\\/g, '/') // 确保使用正斜杠
        
        // 确定分类
        let category = 'face' // 默认分类
        if (baseDir && categoryMap[baseDir]) {
          category = categoryMap[baseDir]
        }
        
        files.push({
          name: getEmojiName(item),
          url: `/emoji/${urlPath}`,
          category: category
        })
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dir} 时出错:`, error.message)
  }
  
  return files
}

/**
 * 生成表情清单文件
 */
function generateEmojiManifest() {
  const emojiDir = path.join(__dirname, '../public/emoji')
  
  if (!fs.existsSync(emojiDir)) {
    console.error('表情目录不存在:', emojiDir)
    return
  }
  
  console.log('开始扫描表情目录:', emojiDir)
  
  // 扫描所有表情文件
  const emojiFiles = scanDirectory(emojiDir)
  
  console.log(`发现 ${emojiFiles.length} 个表情文件`)
  
  // 生成清单内容
  const manifest = {
    version: Date.now(), // 版本号，用于缓存控制
    emojis: emojiFiles,
    categories: Object.values(categoryMap),
    generatedAt: new Date().toISOString()
  }
  
  // 写入清单文件到 public 目录
  const manifestPath = path.join(__dirname, '../public/emoji-manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
  
  console.log('表情清单已生成:', manifestPath)
  console.log('清单统计:')
  
  // 统计各分类的表情数量
  const categoryStats = {}
  emojiFiles.forEach(emoji => {
    categoryStats[emoji.category] = (categoryStats[emoji.category] || 0) + 1
  })
  
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} 个`)
  })
}

// 如果直接运行此脚本
if (require.main === module) {
  generateEmojiManifest()
}

module.exports = { generateEmojiManifest }