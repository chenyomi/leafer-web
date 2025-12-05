<template>
    <div class="export">
        <!-- 下载弹窗 -->
        <!-- <a-modal
            v-model:visible="internalVisible"
            title="下载作品"
            @ok="handleExport()"
            @close="handleClose"
            width="600px"
            :align-center="false"
            >
            <a-form ref="formRef" :model="exportForm" :rules="rules">
                <a-form-item field="fileType" label="导出文件类型">
                <a-radio-group
                    v-model="exportForm.fileType"
                    type="button"
                    :options="exportFileTypes"
                ></a-radio-group>
                </a-form-item>
                <a-form-item
                field="quality"
                label="图片质量"
                v-if="['jpg', 'webp'].includes(exportForm.fileType)"
                >
                <a-space>
                    <a-radio-group
                    v-model="exportForm.quality"
                    type="button"
                    :options="scQtaRate"
                    ></a-radio-group>
                    <a-input-number
                    v-model="exportForm.quality"
                    mode="button"
                    style="width: 120px"
                    :max="1"
                    :step="0.1"
                    :min="0.1"
                    placeholder="1"
                    ></a-input-number>
                </a-space>
                </a-form-item>
                <a-form-item
                field="scale"
                label="缩放比例"
                extra="可用于生成小尺寸的缩略图"
                >
                <a-space>
                    <a-radio-group
                    v-model="exportForm.scale"
                    type="button"
                    :options="scQtaRate"
                    ></a-radio-group>
                    <a-input-number
                    v-model="exportForm.scale"
                    mode="button"
                    style="width: 120px;"
                    :max="1"
                    :step="0.1"
                    :min="0.1"
                    placeholder="1"
                    ></a-input-number>
                </a-space>
                </a-form-item>
                <a-form-item
                field="pixelRatio"
                label="像素比"
                extra="可导出适配高清屏的2倍图、3倍图"
                >
                <a-input-number
                    v-model="exportForm.pixelRatio"
                    allow-clear
                    hide-button
                    style="width: 200px"
                    placeholder="默认为1倍图"
                >
                    <template #suffix> 倍 </template>
                </a-input-number>
                </a-form-item>
                <a-form-item field="isTansparent" label="是否透明背景">
                <a-switch type="round" v-model="isTansparent">
                    <template #checked> 是 </template>
                    <template #unchecked> 否 </template>
                </a-switch>
                </a-form-item>
            </a-form>
        </a-modal> -->
        <a-modal v-model:visible="internalVisible" width="1360px" :align-center="false" :footer="false" :closable="false" @cancel="handleClose">
            <div class="close" @click.stop="handleClose">
                <ali-icon type="icon-material-symbols_close" :size="20" />
            </div>
            <div class="export-box">
                <div class="export-pic">
                    <img :src="previewUrl" alt="export-pic" class="export-pic-img">
                </div>
                <div class="export-content">
                    <div class="export-title">Export this design</div>
                    <div class="export-form">
                        <div class="form-item mt25px flex items-center">
                            <div class="form-item-label">
                                <div class="form-item-label-text mb10px">Select pages</div>
                                <div class="form-item-label-select flex items-center">
                                    <CustomSelect
                                        v-model="pagesValue"
                                        :options="pageList"
                                        placeholder="Select pages"
                                    />
                                    <div class="flex items-center ml35px">
                                        <div class="pages">Pages</div>
                                        <div class="pages-value">{{ currentPageName }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="form-item mt25px flex items-center">
                            <div class="form-item-label flex">
                                <div class="form-item-label-item">
                                    <div class="form-item-label-text mb10px">File type</div>
                                    <div class="form-item-label-select">
                                        <CustomSelect
                                            v-model="exportForm.fileType"
                                            :options="exportFileTypes"
                                            placeholder="Select pages"
                                            width="200px"
                                        />
                                    </div>
                                </div>
                                <div class="form-item-label-item ml30px">
                                    <div class="form-item-label-text mb10px">Resolution</div>
                                    <div class="form-item-label-select">
                                        <CustomSelect
                                            v-model="exportForm.resolution"
                                            :options="resolutions"
                                            placeholder="Select pages"
                                            width="200px"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div class="show-transparent ml20px mt30px">
                                <a-checkbox v-model="isTansparent">Transparent background</a-checkbox>
                            </div>
                        </div>
                        <div class="form-item mt25px flex items-center">
                            <div class="form-item-label flex">
                                <div class="form-item-label-item" style="width: 200px;">
                                    <div class="form-item-label-text mb10px">width</div>
                                    <div class="form-item-label-select">
                                        <a-input-number v-model="exportForm.size.width" placeholder="Width" :hide-button="true"
                                        style="height: 35px !important;background-color: #F5F5F5;border-radius: 10px !important;">
                                            <template #suffix>{{ exportForm.unit }}</template>
                                            <template #prefix>W</template>
                                        </a-input-number>
                                    </div>
                                </div>
                            </div>
                            <div class="form-item-label-item ml30px" style="width: 200px;">
                                <div class="form-item-label-text mb10px">Height</div>
                                <div class="form-item-label-select">
                                    <a-input-number v-model="exportForm.size.height" placeholder="Height" :hide-button="true"
                                    style="height: 35px !important;background-color: #F5F5F5;border-radius: 10px !important;">
                                        <template #suffix>{{ exportForm.unit }}</template>
                                        <template #prefix>H</template>
                                    </a-input-number>
                                </div>
                            </div>
                            <div class="form-item-label-item ml30px mt20px">
                                <div class="form-item-label-text mb10px"></div>
                                <div class="form-item-label-select">
                                    <CustomSelect
                                        v-model="exportForm.unit"
                                        :options="units"
                                        placeholder="Select pages"
                                        width="100px"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="form-item mt35px">
                            <div class="permissions flex items-center">
                                <div class="permissions-title mr4px">Publication permissions</div>
                                <icon-question-circle :size="20" style="cursor: pointer;"/>
                            </div>
                            <div class="mt5px flex items-center">
                                <a-checkbox v-model="isPermissions">I would like a publication license with this completed design.</a-checkbox>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="w100% flex items-center justify-center mt30px">
                <div class="btn btn-cancel mr20px" @click="handleClose">Cancel</div>
                <div class="btn btn-export" @click="handleExport">Export</div>
            </div>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
    import { useEditor } from '@/views/Editor/app';

    const { editor, keybinding,canvas,workspaces,event } = useEditor();
    import { IWorkspace } from '@/views/Editor/core/workspaces/workspacesService';
    
    import { downFile } from '@/utils/designUtil.js';
    import { v4 as uuidv4 } from 'uuid';
    import { Notification } from '@arco-design/web-vue';
    import CustomSelect from '@/components/custom-select/custom-select.vue';
    import { onMounted } from 'vue';

    const exportForm = ref({
        fileType: 'jpg',
        resolution: '96',
        quality: 1,
        scale: 1,
        pixelRatio: 1,
        trim: false,
        unit:'px',
        size:{
            width:0,
            height:0
        }
    });
    const rules = {};
    const resetForm = () => {
        exportForm.value = {
            fileType: 'jpg',
            resolution: '96',
            quality: 1,
            scale: 1,
            pixelRatio: 1,
            trim: false,
            unit:'px',
            size:{
                width:0,
                height:0
            }
        };
    };
    const pageNames = ref([]); //页面名称列表
    //当前页面展示名称
    const currentPageName = ref('')
    //获取当前页面名称
    const getCurrentPageName = () => {
        const currentPage = workspaces.getCurrentId();
        currentPageName.value = workspaces.get(currentPage.toString()).name;
        const currentPageMessage = canvas.getCurrentPage();
        exportForm.value.size.width = currentPageMessage.width;
        exportForm.value.size.height = currentPageMessage.height;
    }
    const workspacesData = ref<IWorkspace[]>([]);
    const updateWorkspaces = () => {
        workspacesData.value = workspaces.all().map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            cover: workspace.cover,
        }));
        //获取页面名称
        pageNames.value = workspacesData.value.map((item)=>{
           return item.name
        })
        getCurrentPageName();
    };

    event.on('workspaceChangeAfter', updateWorkspaces);
    event.on('workspaceAddAfter', updateWorkspaces);
    event.on('workspaceRemoveAfter', updateWorkspaces);

    onUnmounted(() => {
        event.off('workspaceChangeAfter', updateWorkspaces);
        event.off('workspaceAddAfter', updateWorkspaces);
        event.off('workspaceRemoveAfter', updateWorkspaces);
    });
   
    const visiblePreview = ref(false); //预览图显示状态
    const previewUrl = ref();

    onMounted(() => {
        handlePreview();
        updateWorkspaces();
    });
    const width = computed(()=>{
        return canvas.getCurrentPage().width;
    })
    const height = computed(()=>{
        return canvas.getCurrentPage().height;
    })
    // 导出文件类型
    const exportFileTypes = reactive([
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'webp', label: 'WEBP' },
    { value: 'pdf', label: 'PDF' },
    ]);
    // 分辨率
    const resolutions = reactive([
        { value: '96', label: '96DPI' },
        { value: '300', label: '300DPI' },
        { value: '600', label: '600DPI' },
        { value: '1200', label: '1200DPI' },
    ]);
    const isTansparent = ref(false); 
    const units = reactive([
        { value: 'px', label: 'px' },
        { value: 'cm', label: 'cm' },
        { value: 'in', label: 'in' },
    ]);
    const isPermissions = ref(false);
    const scQtaRate = reactive([
    { value: 1, label: '正常' },
    { value: 0.7, label: '0.7倍' },
    { value: 0.5, label: '0.5倍' },
    { value: 0.3, label: '0.3倍' },
    { value: 0.1, label: '0.1倍' },
    ]);

     //预览图片
     const handlePreview = async () => {
        previewUrl.value = ''; //先清空预览图
        const result = await editor.contentFrame.export('png', { blob: true });
        const url = URL.createObjectURL(result.data);
        previewUrl.value = url;
        visiblePreview.value = true;
    };

    const props = defineProps({
        exportVisible: {
            type: Boolean,
            default: false
        }
    })
    const emit = defineEmits(['update:exportVisible']); // 导出弹窗关闭时通知父组件
    const internalVisible = ref(props.exportVisible); // 内部状态
    // 监听 props.exportVisible 的变化
    watch(() => props.exportVisible, (newVal) => {
        internalVisible.value = newVal; // 更新内部状态
        if(newVal){
            handlePreview();
            updateWorkspaces();
        }
    },{immediate: true});

    const pagesValue = ref('1') //选择页面
    watch(()=>pagesValue.value,()=>{
        if(pagesValue.value === '1'){
            //当前选择页
            currentPageName.value = workspaces.get(workspaces.getCurrentId().toString()).name;
        }else if(pagesValue.value === '2'){
            //所有页面
            currentPageName.value = pageNames.value.join(',');
        }else if(pagesValue.value === '3'){
            //自定义页面
            currentPageName.value = 'Customized pages';
        }
    })
    //页面下拉列表
    const pageList = ref([
        { value: '1', label: 'Current page' },
        { value: '2', label: 'All pages' },
        { value: '3', label: 'Customized pages' },
    ]);

    //单位转换
    const unitConversion = ()=>{
        if(exportForm.value.unit === 'px'){
            exportForm.value.size.width = width.value;
            exportForm.value.size.height = height.value;
        }else if(exportForm.value.unit === 'cm'){
            exportForm.value.size.width = Number((width.value / (96 / 2.54)).toFixed(2));
            exportForm.value.size.height = Number((height.value / (96 / 2.54)).toFixed(2));
        }else if(exportForm.value.unit === 'in'){
            exportForm.value.size.width = Number((width.value / 96).toFixed(2));
            exportForm.value.size.height = Number((height.value / 96).toFixed(2));
        }
    }
    //监听单位变化
    watch(()=>exportForm.value.unit,()=>{
        unitConversion();
    })

    // 在模态框中使用内部状态
    const handleClose = () => {
        internalVisible.value = false; // 更新内部状态
        emit('update:exportVisible', false); // 关闭时通知父组件
    };

    // 导出
    const handleExport = () => {
        let fileName = uuidv4();
        if (isTansparent.value) {
            exportForm.value.fill = 'transparent';
            exportForm.value.fileType = 'png';
        }
        editor.contentFrame.export(
            `${fileName}.${exportForm.value.fileType}`,
            exportForm.value
        );
    };

    const handleSelect = (v) => {
        let fileName = uuidv4();
        switch (v) {
            case 'png':
            editor.contentFrame.export(fileName + '.png');
            break;
            case 'jpg':
            editor.contentFrame.export(fileName + '.jpg');
            break;
            case 'webp':
            editor.contentFrame.export(fileName + '.webp');
            break;
            case 'json':
            saveJson();
            break;
            default:
            editor.contentFrame.export(fileName + '.jpg');
            break;
        }
        };
    const saveJson= ()=> {
        const dataUrl = editor.contentFrame.toJSON();
        const fileStr = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(dataUrl, null, '\t')
        )}`;
        downFile(fileStr, `${uuidv4()}.json`);
    }
</script>

<style scoped lang="less">
//隐藏滚动条
.export-box::-webkit-scrollbar {
    display: none;
}
.close{
    position: absolute;
    right: 20px;
    top: 20px;
    cursor: pointer;
    &:hover{
        color: var(--primary-color);
    }
}
.export-box{
    display: flex;
    .export-pic{
       width: 580px;
       height: 400px;
       .export-pic-img{
            width: 100%;
            height: 100%;
            border-radius: 10px;
            box-sizing: border-box;
            object-fit: contain;
        }
    }
    .export-content{
        width: 640px;
        margin-left: 100px;
        .export-title{
            font-size: 18px;
            font-weight: bold;
            color: #333333;
        }
        .pages{
            font-size: 12px;
            color: #000000;
        }
        .pages-value{
            width: 165px;
            height: 35px;
            border-radius: 10px;
            background: #F5F5F5;
            margin-left:10px;
            display: flex;
            align-items: center;
            font-size: 12px;
            color: #8C8C8C;
            padding-left: 10px;
        }
        .permissions-title{
            font-size: 14px;
            color: #333333;
        }
    }
}
.btn{
    width: 90px;
    height: 30px;
    border-radius: 5px;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    &:hover{
       opacity: 0.8;
    }
}
.btn-cancel{
    background-color: #DADADA;
}
.btn-export{
    background-color: var(--primary-color);
}
:deep(.arco-input-wrapper .arco-input-suffix){
    font-size: 14px !important;
    font-weight: bold !important;
}
:deep(.arco-input-wrapper .arco-input-prefix){
    font-size: 14px !important;
    font-weight: bold !important;
}
</style>