<template>
    <div class="share-modal">
        <a-modal v-model:visible="visible" @ok="handleOk" @cancel="handleCancel" :closable="false" :footer="false" width="533px">
            <div class="share-modal-content">
                <div class="share-header flex items-center justify-between">
                    <div class="share-header-title">Share this project to Community</div>
                    <div class="share-header-close" @click="handleCancel">
                        <ali-icon type="icon-material-symbols_close" :size="20" />
                    </div>
                </div>
                <div class="share-container mt15px" v-if="firstStep">
                    <div class="share-item mt15px">
                        <div class="share-item-title">Rescource</div>
                        <div class="flex items-center justify-between mt15px">
                            <img src="@/assets/images/resourse1.png" alt="" class="resourse-img">
                            <img src="@/assets/images/resourse2.png" alt="" class="resourse-img">
                        </div>
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title">Author</div>
                        <div class="flex items-center justify-between mt10px">
                            <div class="autor-box flex items-center justify-between">
                                <div class="autor-info flex items-center">
                                    <img src="@/assets/images/user-avtar.png" alt="" class="author-img">
                                    <div class="ml8px">
                                        <div class="author-name">Cynthia</div>
                                        <div class="author-creator">Individual creator</div>
                                    </div>
                                </div>
                                <div class="open-checkbox flex items-center justify-center" :class="{'open-checkbox-active': isIndividual}" @click.stop="handleIndividual">
                                    <ali-icon type="icon-material-symbols_check" :size="16"></ali-icon>
                                </div>
                            </div>
                            <div class="autor-box flex items-center justify-between">
                                <div class="autor-info flex items-center">
                                    <img src="@/assets/images/user-avtar.png" alt="" class="author-img">
                                    <div class="ml8px">
                                        <div class="author-name">Peking Univ Lab</div>
                                        <div class="author-creator">Team</div>
                                    </div>
                                </div>
                                <div class="open-checkbox flex items-center justify-center" :class="{'open-checkbox-active': isTeam}" @click.stop="handleTeam">
                                    <ali-icon type="icon-material-symbols_check" :size="16"></ali-icon>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title">Co-author</div>
                        <div class="flex items-center justify-between mt10px">
                            <div class="autor-box flex items-center justify-between">
                                <div class="autor-info flex items-center">
                                    <img src="@/assets/images/user-avtar.png" alt="" class="author-img">
                                    <div class="ml8px">
                                        <div class="author-name">Lisa</div>
                                        <div class="author-creator">Individual creator</div>
                                    </div>
                                </div>
                                <div class="open-checkbox flex items-center justify-center" :class="{'open-checkbox-active': isCoAuthor}" @click.stop="handleCoAuthor">
                                    <ali-icon type="icon-material-symbols_check" :size="16"></ali-icon>
                                </div>
                            </div>
                            <div class="autor-box flex items-center justify-between">
                                <div class="autor-info flex items-center">
                                   <input type="text" placeholder="Please enter the email" class="co-author-input" v-model="coAuthorEmail">
                                </div>
                                <div class="open-checkbox flex items-center justify-center" :class="{'open-checkbox-active': isEmail}" @click.stop="handleEmail">
                                    <ali-icon type="icon-material-symbols_check" :size="16"></ali-icon>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title">Name</div>
                        <div class="mt10px">
                            <a-input placeholder="Please enter your name" show-word-limit :max-length="300" />
                        </div>
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title">Description</div>
                        <div class="description-box mt10px">
                            <!-- <textarea class="description-input"></textarea> -->
                            <!-- <div
                                class="description-input"
                                contenteditable="true"
                                ref="descEditor"
                                @input="onDescInput"
                                @keydown.enter="handleEnter"
                            ></div>
                            <div class="toolbar flex items-center justify-center">
                                <ali-icon type="icon-mynaui_tool" :size="20" @click.stop="handleToolbal"></ali-icon>
                                <div class="toolbal-modal" v-if="toolbalModalVisible">
                                    <div class="toolbal-modal-item" v-for="(item,index) in toolbalList" :key="index" @click.stop="handleToolbalItem(index)">
                                        <ali-icon :type="item.icon" :size="16" :class="{'toolbal-modal-item-active': toolbalModalIndex === index}" class="toolbal-icon"></ali-icon>
                                    </div>
                                </div>
                            </div> -->
                            <CustomEditor v-model="descriptionHtml" />
                        </div>
                    </div>
                    <div class="share-item mt15px flex items-center justify-center">
                        <div class="share-btn back-btn flex items-center justify-center" @click.stop="handleCancel">Cancel</div>
                        <div class="share-btn submit-btn flex items-center justify-center ml10px" @click.stop="handleNext">Next</div>
                    </div>
                </div>
                <div class="share-container mt15px" v-if="secondStep">
                    <div class="share-item">
                        <div class="share-item-title mb10px">Category</div>
                        <CustomSelect
                            v-model="category"
                            :options="categoryList"
                            placeholder="Select a category"
                            width="100%"
                        />
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title mb5px">Recommended tags</div>
                        <div class="share-tips">Select tags to allow more scholars to discover your resource</div>
                    </div>
                    <div class="share-item mt5px">
                        <a-input placeholder="Please enter your tag" v-model="tagInput">
                            <template #suffix v-if="tagInput">
                                <div class="flex items-center share-input-suffix">
                                    <div class="enter-btn flex items-center justify-center" @click.stop="handleEnterTag">
                                        <ali-icon type="icon-material-symbols_check" :size="16"></ali-icon>
                                        <span class="ml5px">Enter</span>
                                    </div>
                                    <div class="close-btn ml5px flex items-center justify-center" @click.stop="handleCloseTag">
                                        <ali-icon type="icon-material-symbols_close-rounded" :size="16"></ali-icon>
                                    </div>
                                </div>
                            </template>
                        </a-input>
                        <div class="tag-list mt10px">
                            <div class="tag-item flex items-center" v-for="(item,index) in tagList" :key="index" @click.stop="selectTag(index)">
                                <div class="tag-item-text">{{item}}</div>
                                <div class="close-tag flex items-center justify-center" v-if="activeTagIndex === index">
                                    <ali-icon type="icon-a-material-symbols_close1" :size="10" @click.stop="handleDeleteTag(index)"></ali-icon>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title">Publication details</div>
                        <div class="pub-item flex items-center mt8px">
                            <div class="pub-item-title mr8px">Article Title</div>
                            <a-input  placeholder="Please enter your article title" />
                        </div>
                        <div class="pub-item flex items-center mt8px">
                            <div class="pub-item-title mr8px">Doi Link</div>
                            <a-input  placeholder="Please enter your Doi Link" />
                        </div>
                        <div class="pub-item flex items-center mt8px">
                            <div class="pub-item-title mr8px">Journal Name</div>
                            <a-input  placeholder="Please enter your Journal Name">
                                <template #suffix>
                                    <div class="open-access flex items-center" @click.stop="handleOpenAccess">
                                        <div class="open-checkbox flex items-center justify-center" :class="{'open-checkbox-active': openAccess}">
                                            <ali-icon type="icon-material-symbols_check" :size="12"></ali-icon>
                                        </div>
                                        <div class="open-access-text ml5px">Open Access</div>
                                    </div>
                                </template>
                            </a-input>
                        </div>
                    </div>
                    <div class="share-item mt15px">
                        <div class="share-item-title">References</div>
                        <div class="mt8px">
                            <a-textarea placeholder="Please enter References" />
                        </div>
                    </div>
                    <div class="share-item mt10px">
                        <div class="share-item-title">Attention</div>
                        <div class="attention-item flex mt10px">
                            <div class="open-checkbox flex items-center justify-center mt2px" :class="{'open-checkbox-active': allowComment}" @click.stop="handleAllowComment">
                                <ali-icon type="icon-material-symbols_check" :size="12"></ali-icon>
                            </div>
                            <div class="attention-info open-access-text ml15px">
                                Allow comments from Community members.
                            </div>
                        </div>
                        <div class="attention-item flex mt10px">
                            <div class="open-checkbox flex items-center justify-center mt5px" :class="{'open-checkbox-active': auth}" @click.stop="handleAuth">
                                <ali-icon type="icon-material-symbols_check" :size="12"></ali-icon>
                            </div>
                            <div class="attention-info open-access-text ml15px">
                                I certify that I own—or am properly licensed to use—this Template, and its submission does not infringe any third-party rights.
                            </div>
                        </div>
                        <div class="attention-item flex mt10px">
                            <div class="open-checkbox flex items-center justify-center mt5px" :class="{'open-checkbox-active': read}" @click.stop="handleRead">
                                <ali-icon type="icon-material-symbols_check" :size="12"></ali-icon>
                            </div>
                            <div class="attention-info open-access-text ml15px">
                                <div class="">I acknowledge that I have read and agree to the Contribution License.</div>
                                <div class="license">SciPixa Contribution License</div>
                            </div>
                        </div>
                    </div>
                    <div class="share-item mt15px flex items-center justify-center">
                       <div class="share-btn back-btn flex items-center justify-center" @click.stop="handleBack">Back</div>
                       <div class="share-btn submit-btn flex items-center justify-center ml10px" @click.stop="handleSubmit">Submit</div>
                    </div>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
    import CustomSelect from '@/components/custom-select/custom-select.vue';
    import CustomEditor from '@/components/custom-editor/custom-editor.vue';

    //类别相关
    const categoryList = ref([
        { value: '1', label: 'Category 1' },
        { value: '2', label: 'Category 2' },
    ]);
    const category = ref('');

    const visible = defineModel<boolean>('visible', { required: true });
    const handleOk = () => {
        visible.value = false;
    };
    /*
     * 标签相关
    */
    const tagInput = ref('');
    //标签列表
    const tagList = ref(['cell','heart','cardiopulmonary','cell','heart','cardiopulmonary','cell','heart','cardiopulmonary']); 
    //输入标签确认
    const handleEnterTag = () => {
        if(tagInput.value){
            tagList.value.unshift(tagInput.value);
            tagInput.value = '';
        }
    }
    //输入标签关闭
    const handleCloseTag = () => {
        tagInput.value = '';
    }
    const activeTagIndex = ref(-1);
    //选择标签
    const selectTag = (index:number) => {
        activeTagIndex.value = index;
    }
    //删除标签
    const handleDeleteTag = (index:number) => {
        tagList.value.splice(index,1);
        activeTagIndex.value = -1;
    }
    //开启关闭开放访问
    const openAccess = ref(false);
    const handleOpenAccess = () => {
        openAccess.value = !openAccess.value;
    }
    const allowComment = ref(false); //是否允许评论
    const handleAllowComment = () => {
        allowComment.value = !allowComment.value;
    }
    const auth = ref(false); //是否授权
    const handleAuth = () => {
        auth.value = !auth.value;
    }
    const read = ref(false); //是否阅读
    const handleRead = () => {
        read.value = !read.value;
    }
    const firstStep = ref(true); //是否是第一步
    const secondStep = ref(false); //是否是第二步
    const isIndividual = ref(true) //是否是个人创作者
    const isTeam = ref(false) //是否是团队创作者
    const handleIndividual = () => {
        isIndividual.value = true;
        isTeam.value = false;
    }
    const handleTeam = () => {
        isIndividual.value = false;
        isTeam.value = true;
    }
    const isCoAuthor = ref(true) //是否是共同作者
    const handleCoAuthor = () => {
        isCoAuthor.value = !isCoAuthor.value;
    }
    const isEmail = ref(true) //是否是邮箱
    const coAuthorEmail = ref('') //共同作者邮箱
    const handleEmail = () => {
        isEmail.value = !isEmail.value;
    }
    const toolbalModalVisible = ref(false) //富文本工具栏是否显示
    //打开富文本工具栏
    const handleToolbal = () => {
        toolbalModalVisible.value = !toolbalModalVisible.value;
    }
    const toolbalList = ref([
        {
            icon: 'icon-humbleicons_bold',
            text: 'Bold'
        },
        {
            icon: 'icon-zitixieti',
            text: 'Italic'
        },
        {
            icon: 'icon-line-md_link',
            text: 'link'
        },
        {
            icon: 'icon-list6',
            text: 'List'
        },
        {
            icon: 'icon-a-Frame540',
            text: 'List'
        },
        
        
    ])
    const toolbalModalIndex = ref(-1) //富文本工具栏索引
    const descEditor = ref<HTMLElement | null>(null)
    const descriptionHtml = ref('')

    function onDescInput() {
        descriptionHtml.value = descEditor.value?.innerHTML || ''
    }
    const isOrderList = ref(false) //是否是有序列表
    const isUnorderList = ref(false) //是否是无序列表
    const handleToolbalItem = (index: number) => {
        toolbalModalIndex.value = index
        if (!descEditor.value) return
            descEditor.value.focus()
            switch (index) {
                case 0:
                    descEditor.value.style.fontWeight = descEditor.value.style.fontWeight === 'bold' ? 'normal' : 'bold'
                break
                case 1: 
                    descEditor.value.style.fontStyle = descEditor.value.style.fontStyle === 'italic' ? 'normal' : 'italic'
                break
                case 2: 
                    
                break
                case 3: 
                    isUnorderList.value = !isUnorderList.value
                break
                case 4:
                    isOrderList.value = !isOrderList.value
                break
                default:
                break
        }
        // 更新内容
        nextTick(onDescInput)
    }
    //下一步
    const handleNext = () => {
        firstStep.value = false;
        secondStep.value = true;
    }
    //返回
    const handleBack = () => {
        firstStep.value = true;
        secondStep.value = false;
    }
    //取消
    const handleCancel = () => {
        visible.value = false;
        firstStep.value = true;
        secondStep.value = false;
    };
    //提交
    const handleSubmit = () => {
        visible.value = false;
    }
