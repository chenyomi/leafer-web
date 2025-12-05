// @ts-ignore
import Typo from 'typo-js'

// 全局拼写检查实例
let spellCheck: Typo | null = null
let isTypoInitialized = false
let isLoading = false

/**
 * 初始化拼写检查器
 */
async function initializeSpellChecker() {
  // 防止重复初始化
  if (isLoading) {
    console.log('拼写检查器初始化已在进行中...')
    return null
  }
  
  if (isTypoInitialized && spellCheck) {
    return spellCheck
  }
  
  isLoading = true
  
  try {
    // 异步加载词典文件
    console.log('开始加载词典文件...')
    const [affResponse, dicResponse] = await Promise.all([
      fetch('/dictionaries/index.aff'),
      fetch('/dictionaries/words_alpha.txt')
    ])
    
    if (!affResponse.ok || !dicResponse.ok) {
      throw new Error('Failed to load dictionary files')
    }
    
    const affText = await affResponse.text()
    const dicText = await dicResponse.text()
    
    // 创建typo-js实例
    spellCheck = new Typo('en_US', affText, dicText)
    isTypoInitialized = true
    
    // 测试基本功能
    console.log('词典加载成功，测试功能...')
    console.log('在线词典测试 (test):', spellCheck.check('test'))
    const testSuggestions = spellCheck.suggest('testf').slice(0, 3)
    console.log('建议单词 (testf):', testSuggestions)
    return spellCheck
  } catch (error) {
    console.error('初始化拼写检查器失败:', error)
    return null
  } finally {
    isLoading = false
  }
}

// 立即开始初始化
initializeSpellChecker().catch(error => {
  console.warn('词典初始化失败:', error)
})
// 单词库缓存
let englishWordsSet: Set<string> | null = null
let loadPromise: Promise<Set<string>> | null = null

// 单词检查结果缓存（提高重复查询性能）
const checkCache = new Map()
const CACHE_MAX_SIZE = 1000 // 缓存最大条目数

// 实时检查节流定时器
let throttleTimer: ReturnType<typeof setTimeout> | null = null
const THROTTLE_DELAY = 200 // 节流延迟时间（毫秒）

/**
 * 从words_alpha.txt分块加载英文单词库（提高大文件加载性能）
 * @returns {Promise<Set<string>>} 单词集合
 */
