<template>
    <div class="my-component-box">
        <template v-if="componentsList.length > 0">
            <div class="my-component-item" v-for="(item,index) in componentsList" :key="index" @mouseenter="handleMouseEnter(item)" @mouseleave="handleMouseLeave">
                <div class="component-info">
                    <drag-json-item :data="item" width="100%" height="100%" v-model:isShowPreview="isShowPreview" @dragging="handleDragging"/>
                </div>
                <div class="component-content mt5px">
                    <div class="component-type mt5px">{{ item.type }}</div>
                </div>
            </div>
        </template>
        <template v-else>
            <div class="no-data w100% flex justify-center align-center">
                <a-empty description="No data" />
            </div>
        </template>
        <!-- 鼠标悬浮预览 -->
        <hoverPreviewComponent :isShowPreview="isShowPreview" :currentIcon="currentIcon" :currentName="currentName"  @favorite="handleFavorite" @share="handleShare"/>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { useComponentsStore } from '@/store';
    import dragJsonItem from './dragJsonItem.vue';
    import hoverPreviewComponent from '@/components/hoverPreviewComponent/hoverPreviewComponent.vue';

    const { componentsList } = storeToRefs(useComponentsStore());

    const isShowPreview = ref(false) //是否显示预览
    const currentIcon = ref('') //当前预览图片
    const currentName = ref('Cell Name') //当前预览名称
    const isDragging = ref() //是否拖拽
    //鼠标移入
    const handleMouseEnter = (item:any) => {
        if (isDragging.value) return; //正在推拽时，不显示预览，避免预览和拖拽冲突
        isShowPreview.value = true;
        currentIcon.value = item.thumbnail;
        currentName.value = item.name
    }
    //鼠标离开
    const handleMouseLeave = () => {
        isShowPreview.value = false;
    }
    //拖拽
    const handleDragging = (value:boolean) => {
        isDragging.value = value;
    }
    //收藏
    const handleFavorite = () => {
        console.log('收藏')
    }
    //分享
    const handleShare = () => {
        console.log('分享')
    }
</script>

<style lang="less" scoped>
    .my-component-box{
        width: 100%;
        margin-top: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 15px 10px;
        .my-component-item{
            width: 145px;
            height: 120px;
            box-sizing: border-box;
            position: relative;
            .component-info{
                width: 100%;
                height: 95px;
                border-radius: 4px;
                background: #F5F5F5;
                box-sizing: border-box;
                border: 1px solid #C3C3C3;
            }
            .component-type{
                font-size: 10px;
                color: #000000;
            }
            .component-name{
                font-size: 10px;
                color:#ACACAC;
            }
        }
    }
</style>