import { createRouter, createWebHashHistory } from 'vue-router'

export const auditRouter = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/audit/login.vue')
    },
    {
      path: '/auditLogin',
      name: 'AuditLogin',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/login.vue')
    },
    //画师端
    {
      path: '/auditDashboard',
      name: 'AuditDashboard',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/painter/dashboard.vue')
    },
    //管理员端
    {
      path: '/auditManager',
      name: 'AuditManager',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/manager/dashboard.vue'),
      children: [
        {
          path: '',
          name: 'AuditManagerDefault',
          meta: {
            sign: 'audit'
          },
          redirect: '/auditManager/material'
        },
        /*素材管理*/
        {
          path: 'material',
          name: 'AuditMaterial',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/material.vue')
        },
        /*大类管理*/
        {
          path: '/auditManager/category',
          name: 'AuditCategory',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/category.vue')
        },
        /*画师管理*/
        {
          path: '/auditManager/painter',
          name: 'AuditPainter',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/painterManage.vue')
        },
        /*编辑管理*/
        {
          path: '/auditManager/editor',
          name: 'AuditEditor',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/editorManage.vue')
        },
        /*编辑管理-内部编辑*/
        {
          path: '/auditManager/editorInternal',
          name: 'AuditEditorInternal',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/editorInternal.vue')
        },
        /*编辑管理-外部编辑*/
        {
          path: '/auditManager/editorExternal',
          name: 'AuditEditorExternal',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/editorExternal.vue')
        },
        /*类别管理*/
        {
          path: '/auditManager/categoryManage',
          name: 'AuditCategoryManage',
          meta: {
            sign: 'audit'
          },
          component: () => import('@/views/audit/manager/categoryManage.vue')
        }
      ]
    },
    /*编辑端*/
    {
      path: '/auditEditor',
      name: 'AuditEditorAll',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/editor/dashboard.vue')
    },
    /*编辑端-编辑器*/
    {
      path: '/editEditor',
      name: 'EditEditor',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/editEditor.vue')
    },
    /*画师端-编辑器*/
    {
      path: '/painterEditor',
      name: 'PainterEditor',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/painterEditor.vue')
    },
    /*全局搜索*/
    {
      path: '/globalSearch',
      name: 'GlobalSearch',
      meta: {
        sign: 'audit'
      },
      component: () => import('@/views/audit/components/globalSearch.vue')
    },
  ]
})


// 路由守卫
auditRouter.beforeEach((to:any, from:any, next:any) => {
 // 如果没有token跳转到登录页
 if (sessionStorage.getItem('token')) {
  console.log(to.name,'to.name')
  if (to.name !== 'AuditLogin') {
    next({ name: 'AuditLogin' })
  } else {
    next()
  }
 } else {
  next()
 }
})