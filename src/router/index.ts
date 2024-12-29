import { createRouter, createWebHashHistory } from 'vue-router'
import ChatView from '../renderer/src/components/ChatView.vue'
import LoginView from '../renderer/src/components/LoginView.vue'
import WalletView from '../renderer/src/components/WalletView.vue'
import SettingsView from '../renderer/src/components/SettingsView.vue'
import SponsorView from '../renderer/src/components/SponsorView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: ChatView
    },
    {
      path: '/login',
      component: LoginView
    },
    {
      path: '/wallet',
      component: WalletView
    },
    {
      path: '/settings',
      component: SettingsView
    },
    {
      path: '/sponsor',
      component: SponsorView
    }
  ]
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.path === '/login') {
    next()
    return
  }
  
  if (!token) {
    next('/login')
    return
  }
  
  next()
})

export default router 