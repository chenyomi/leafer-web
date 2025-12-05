import {getFonts} from "@/api/editor/font";
import FontFaceObserver from 'fontfaceobserver'
// import data from '@/assets/data/fonts.json'
import data from '@/assets/data/newFonts.json';


const defaultFonts = [
    {
        code: 'Roboto',
        name: `"Roboto", sans-serif`,
    },
    {
        code: 'Roboto Mono',
        name: `"Roboto Mono", monospace`,
    },
    {
        code: 'Inter',
        name: `"Inter", sans-serif`,
    },
    {
        code: 'Open Sans',
        name: `"Open Sans", sans-serif`,
    },
    {
        code: 'Montserrat',
        name: `"Montserrat", sans-serif`,
    },
    {
        code: 'Roboto Condensed',
        name: `"Roboto Condensed", sans-serif`,
    },
    {
        code: 'Arimo',
        name: `"Arimo", sans-serif`,
    },
    {
        code: 'Noto Sans',
        name: `"Noto Sans", sans-serif`,
    },
    {
        code: 'Merriweather',
        name: `"Merriweather", serif`,
    },
    {
        code: 'Playfair Display',
        name: `"Playfair Display", serif`,
    },
    {
        code: 'Noto Serif',
        name: `"Noto Serif", serif`,
    },
    {
        code: 'Lato',
        name: `"Lato", sans-serif`,
    },
    {
        code: 'Spectral',
        name: `"Spectral", serif`,
    },
    {
        code: 'Dancing Script',
        name: `"Dancing Script", cursive`,
    },
    {
        code: 'Noto Sans Simplified Chinese',
        name: `"Noto Sans SC", sans-serif`,
    },
    {
        code: 'Noto Serif Simplified Chinese',
        name: `"Noto Serif SC", serif`,
    },
    {
        code: 'Noto Sans Traditional Chinese',
        name: `"Noto Sans TC", sans-serif`,
    },
    {
        code: 'Noto Sans Hong Kong',
        name: `"Noto Sans HK", sans-serif`,
    },
    {
        code: 'Noto Serif Traditional Chinese',
        name: `"Noto Serif TC", serif`,
    },
    {
        code: 'Noto Serif Hong Kong',
        name: `"Noto Serif HK", serif`,
    },
    {
        code: 'Noto Sans Japanese',
        name: `"Noto Sans JP", sans-serif`,
    },
    {
        code: 'Noto Sans Korean',
        name: `"Noto Sans KR", sans-serif`,
    },
    {
        code: 'Poppins',
        name: `"Poppins", sans-serif`,
    },
    //系统默认字体
    // {
    //     code: 'arial',
    //     name: 'Arial',
    // },
    // {
    //     code: 'Times New Roman',
    //     name: 'Times New Roman',
    // },
    // {
    //     code: 'Microsoft Yahei',
    //     name: 'Microsoft Yahei',
    // },
]
const FONT_KEY = 'OPEN_FONTS'
const FONT_VERSION_KEY = 'OPEN_FONTS_VERSION'
export const useFontStore = defineStore('font', () => {
    const fontList = ref<any>([])

    // 跳过加载的字体
    const skipLoadFonts = ref<any>(defaultFonts.map(value => value.name))
    // console.log(skipLoadFonts.value)

    /**
     * 初始化部分字体
     */
    async function initFonts() {
        let list = []
        localStorage.getItem(FONT_VERSION_KEY) !== '1' && localStorage.removeItem(FONT_KEY)
        const localFonts: any = localStorage.getItem(FONT_KEY) ? JSON.parse(localStorage.getItem(FONT_KEY) || '') : []
        console.log(localFonts)
        if (localFonts.length > 0) {
            list.push(...localFonts)
        }

        if (list.length === 0) {
            console.log('获取字体')
            const res = await getFonts({pageNum: 1, pageSize: 1000})
            console.log(res)
            list = (res.data as any).records //获取字体列表
            localStorage.setItem(FONT_KEY, JSON.stringify(list))
            localStorage.setItem(FONT_VERSION_KEY, '1')
        }
        fontList.value = defaultFonts.concat(list)
        return list
    }
    initFonts()

    return {
        fontList,
        skipLoadFonts,
        initFonts,
    }
})
