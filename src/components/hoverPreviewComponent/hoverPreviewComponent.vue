<template>
    <div class="collect-item-preview" v-if="isShowPreview">
        <div class="collect-item-preview-content">
            <div class="preview-name">{{ currentName }}</div>
            <div class="opration-list flex items-center justify-center mt15px">
                <div class="opration-item flex items-center">
                    <ali-icon type="icon-ph_eye" :size="18" style="color:#ACACAC" class="mt2px icon-hover"/>
                    <div class="opration-item-name">（777）</div>
                </div>
                <div class="opration-item flex items-center">
                    <ali-icon type="icon-mdi_user-edit" :size="18" style="color:#ACACAC" class="mt2px icon-hover"/>
                    <div class="opration-item-name">（777）</div>
                </div>
                <div class="opration-item flex items-center">
                    <ali-icon type="icon-clarity_favorite-line" :size="18" style="color:#ACACAC" class="mt2px icon-hover"/>
                    <div class="opration-item-name">（777）</div>
                </div>
                <div class="opration-item flex items-center">
                    <ali-icon type="icon-solar_like-broken" :size="18" style="color:#ACACAC" class="mt2px icon-hover"/>
                    <div class="opration-item-name">（777）</div>
                </div>
            </div>
            <div class="pic-box mt15px flex items-center justify-center">
                <img :src="currentIcon" alt="" class="preview-icon-img"/>
                <div class="share-box">
                    <ali-icon type="icon-clarity_favorite-line" :size="24" style="color:#767676" class="icon-hover" @click="handleFavorite"/>
                    <ali-icon type="icon-system-uicons_jump-right1" :size="24" style="color:#767676" class="ml5px icon-hover" @click="handleShare"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    const props = defineProps({
        //是否显示预览
        isShowPreview: {
            type: Boolean,
            default: false
        },
        //当前模板/组件预览图
        currentIcon: {
            type: String,
            default: ''
        },
        //当前模板/组件名称
        currentName: {
            type: String,
            default: ''
        },
        //当前模板/组件查看数
        currentViewCount: {
            type: Number,
            default: 0
        },
        //当前模板/组件编辑数
        currentEditCount: {
            type: Number,
            default: 0
        },
        //当前模板/组件收藏数
        currentFavoriteCount: {
            type: Number,
            default: 0
        },
        //当前模板/组件点赞数
        currentLikeCount: {
            type: Number,
            default: 0
        }
    })
    const emit = defineEmits(['favorite','share']) //收藏、分享
    //收藏
    const handleFavorite = () => {
        emit('favorite')
    }
    //分享
    const handleShare = () => {
        emit('share')
    }
</script>


<style lang="less" scoped>
.collect-item-preview{
    position: absolute;
    top: 35px;
    right: -705px;
    width: 685px;
    border-radius: 4px;
    background: #FFFFFF;
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
    z-index: 1000;
    padding: 30px 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    .collect-item-preview-content{
        width: 100%;
    }
    .preview-name{
        text-align: center;
        font-size: 13px;
        color: #767676;
        font-weight: bold;
        margin-bottom: 8px;
        width: fit-content;
        margin: 0 auto;
        border-bottom: 1px solid #F5F5F5;
        padding-bottom: 5px;
    }
    .preview-icon{
        width: 100%;
        background: #F5F5F5;
        display: flex;
        align-items: center;
        justify-content: center;
        .preview-icon-img{
            width: 100px;
            height: 100px;
            object-fit: contain;
        }
    }
}
.opration-item{
    margin-right: 10px;
    cursor: pointer;
    &:hover{
        .opration-item-name{
            color: #EACA5F;
        }
        .icon-hover{
            color: #EACA5F !important;
        }
    }
}
.opration-item-name{
    font-size: 12px;
    color: #ACACAC;
}
.pic-box{
    width: 100%;
    height: 300px;
    background: #F5F5F5;
    position: relative;
    .preview-icon-img{
        width: 405px;
        height: 280px;
        object-fit: contain;
    }
    .share-box{
        position: absolute;
        right: 13px;
        top: 10px;
        .icon-hover{
            cursor: pointer;
        }
    }
}
</style>