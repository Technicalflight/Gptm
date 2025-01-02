<template>
  <div class="app-container">
    <!-- 自定义标题栏 -->
    <div class="title-bar">
      <div class="title">Gptm</div>
      <div class="window-controls">
        <div class="control-button minimize" @click="minimizeWindow">
          <el-icon><Minus /></el-icon>
        </div>
        <div class="control-button maximize" @click="maximizeWindow">
          <el-icon><FullScreen /></el-icon>
        </div>
        <div class="control-button close" @click="closeWindow">
          <el-icon><Close /></el-icon>
        </div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧导航栏 -->
      <div v-if="showSidebar" class="sidebar">
        <!-- 用户头像区域 -->
        <div class="avatar-section">
          <div class="avatar">
            <el-avatar :size="40" :icon="UserFilled" />
            <div class="status-dot"></div>
          </div>
        </div>
        
        <!-- 主要导航按钮 -->
        <div class="nav-buttons">
          <router-link to="/" custom v-slot="{ navigate, isActive }">
            <div class="nav-item" :class="{ active: isActive }" @click="navigate">
              <el-icon><ChatDotRound /></el-icon>
            </div>
          </router-link>
          <router-link to="/wallet" custom v-slot="{ navigate, isActive }">
            <div class="nav-item" :class="{ active: isActive }" @click="navigate">
              <el-icon><Coin /></el-icon>
            </div>
          </router-link>
          <router-link to="/prompt-market" custom v-slot="{ navigate, isActive }">
            <div class="nav-item" :class="{ active: isActive }" @click="navigate">
              <el-icon><Collection /></el-icon>
            </div>
          </router-link>
          <router-link to="/plugins" custom v-slot="{ navigate, isActive }">
            <div class="nav-item" :class="{ active: isActive }" @click="navigate">
              <el-icon><Connection /></el-icon>
            </div>
          </router-link>
        </div>
        
        <!-- 底部工具栏 -->
        <div class="bottom-tools">
          <router-link to="/sponsor" custom v-slot="{ navigate, isActive }">
            <div class="tool-item" :class="{ active: isActive }" @click="navigate">
              <el-icon><MilkTea /></el-icon>
            </div>
          </router-link>
          <div class="tool-item" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
          </div>
          <router-link to="/settings" custom v-slot="{ navigate, isActive }">
            <div class="tool-item" :class="{ active: isActive }" @click="navigate">
              <el-icon><Setting /></el-icon>
            </div>
          </router-link>
        </div>
      </div>

      <!-- 路由视图 -->
      <router-view></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserFilled, SwitchButton, MilkTea, Coin, Collection, Connection } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { ElMessageBox } from 'element-plus'

// 检查是否在 Electron 环境中
const isElectron = !!window.electron

const route = useRoute()
const router = useRouter()
const showSidebar = computed(() => route.path !== '/login')

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 清除所有登录信息
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('oauth_state')
    
    if (!isElectron) {
      // 浏览器环境：清除 URL 参数
      const cleanUrl = window.location.origin + '/login'
      window.history.replaceState({}, document.title, cleanUrl)
    }
    
    // 跳转到登录页面
    await router.replace('/login')
    
  } catch (error) {
    // 用户取消退出登录，不做任何处理
  }
}

const minimizeWindow = () => {
  window.electron.ipcRenderer.send('minimize-window')
}

const maximizeWindow = () => {
  window.electron.ipcRenderer.send('maximize-window')
}

const closeWindow = () => {
  window.electron.ipcRenderer.send('close-window')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  user-select: none;
}

html, body {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: transparent;
}

#app {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.title-bar {
  height: 32px;
  min-height: 32px;
  background: #2b2b2b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  -webkit-app-region: drag;
  color: #fff;
  border-radius: 8px 8px 0 0;
  z-index: 9999;
  flex-shrink: 0;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
  gap: 8px;
  height: 100%;
  align-items: center;
}

.control-button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  -webkit-app-region: no-drag;
  transition: all 0.2s ease;
  background: transparent;
}

.control-button i {
  pointer-events: none;
  color: #fff;
  opacity: 0.8;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-button:hover i {
  opacity: 1;
}

.control-button.close:hover {
  background: #e81123;
}

.title {
  font-size: 13px;
  font-weight: 500;
  opacity: 0.9;
  margin-left: 8px;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.sidebar {
  width: 60px;
  background: #2b2b2b;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  flex-shrink: 0;
  height: 100%;
}

.avatar-section {
  margin-bottom: 20px;
}

.avatar {
  width: 40px;
  height: 40px;
  position: relative;
}

.avatar .el-avatar {
  background: #4a4a4a;
  color: #fff;
}

.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #44b549;
  border: 2px solid #2b2b2b;
  z-index: 1;
}

.nav-buttons {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.nav-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  cursor: pointer;
  border-radius: 10px;
  font-size: 18px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #383838;
  color: #fff;
}

.nav-item.active {
  background: #444;
  color: #fff;
}

.bottom-tools {
  margin-top: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
}

.tool-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  cursor: pointer;
  border-radius: 10px;
  font-size: 18px;
  transition: all 0.2s ease;
}

.tool-item:hover {
  background: #383838;
  color: #fff;
}

.tool-item.active {
  background: #444;
  color: #fff;
}

.el-icon {
  font-size: 18px;
}

.control-button .el-icon {
  font-size: 14px;
  color: #fff;
}

.full-content {
  width: 100%;
  height: 100vh;
}
</style>