</script>

<style scoped lang="less">
    .share-modal-content{
        padding: 0 15px;
        .share-header-title{
            font-size: 18px;
            font-weight: bold;
            color: #333333;
        }
        .share-header-close{
            cursor: pointer;
            &:hover{
                color: var(--primary-color);
            }
        }
        .share-container{
            .share-input{
                width: 425px !important;
                height:30px !important ;
            }
            .invite-btn{
                width: 95px;
                height: 30px;
                border-radius: 5px;
                background: #1CA6C5;
                font-size: 14px;
                font-weight: bold;
                color: #FFFFFF;
                cursor: pointer;
                &:hover{
                    opacity: 0.8;
                }
            }
            .user-list{
                .user-item{
                   margin-bottom: 10px;
                }
                .user-avatar{
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                }
                .user-name{
                    font-size: 14px;
                    color: #333333;
                }
                .email{
                    font-size: 12px;
                    color: #C1BBBB;
                }
                .user-action{
                    cursor: pointer;
                    &:hover{
                        color: var(--primary-color);
                        .user-name{
                            color: var(--primary-color);
                        }
                    }
                }
            }
        }
        .share-footer{
            padding: 10px 0 0 0;
            cursor: pointer;
            .share-footer-img{
                width: 20px;
                height: 20px;
            }
            .share-footer-text{
                font-size: 14px;
                color: #333333;
                margin-left: 10px;
            }
        }
    }
    .resourse-img{
        width: 220px;
        height: 150px;
        border-radius: 10px;
    }
    .autor-box{
        width: 220px;
        height: 50px;
        border-radius: 10px;
        background: #FFFFFF;
        box-sizing: border-box;
        border: 1px solid #EAEAEA;
        padding: 0 18px;
        .author-img{
            width: 20px;
            height: 20px;
            border-radius: 50%;
        }
        .author-name{
            font-size: 14px;
            font-weight: bold;
            color: #333333;
        }
        .author-creator{
            font-size: 10px;
            color: #8C8C8C;
        }
        .co-author-input{
            border: none;
            background: transparent;
            outline: none;
            width: 100%;
            height: 100%;
            font-size: 14px;
            color: #333333;
        }
    }
    .description-box{
        width: 100%;
        height: 180px;
        border-radius: 10px;
        background-color: #F5F5F5;
        position: relative;
        .toolbar{
            position: absolute;
            top: 10px;
            right:20px;
            width: 28px;
            height: 28px;
            background-color: #FFFFFF;
            border-radius: 50%;
            cursor: pointer;
            .toolbal-modal{
                position: absolute;
                top: 32px;
                right: 0;
                width: 28px;
                height: 130px;
                border-radius: 20px;
                background: #FFFFFF;
                box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                .toolbal-modal-item{
                    .toolbal-icon{
                        color:#8C8C8C ;
                        cursor: pointer;
                    }
                    .toolbal-modal-item-active{
                        color: var(--primary-color);
                    }
                    &:hover{
                        .toolbal-icon{
                            color: var(--primary-color);
                        }
                    }
                }
            }
        }
    }
    .description-input{
        border: none;
        background: transparent;
        outline: none;
        width: 100%;
        height: 100%;
        font-size: 14px;
        color: #333333;
        padding: 10px;
        white-space: pre-wrap;
        word-break: break-all;
        word-wrap: break-word;
        overflow-y: auto;
    }
    .share-item-title{
        font-size: 14px;
        font-weight: bold;
        color: #333333;
    }
    .share-tips{
        font-size: 12px;
        color: #8C8C8C;
    }
    .enter-btn{
        width: 70px;
        height: 20px;
        border-radius: 5px;
        background: var(--primary-color);
        color: #FFFFFF;
        font-size: 12px;
        cursor: pointer;
    }
    .close-btn{
        width: 34px;
        height: 20px;
        border-radius: 5px;
        background: #D9D9D9;
        color: #FFFFFF;
        font-size: 12px;
        cursor: pointer;
    }
    .share-input-suffix{
        position: relative;
        left: -10px;
    }
    .tag-list{
        display: flex;
        flex-wrap: wrap;
        gap:10px;
        .tag-item{
            height: 20px;
            border-radius: 5px;
            background: #E3FAFF;
            padding: 0 5px;
            cursor: pointer;
            position: relative;
            &:hover{
                opacity: 0.8;
            }
            .tag-item-text{
                font-size: 12px;
                color: var(--primary-color);
            }
            .close-tag{
                position: absolute;
                right: -5px;
                top: -5px;
                width: 12px;
                height: 12px;
                background-color: #F5F5F5;
                border-radius: 50%;
            }
        }
    }
    .pub-item-title{
        font-size: 12px;
        color: #333333;
        width: 100px;
    }
    .open-access{
        position: relative;
        left: -10px;
        cursor: pointer;
    }
    .open-checkbox{
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #DADADA;
        cursor: pointer;
        flex-shrink:0;
    }
    .open-checkbox-active{
        background: var(--primary-color);
    }
    .open-access-text{
        font-size: 12px;
        color: #333333;
    }
    .license{
        font-size: 12px;
        font-weight: 700;;
        color: var(--primary-color);
        text-decoration: underline;
        cursor: pointer;
        &:hover{
            opacity: 0.8;
        }
    }
    .share-btn{
        width: 80px;
        height: 25px;
        border-radius: 5px;
        color: #FFFFFF;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        &:hover{
            opacity: 0.8;
        }
    }
    .back-btn{
        background: #DADADA;
    }
    .submit-btn{
        background: var(--primary-color);
    }
    :deep(.arco-input-wrapper){
        padding-right: 0 !important;
        height: 35px !important;
        background: #F5F5F5 !important;
    }
    :deep(.arco-select-view-single){
        width: 110px !important;
        border: none !important;
        background: transparent !important;
    }
    :deep(.arco-textarea-wrapper){
        border-radius: 10px;
        background: #F5F5F5;
        height: 70px;
    }
    :deep(.arco-input-word-limit){
        position: relative;
        left: -10px;
    }
</style>