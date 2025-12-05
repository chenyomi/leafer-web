import { defineStore } from 'pinia'

export const useUserStore = defineStore('user',{
    state(){
        return {
            userInfo:{} as any,
        }
    },
    actions:{
        setUserInfo(userInfo:any){
            this.userInfo = userInfo
        },
        getUserInfo(){
            return this.userInfo
        }
    },
    // persist:true
    persist: {
        key: 'user',
        storage: sessionStorage
    }
})