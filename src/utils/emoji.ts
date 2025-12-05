// 表情数据结构
export interface Emoji {
  name: string
  url: string
  category: string
  text: string
}

// 文件夹对应的分类映射
const categoryMap: Record<string, string> = {
  '1': 'face',      // 表情类
  '2': 'emotion',   // 情感类
  '3': 'body',      // 身体部位类
  '4': 'gesture',   // 手势类
  '5': 'object',    // 物品类
}

/**
 * 获取文件名（不含扩展名）作为表情名称
 * @param filename - 文件名
 * @returns 处理后的表情名称
 */
function getEmojiName(filename: string): string {
  return filename.replace(/\.(png|jpg|jpeg|gif)$/i, '')
}

/**
 * 生成表情文本标识
 * @param name - 表情名称
 * @returns 表情文本标识
 */
function getEmojiText(name: string): string {
  return `[${name}]`
}

/**
 * 动态生成表情数据
 * 通过扫描 public/emoji 目录下的文件夹和文件来生成表情列表
 * @returns 表情数据数组
 */
function generateEmojis(): Emoji[] {
  const emojis: Emoji[] = []
  
  // 定义所有表情文件的路径和分类
  const emojiFiles = [
    
    // 文件夹1 - 表情类
    { name: 'annoyed', url: '/emoji/1/annoyed.png', category: 'face' },
    { name: 'cautious', url: '/emoji/1/cautious.png', category: 'face' },
    { name: 'crying', url: '/emoji/1/crying.png', category: 'face' },
    { name: 'eye roll', url: '/emoji/1/eye roll.png', category: 'face' },
    { name: 'facepalm', url: '/emoji/1/facepalm.png', category: 'face' },
    { name: 'go for it', url: '/emoji/1/go for it.png', category: 'face' },
    { name: 'grinning', url: '/emoji/1/grinning.png', category: 'face' },
    { name: 'happy', url: '/emoji/1/happy.png', category: 'face' },
    { name: 'lol', url: '/emoji/1/LOL.png', category: 'face' },
    { name: 'making faces', url: '/emoji/1/making faces.png', category: 'face' },
    { name: 'playful grin', url: '/emoji/1/playful grin.png', category: 'face' },
    { name: 'pleased', url: '/emoji/1/pleased.png', category: 'face' },
    { name: 'sigh', url: '/emoji/1/sigh.png', category: 'face' },
    { name: 'smile', url: '/emoji/1/smile.png', category: 'face' },
    { name: 'tears of joy1', url: '/emoji/1/tears of joy1.png', category: 'face' },
    
    // 文件夹2 - 情感类
    { name: 'about to cry', url: '/emoji/2/about to cry.png', category: 'emotion' },
    { name: 'agreed', url: '/emoji/2/agreed.png', category: 'emotion' },
    { name: 'angry', url: '/emoji/2/angry.png', category: 'emotion' },
    { name: 'awkward smile', url: '/emoji/2/awkward smile.png', category: 'emotion' },
    { name: 'blowing kiss', url: '/emoji/2/blowing kiss.png', category: 'emotion' },
    { name: 'blushing', url: '/emoji/2/blushing.png', category: 'emotion' },
    { name: 'can\'t look', url: '/emoji/2/can\'t look.png', category: 'emotion' },
    { name: 'charge', url: '/emoji/2/charge.png', category: 'emotion' },
    { name: 'cheeky', url: '/emoji/2/cheeky.png', category: 'emotion' },
    { name: 'cheering', url: '/emoji/2/cheering.png', category: 'emotion' },
    { name: 'clever', url: '/emoji/2/clever.png', category: 'emotion' },
    { name: 'clown face', url: '/emoji/2/clown face.png', category: 'emotion' },
    { name: 'cold sweat', url: '/emoji/2/cold sweat.png', category: 'emotion' },
    { name: 'confused', url: '/emoji/2/confused.png', category: 'emotion' },
    { name: 'crying hard', url: '/emoji/2/crying hard.png', category: 'emotion' },
    { name: 'devil', url: '/emoji/2/devil.png', category: 'emotion' },
    { name: 'disgusted', url: '/emoji/2/disgusted.png', category: 'emotion' },
    { name: 'dizzy', url: '/emoji/2/dizzy.png', category: 'emotion' },
    { name: 'hand raised', url: '/emoji/2/hand raised.png', category: 'emotion' },
    { name: 'heart eyes', url: '/emoji/2/heart eyes.png', category: 'emotion' },
    { name: 'kind smile', url: '/emoji/2/kind smile.png', category: 'emotion' },
    { name: 'kiss', url: '/emoji/2/kiss.png', category: 'emotion' },
    { name: 'laughing', url: '/emoji/2/laughing.png', category: 'emotion' },
    { name: 'mischievous grin', url: '/emoji/2/mischievous grin.png', category: 'emotion' },
    { name: 'no worries', url: '/emoji/2/no worries.png', category: 'emotion' },
    { name: 'oh well', url: '/emoji/2/oh well.png', category: 'emotion' },
    { name: 'poor thing', url: '/emoji/2/poor thing.png', category: 'emotion' },
    { name: 'proud', url: '/emoji/2/proud.png', category: 'emotion' },
    { name: 'sad', url: '/emoji/2/sad.png', category: 'emotion' },
    { name: 'sending heart', url: '/emoji/2/sending heart.png', category: 'emotion' },
    { name: 'shocked', url: '/emoji/2/shocked.png', category: 'emotion' },
    { name: 'sick', url: '/emoji/2/sick.png', category: 'emotion' },
    { name: 'sincere smile', url: '/emoji/2/sincere smile.png', category: 'emotion' },
    { name: 'sleeping', url: '/emoji/2/sleeping.png', category: 'emotion' },
    { name: 'sobbing', url: '/emoji/2/sobbing.png', category: 'emotion' },
    { name: 'speechless', url: '/emoji/2/speechless.png', category: 'emotion' },
    { name: 'tears of joy2', url: '/emoji/2/tears of joy2.png', category: 'emotion' },
    { name: 'teary', url: '/emoji/2/teary.png', category: 'emotion' },
    { name: 'thankful', url: '/emoji/2/thankful.png', category: 'emotion' },
    { name: 'thinking', url: '/emoji/2/thinking.png', category: 'emotion' },
    { name: 'touched', url: '/emoji/2/touched.png', category: 'emotion' },
    { name: 'typing furiously', url: '/emoji/2/typing furiously.png', category: 'emotion' },
    { name: 'unlucky', url: '/emoji/2/unlucky.png', category: 'emotion' },
    { name: 'very pleased', url: '/emoji/2/very pleased.png', category: 'emotion' },
    { name: 'wow', url: '/emoji/2/wow.png', category: 'emotion' },
    
    // 文件夹3 - 身体部位类
    { name: 'bladder', url: '/emoji/3/bladder.png', category: 'body' },
    { name: 'bone', url: '/emoji/3/bone.png', category: 'body' },
    { name: 'brain', url: '/emoji/3/brain.png', category: 'body' },
    { name: 'cell', url: '/emoji/3/cell.png', category: 'body' },
    { name: 'ear', url: '/emoji/3/ear.png', category: 'body' },
    { name: 'eye', url: '/emoji/3/eye.png', category: 'body' },
    { name: 'foot', url: '/emoji/3/foot.png', category: 'body' },
    { name: 'gallbladder', url: '/emoji/3/gallbladder.png', category: 'body' },
    { name: 'hand', url: '/emoji/3/hand.png', category: 'body' },
    { name: 'heart', url: '/emoji/3/heart.png', category: 'body' },
    { name: 'intestine', url: '/emoji/3/intestine.png', category: 'body' },
    { name: 'kidney', url: '/emoji/3/kidney.png', category: 'body' },
    { name: 'liver', url: '/emoji/3/liver.png', category: 'body' },
    { name: 'lung', url: '/emoji/3/lung.png', category: 'body' },
    { name: 'mouth', url: '/emoji/3/mouth.png', category: 'body' },
    { name: 'muscle', url: '/emoji/3/muscle.png', category: 'body' },
    { name: 'neuron', url: '/emoji/3/neuron.png', category: 'body' },
    { name: 'nose', url: '/emoji/3/nose.png', category: 'body' },
    { name: 'pancreas', url: '/emoji/3/pancreas.png', category: 'body' },
    { name: 'spleen', url: '/emoji/3/spleen.png', category: 'body' },
    { name: 'stomach', url: '/emoji/3/stomach.png', category: 'body' },
    { name: 'testis', url: '/emoji/3/testis.png', category: 'body' },
    { name: 'tongue', url: '/emoji/3/tongue.png', category: 'body' },
    { name: 'tooth', url: '/emoji/3/tooth.png', category: 'body' },
    { name: 'uterus', url: '/emoji/3/uterus.png', category: 'body' },
    
    // 文件夹4 - 手势类
    { name: 'bless you', url: '/emoji/4/bless you.png', category: 'gesture' },
    { name: 'broken heart', url: '/emoji/4/broken heart.png', category: 'gesture' },
    { name: 'clapping', url: '/emoji/4/clapping.png', category: 'gesture' },
    { name: 'done', url: '/emoji/4/done.png', category: 'gesture' },
    { name: 'finger heart', url: '/emoji/4/finger heart.png', category: 'gesture' },
    { name: 'fist bump', url: '/emoji/4/fist bump.png', category: 'gesture' },
    { name: 'get', url: '/emoji/4/get.png', category: 'gesture' },
    { name: 'heart hands', url: '/emoji/4/heart hands.png', category: 'gesture' },
    { name: 'love', url: '/emoji/4/love.png', category: 'gesture' },
    { name: 'no', url: '/emoji/4/no.png', category: 'gesture' },
    { name: 'right', url: '/emoji/4/right.png', category: 'gesture' },
    { name: 'rose', url: '/emoji/4/rose.png', category: 'gesture' },
    { name: 'thumbs up', url: '/emoji/4/thumbs up.png', category: 'gesture' },
    { name: 'wrong', url: '/emoji/4/wrong.png', category: 'gesture' },
    { name: 'yes', url: '/emoji/4/yes.png', category: 'gesture' },
    
    // 文件夹5 - 物品类
    { name: 'ambulance', url: '/emoji/5/ambulance.png', category: 'object' },
    { name: 'basketball', url: '/emoji/5/basketball.png', category: 'object' },
    { name: 'beer', url: '/emoji/5/beer.png', category: 'object' },
    { name: 'book', url: '/emoji/5/book.png', category: 'object' },
    { name: 'bus', url: '/emoji/5/bus.png', category: 'object' },
    { name: 'cake', url: '/emoji/5/cake.png', category: 'object' },
    { name: 'car', url: '/emoji/5/car.png', category: 'object' },
    { name: 'christmas tree', url: '/emoji/5/christmas tree.png', category: 'object' },
    { name: 'gift', url: '/emoji/5/gift.png', category: 'object' },
    { name: 'home', url: '/emoji/5/home.png', category: 'object' },
    { name: 'light bulb', url: '/emoji/5/light bulb.png', category: 'object' },
    { name: 'moon', url: '/emoji/5/moon.png', category: 'object' },
    { name: 'movie', url: '/emoji/5/movie.png', category: 'object' },
    { name: 'music', url: '/emoji/5/music.png', category: 'object' },
    { name: 'plane', url: '/emoji/5/plane.png', category: 'object' },
    { name: 'sun', url: '/emoji/5/sun.png', category: 'object' },
    { name: 'TV', url: '/emoji/5/TV.png', category: 'object' },
  ]
  
  // 将文件信息转换为表情数据
  emojiFiles.forEach(file => {
    emojis.push({
      name: file.name,
      url: file.url,
      category: file.category,
      text: getEmojiText(file.name)
    })
  })
  
  return emojis
}