async function loadEnglishDictionary() {
  // 如果已经加载过，直接返回
  if (englishWordsSet) {
    return englishWordsSet
  }

  // 如果正在加载中，等待加载完成
  if (isLoading) {
    return loadPromise
  }

  // 开始加载
  isLoading = true
  loadPromise = new Promise(async (resolve, reject) => {
    try {
      // 从public目录加载words_alpha.txt
      const response = await fetch('/dictionaries/words_alpha.txt')

      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${response.status}`)
      }

      // 分块处理大型单词库
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      const words = new Set()
      let partialLine = ''
      let chunkCount = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = (partialLine + text).split('\n')
        partialLine = lines.pop() // 保留不完整的行

        // 批量添加单词到Set
        for (const line of lines) {
          if (line.trim()) {
            words.add(line.trim().toLowerCase())
          }
        }

        // 每处理10000个词记录一次进度
        chunkCount++
        if (chunkCount % 10 === 0) {
          console.log(`加载进度: 已处理 ${words.size} 个单词`)
        }
      }

      // 添加最后一个不完整的行
      if (partialLine.trim()) {
        words.add(partialLine.trim().toLowerCase())
      }

      englishWordsSet = words as Set<string>
      console.log(`单词库加载完成，包含 ${words.size} 个单词.`)
      resolve(englishWordsSet)
    } catch (error) {
      console.error('Error loading English dictionary:', error)
      // 加载失败时返回空Set
      resolve(new Set())
    } finally {
      isLoading = false
    }
  })

  return loadPromise
}

/**
 * 预热词典，提前加载单词库
 * 可以在应用初始化时调用，避免用户首次使用时的加载延迟
 */
export async function preloadDictionary() {
  return loadEnglishDictionary()
}

/**
 * 清理缓存
 * 当应用需要释放内存时可以调用
 */
export function clearCache() {
  checkCache.clear()
  console.log('Spell check cache cleared.')
}

/**
 * 优化的拼写建议生成函数
 * @param {string} word - 拼写错误的单词
 * @returns {string[]} 建议的正确拼写单词
 */
function getSuggestions(word: string) {
  const lowerWord = word.toLowerCase()
  
  // 使用typo-js的suggest方法生成建议
  let suggestions: string[] = []
  
  try {
    // 检查spellCheck是否已初始化
    if (spellCheck && isTypoInitialized) {
      // 使用typo-js获取拼写建议
      suggestions = spellCheck.suggest(lowerWord)
      console.log(`Typo-js 为 '${lowerWord}' 生成的原始建议:`, suggestions)
    } else {
      console.warn('Typo-js 未初始化，使用简单的备用建议逻辑')
    }
  } catch (error) {
    console.error('生成建议失败:', error)
    suggestions = []
  }

  // 计算两个字符串之间的编辑距离（Levenshtein距离）
  function calculateEditDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // 删除
            dp[i][j - 1] + 1, // 插入
            dp[i - 1][j - 1] + 1 // 替换
          )
        }
      }
    }
    return dp[m][n]
  }

  // 计算字符串相似度（基于编辑距离和共同前缀长度）
  function calculateSimilarity(suggestion: string, word: string): number {
    const editDistance = calculateEditDistance(suggestion, word)
    const maxLength = Math.max(suggestion.length, word.length)

    // 计算共同前缀长度
    let commonPrefixLength = 0
    for (let i = 0; i < Math.min(suggestion.length, word.length); i++) {
      if (suggestion[i] === word[i]) {
        commonPrefixLength++
      } else {
        break
      }
    }

    // 编辑距离相似度（距离越小相似度越高）
    const distanceSimilarity = 1 - editDistance / maxLength

    // 前缀相似度（共同前缀越长相似度越高）
    const prefixSimilarity = commonPrefixLength / Math.min(suggestion.length, word.length)

    // 综合评分，给共同前缀较高权重
    return 0.6 * distanceSimilarity + 0.4 * prefixSimilarity
  }

  // 限制返回最多3个建议，去重并按相似度排序
  return [...new Set(suggestions)]
    .sort((a, b) => {
      const similarityA = calculateSimilarity(a, lowerWord)
      const similarityB = calculateSimilarity(b, lowerWord)

      // 首先按相似度降序排序
      if (similarityB !== similarityA) {
        return similarityB - similarityA
      }

      // 相似度相同时，返回较短的单词
      return a.length - b.length
    })
    .slice(0, 3)
}

/**
 * 生成缓存键
 * @param {string} text - 检查文本
 * @param {string[]} personalDictionary - 个人词典
 * @returns {string} 缓存键
 */
function getCacheKey(text: any, personalDictionary: any) {
  return `${text}:${personalDictionary.sort().join(',')}`
}

/**
 * 清理过多的缓存项
 */
function pruneCache() {
  if (checkCache.size > CACHE_MAX_SIZE) {
    // 删除最早的缓存项（Map保留插入顺序）
    const firstKey = checkCache.keys().next().value
    checkCache.delete(firstKey)
  }
}

/**
 * 对给定文本进行单次拼写检查（优化版本）
 * @param {string} text - 需要检查拼写的文本
 * @param {string[]} [personalDictionary=[]] - 个人词典，包含不需要被标记为错误的单词
 * @returns {Promise<{word: string, offset: number, length: number, suggestions: string[]}[]>}
 * 返回一个包含所有拼写错误信息的数组。
 */
export async function checkSpellingOnce(text: string, personalDictionary: string[] = []) {
  // 检查缓存
  const cacheKey = getCacheKey(text, personalDictionary)
  if (checkCache.has(cacheKey)) {
    return checkCache.get(cacheKey)
  }

  // 快速路径：空文本或纯数字/符号文本
  if (!text || /^[\s\d\W]+$/.test(text)) {
    return []
  }

  // 确保词典已加载
  const englishWords = await loadEnglishDictionary()

  // 如果typo-js未初始化但可能可用，尝试初始化
  if (!isTypoInitialized && !isLoading) {
    try {
      console.log('尝试初始化typo-js以提高拼写检查质量...');
      await initializeSpellChecker();
    } catch (initError) {
      console.warn('typo-js初始化失败，将继续使用单词库检查:', initError);
    }
  }

  // 创建包含个人词典的集合（转换为小写）
  const personalWordsSet = new Set(personalDictionary.map((word) => word.toLowerCase()))

  // 定义正则表达式
  const wordRegex = /\b[a-zA-Z]+\b/g // 匹配英文单词
  const chineseRegex = /[\u4e00-\u9fa5\u3040-\u30ff\u3130-\u318f\uac00-\ud7af]/ // 匹配中文、日文、韩文字符

  const errors = []
  let match

  // 匹配所有英文单词
  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0]
    const lowerWord = word.toLowerCase()

    // 优先检查简单条件（性能优化）
    // 检查单词长度（只检查长度大于3的单词）
    if (lowerWord.length <= 3) {
      continue
    }
    console.log(!/^[a-zA-Z]+$/.test(word))
    // 只对纯英文字母的单词进行检查，排除包含中文、数字或特殊字符的混合单词
    // 确保单词仅包含英文字母，不含其他任何字符
    if (!/^[a-zA-Z]+$/.test(word)) {
      console.log(`跳过检查非纯字母单词: '${word}'`);
      continue;
    }
    
    // 检查单词前后是否有中文或特殊字符
    // 获取单词在文本中的起始和结束位置
    const wordStart = match.index;
    const wordEnd = match.index + word.length;
    
    // 检查单词前一个字符是否存在且是中文字符或特殊字符
    const hasSpecialCharBefore = wordStart > 0 && /[^a-zA-Z\s]/.test(text[wordStart - 1]);
    
    // 检查单词后一个字符是否存在且是中文字符或特殊字符
    const hasSpecialCharAfter = wordEnd < text.length && /[^a-zA-Z\s]/.test(text[wordEnd]);
    
    // 如果单词前后有中文或特殊字符，跳过检查
    if (hasSpecialCharBefore || hasSpecialCharAfter) {
      console.log(`跳过检查被特殊字符包围的单词: '${word}'`);
      continue;
    }
    
    // 检查是否在个人词典中
    if (personalWordsSet.has(lowerWord)) {
      continue
    }

    // 优先使用typo-js检查，如果可用
    let isCorrect = false;
    if (spellCheck && isTypoInitialized) {
      try {
        isCorrect = spellCheck.check(lowerWord);
        console.log(`typo-js检查结果 '${lowerWord}': ${isCorrect}`);
      } catch (error) {
        console.error(`typo-js检查单词 '${lowerWord}' 时出错:`, error);
        // 如果typo-js检查失败，回退到单词库检查
        isCorrect = englishWords.has(lowerWord);
      }
    } else {
      // 如果typo-js不可用，使用单词库检查
      isCorrect = englishWords.has(lowerWord);
    }

    // 检查是否拼写错误
    if (!isCorrect) {
      // 生成建议
      const suggestions = getSuggestions(lowerWord)
      console.log('拼写错误单词:', lowerWord, '生成建议:', suggestions)
      errors.push({
        word,
        offset: match.index,
        length: word.length,
        suggestions
      })
    }
  }

  // 缓存结果
  checkCache.set(cacheKey, errors)
  pruneCache() // 确保缓存不会无限增长

  return errors
}

/**
 * 用于实时拼写检查的函数（带节流优化）
 * @param {string} text - 需要检查拼写的文本
 * @param {string[]} [personalDictionary=[]] - 个人词典
 * @param {function} callback - 检查完成后的回调函数
 * @param {number} [delay=THROTTLE_DELAY] - 节流延迟时间（毫秒）
 */
export function checkSpellingRealtime(
  text: string,
  personalDictionary: string[] = [],
  callback: (error: Error | null, errors: any[]) => void,
  delay = THROTTLE_DELAY
) {
  // 清除之前的定时器
  if (throttleTimer) {
    clearTimeout(throttleTimer)
  }

  // 设置新的定时器
  throttleTimer = setTimeout(async () => {
    try {
      const errors = await checkSpellingOnce(text, personalDictionary)
      if (callback && typeof callback === 'function') {
        callback(null, errors)
      }
    } catch (error) {
      console.error('Error in realtime spell check:', error)
      if (callback && typeof callback === 'function') {
        callback(error instanceof Error ? error : new Error(String(error)), [])
      }
    }
    throttleTimer = null
  }, delay)
}

/**
 * 检查单词的拼写是否正确
 * @param word 需要检查的单词
 * @returns 是否为正确拼写
 */
export async function checkWordSpelling(word: string): Promise<boolean> {
  // 将单词转换为小写并移除多余空格
  const normalizedWord = word.trim().toLowerCase();
  
  // 优先使用typo-js进行拼写检查（如果可用）
  if (spellCheck && isTypoInitialized) {
    try {
      const typoResult = spellCheck.check(normalizedWord);
      console.log(`Typo-js 检查 '${normalizedWord}': ${typoResult}`);
      return typoResult;
    } catch (error) {
      console.error('Typo-js 检查失败:', error);
      // 如果typo-js检查失败，回退到项目现有单词库
    }
  } else {
    // 如果typo-js未初始化，尝试初始化或直接使用备用方案
    if (!isTypoInitialized) {
      console.log('尝试初始化typo-js...');
      try {
        await initializeSpellChecker();
        if (spellCheck && isTypoInitialized) {
          const typoResult = spellCheck.check(normalizedWord);
          console.log(`Typo-js 检查 '${normalizedWord}': ${typoResult}`);
          return typoResult;
        }
      } catch (initError) {
        console.warn('初始化失败，使用备用方案:', initError);
      }
    }
  }
  
  // 回退到项目现有的单词库检查
  const words = await loadEnglishDictionary();
  const wordListResult = words.has(normalizedWord);
  console.log(`单词库检查 '${normalizedWord}': ${wordListResult}`);
  
  return wordListResult;
}

