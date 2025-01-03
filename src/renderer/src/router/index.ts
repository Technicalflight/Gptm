import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import ChatView from '../components/ChatView.vue'
import WalletView from '../components/WalletView.vue'
import SettingsView from '../components/SettingsView.vue'
import LoginView from '../components/LoginView.vue'
import SponsorView from '../components/SponsorView.vue'
import PromptMarketView from '../components/PromptMarketView.vue'
import PluginView from '../components/PluginView.vue'
import KnowledgeBaseView from '../components/KnowledgeBaseView.vue'


const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/',
    name: 'chat',
    component: ChatView,
    meta: { requiresAuth: true }
  },
  {
    path: '/wallet',
    name: 'wallet',
    component: WalletView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/sponsor',
    name: 'sponsor',
    component: SponsorView,
    meta: { requiresAuth: true }
  },
  {
    path: '/prompt-market',
    name: 'prompt-market',
    component: PromptMarketView,
    meta: { requiresAuth: true }
  },
  {
    path: '/plugins',
    name: 'plugins',
    component: PluginView,
    meta: { requiresAuth: true }
  },
  {
    path: '/knowledge-base',
    name: 'knowledge-base',
    component: KnowledgeBaseView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 需要登录的页面
    if (!token) {
      // 未登录，跳转到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    } else {
      // 已登录，允许访问
      next()
    }
  } else {
    // 不需要登录的页面
    if (token && to.path === '/login') {
      // 已登录状态下访问登录页，重定向到首页
      next('/')
    } else {
      // 其他情况正常访问
      next()
    }
  }
})

export default router 