import { Message } from '@arco-design/web-vue'
//限制上传图片大小(5M)
export const limitUploadImageSize = (file: File) => {
    const size = file.size / 1024 / 1024
    if (size > 5) {
        Message.error('图片大小不能超过5M')
        return false
    }
    return true
}

//限制上传数量(6张)
export const limitUploadImageCount = (file: File[]) => {
    if (file.length > 6) {
        Message.error('图片数量不能超过6张')
        return false
    }
    return true
}
