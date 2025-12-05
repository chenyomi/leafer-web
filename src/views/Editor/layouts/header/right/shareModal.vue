<template>
    <div class="share-modal">
        <a-modal v-model:visible="visible" @ok="handleOk" @cancel="handleCancel" :closable="false" :footer="false" width="600px">
            <div class="share-modal-content">
                <div class="share-header flex items-center justify-between">
                    <div class="share-header-title">Share this project</div>
                    <div class="share-header-close" @click="handleCancel">
                        <ali-icon type="icon-material-symbols_close" :size="20" />
                    </div>
                </div>
                <div class="share-container mt15px">
                    <div class="show-box flex items-center justify-between">
                        <a-input class="share-input" placeholder="Add Username,emails,or groups" v-model="shareInput">
                            <template #suffix>
                                <CustomSelect
                                    v-model="shareAuth"
                                    :options="shareAuthList"
                                    placeholder="Select pages"
                                    width="130px"
                                />
                            </template>
                        </a-input>
                        <div class="invite-btn flex items-center justify-center">Invite</div>
                    </div>
                    <div class="show-box flex items-center justify-between mt10px">
                        <a-input class="share-input" placeholder="" v-model="linkInput" readonly>
                        </a-input>
                        <div class="invite-btn flex items-center justify-center" @click="handleCopyLink">Copy Link</div>
                    </div>
                    <div class="mt10px" style="font-size: 14px;color: #C1BBBB;">
                        who has access
                    </div>
                    <div class="user-list mt10px">
                        <div class="user-item flex items-center justify-between" v-for="(item,index) in userList" :key="index">
                            <div class="user-info flex items-center">
                                <img :src="item.avatar" alt="user" class="user-avatar">
                                <div class="user-message ml15px">
                                    <div class="user-name">{{item.name}}</div>
                                    <div class="email">{{item.email}}</div>
                                </div>
                            </div>
                            <div class="user-action flex items-center">
                                <CustomSelect
                                    v-model="item.access"
                                    :options="userAuthList"
                                    placeholder="Select pages"
                                    width="130px"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="share-footer flex items-center" @click="handleShareToCommunity">
                    <img src="@/assets/images/share-to.png" alt="share-footer" class="share-footer-img">
                    <div class="share-footer-text">Share to community</div>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
    import userAvtar from '@/assets/images/user-avtar.png';
    import CustomSelect from '@/components/custom-select/custom-select.vue';
    import copyText from '@/utils/clipboard';

    const shareAuthList = ref([
        { value: '1', label: 'Can View' },
        { value: '2', label: 'Can Edit' },
    ]);
    const visible = defineModel<boolean>('visible', { required: true });
    const handleOk = () => {
        visible.value = false;
    };
    const handleCancel = () => {
        visible.value = false;
    };
    const shareInput = ref(''); //邀请输入
    const shareAuth = ref('1'); // 1:can View,2:can Edit
    const linkInput = ref('https://www.figma.com/design/wf0dxdgfdhia'); //链接输入
    const userList = ref([
        {
            avatar: userAvtar,
            name: 'Username (Me)',
            email: 'lishihai@sina.com',
            access: 'Owner'
        },
        {
            avatar: userAvtar,
            name: 'Username',
            email: 'lishihai@sina.com',
            access: 'Can Edit'
        },
        {
            avatar: userAvtar,
            name: 'Username',
            email: 'lishihai@sina.com',
            access: 'Can View'
        }
    ]);
    const userAuthList = ref([
        { value: 'Owner', label: 'Owner' },
        { value: 'Can Edit', label: 'Can Edit' },
        { value: 'Can View', label: 'Can View' },
    ]);
    //复制链接
    const handleCopyLink = () => {
        copyText(linkInput.value);
    }
    const emit = defineEmits(['shareToCommunity']);
    //分享到社区
    const handleShareToCommunity = () => {
        emit('shareToCommunity');
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
            border-bottom: 1px solid #EAEAEA;
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
                    position: relative;
                    .user-action-dropdown{
                        position: absolute;
                        top: 30px;
                        left: 0;
                        width: 100%;
                        height: 100%;
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
    :deep(.arco-input-wrapper){
        padding-right: 0 !important;
    }
    :deep(.arco-select-view-single){
        width: 110px !important;
        border: none !important;
        background: transparent !important;
    }
    :deep(.dropdown-selected){
        background-color: transparent !important;
    }
</style>