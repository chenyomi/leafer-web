import { defineStore } from 'pinia'
import { ref } from 'vue'
import commentApi from '@/api/comment'
import { useUserStore } from '@/store/modules/user';
import { usePageInfoStore } from '@/store/modules/pageInfo';

export const userCommentStore = defineStore('comment',{
    state:()=>{
        return {
            commentList:[] as any[], //评论列表(当前页面)
            allCommentList:[] as any[], //评论列表(所有页面)
        }
    },
    actions:{
        //添加评论
        async addComment(commentData: any,pageParams: {teamId: string, projectId: string, dashBoardId: string, pageId: string,root?:string},){
            const res = await commentApi.createComment(pageParams.teamId, pageParams.projectId, pageParams.dashBoardId, pageParams.pageId, commentData)
            console.log(res)
            return res
        },
        //获取所有评论列表
        async getAllCommentList(teamId: string, projectId: string, dashBoardId: string,pageNum:number,pageSize:number,pageId?: string){
            const res = await commentApi.getAllCommentList(teamId, projectId, dashBoardId,pageNum,pageSize,pageId)
            console.log(res)
            this.allCommentList = (res as { records: any[] }).records
            return this.allCommentList
        },
        //获取当前页面所有评论
        async getCurrentPageCommentList(teamId: string, projectId: string, dashBoardId: string, pageId: string,root?:string){
            const res = await commentApi.getCurrentPageCommentList(teamId, projectId, dashBoardId, pageId,root)
            console.log(res)
            this.commentList = Array.isArray(res) ? res : (res as any[])
            return this.commentList
        },
        //删除评论
        async deleteComment(commentId: string){
            const res = await commentApi.deleteComment(commentId)
            
        }
    },
    persist:true
})