// 动态生成的表情列表
export const defaultEmojis: Emoji[] = generateEmojis()

// 表情文本到图片URL的映射
export const emojiMap = new Map<string, string>(
  defaultEmojis.map(emoji => [emoji.text, emoji.url])
)

/**
 * 将文本中的表情标识转换为图片HTML
 * @param text 包含表情标识的文本
 * @returns 转换后的HTML字符串
 */
export function textToEmojiHtml(text: string): string {
  return text.replace(/\[(.*?)\]/g, (match) => {
    const url = emojiMap.get(match)
    return url ? `<img src="${url}" alt="${match}" class="emoji-img" data-emoji-text="${match}" />` : match
  })
}

/**
 * 将HTML中的表情图片转换为文本标识
 * @param html 包含表情图片的HTML字符串
 * @returns 转换后的文本
 */
export function emojiHtmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  
  const emojiImages = div.querySelectorAll('img[data-emoji-text]')
  emojiImages.forEach(img => {
    const text = img.getAttribute('data-emoji-text')
    if (text) {
      const textNode = document.createTextNode(text)
      img.parentNode?.replaceChild(textNode, img)
    }
  })
  
  return div.innerHTML
}

// 本地存储相关常量和函数
export const STORAGE_KEY = 'recent-emojis'

/**
 * 从本地存储加载最近使用的表情
 * @returns 最近使用的表情列表
 */
export function loadRecentEmojis(): Emoji[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse recent emojis:', e)
      return []
    }
  }
  return []
}

/**
 * 保存最近使用的表情到本地存储
 * @param emojis 要保存的表情列表
 */
export function saveRecentEmojis(emojis: Emoji[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emojis))
  } catch (e) {
    console.error('Failed to save recent emojis:', e)
  }
}