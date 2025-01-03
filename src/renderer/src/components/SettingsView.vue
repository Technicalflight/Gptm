<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>设置</h2>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <h3 class="section-title">常规设置</h3>
        <div class="settings-item">
          <span class="item-label">消息提醒</span>
          <el-switch v-model="notifications" @change="toggleNotifications" />
        </div>
      </div>

      <div class="settings-section">
        <h3 class="section-title">快捷键设置</h3>
        <div class="settings-item">
          <span class="item-label">打开主窗口</span>
          <div class="shortcut-input">
            <el-input 
              v-model="shortcutOpen" 
              placeholder="Ctrl + Shift + G" 
              readonly
              @keydown.stop="recordShortcut"
              @focus="isRecording = true"
              @blur="isRecording = false"
            />
            <el-button @click="resetShortcut">重置</el-button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="section-title">数据管理</h3>
        <div class="settings-item">
          <span class="item-label">自动备份</span>
          <el-switch v-model="autoBackup" @change="toggleAutoBackup" />
        </div>
        <div class="settings-item">
          <span class="item-label">备份位置</span>
          <div class="backup-path-input">
            <el-input v-model="backupPath" placeholder="选择备份目录" readonly />
            <el-button @click="selectBackupPath">选择目录</el-button>
          </div>
        </div>
        <div class="settings-item">
          <span class="item-label">清除缓存</span>
          <el-button type="danger" plain @click="clearCache">清除缓存</el-button>
        </div>
      </div>

      <div class="settings-section">
        <h2>关于</h2>
        <div class="app-info">
          <p class="version">版本: 1.0.0</p>
          <p class="author">作者: Technicalflight</p>
          <el-button type="primary" size="small" @click="checkUpdate">检查更新</el-button>
        </div>

        <div class="divider"></div>

        <div class="roadmap">
          <h3>功能发展方向（欢迎在Github上提出建议）</h3>
          <div class="feature-list">
            <div class="feature-category">
              <div class="category-header">
                <el-icon><Check /></el-icon>
                <span>已实现功能</span>
              </div>
              <div class="feature-grid">
                <div class="feature-item implemented">
                  <span>🔑 GitHub OAuth 登录支持</span>
                </div>
                <div class="feature-item implemented">
                  <span>🔐 Linux DO OAuth 登录支持</span>
                </div>
                <div class="feature-item implemented">
                  <span>🔄 自动更新功能</span>
                </div>
                <div class="feature-item implemented">
                  <span>💾 数据自动备份</span>
                </div>
                <div class="feature-item implemented">
                  <span>⌨️ 快捷键自定义</span>
                </div>
                <div class="feature-item implemented">
                  <span>🔔 消息通知提醒</span>
                </div>
                <div class="feature-item implemented">
                  <span>📝 Markdown 语法支持</span>
                </div>
                <div class="feature-item implemented">
                  <span>✨ 代码高亮显示</span>
                </div>
                <div class="feature-item implemented">
                  <span>📤 文件上传功能</span>
                </div>
                <div class="feature-item implemented">
                  <span>🔌 插件系统</span>
                </div>
                <div class="feature-item implemented">
                  <span>💬 聊天记录本地存储</span>
                </div>
                <div class="feature-item implemented">
                  <span>📜 用户协议与隐私政策</span>
                </div>
              </div>
            </div>

            <div class="feature-category">
              <div class="category-header">
                <el-icon><Timer /></el-icon>
                <span>开发计划</span>
              </div>
              <div class="feature-grid">
                <div class="feature-item planned">
                  <span>🌍 多语言支持</span>
                </div>
                <div class="feature-item planned">
                  <span>🎨 主题自定义</span>
                </div>
                <div class="feature-item planned">
                  <span>📱 移动端适配</span>
                </div>
                <div class="feature-item planned">
                  <span>🎯 快捷回复功能</span>
                </div>
                <div class="feature-item planned">
                  <span>📊 数据统计分析</span>
                </div>
                <div class="feature-item planned">
                  <span>🔍 高级搜索功能</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="open-source">
          <h3>开源致谢</h3>
          <p class="description">本项目致谢以下优秀的开源项目（排名不分先后，若有遗漏，请见谅，欢迎补充）：</p>
          
          <div class="libs-list">
            <template v-for="category in [...new Set(openSourceLibs.map(lib => lib.category))]" :key="category">
              <div class="category-title">{{ category }}</div>
              <div class="lib-item" v-for="lib in openSourceLibs.filter(l => l.category === category)" :key="lib.name">
                <el-link type="primary" :href="lib.url" target="_blank">{{ lib.name }}</el-link>
                <span class="lib-desc">{{ lib.description }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Timer } from '@element-plus/icons-vue'

// 获取之前保存的通知设置
const notifications = ref(localStorage.getItem('notifications') === 'true')

// 切换通知状态
const toggleNotifications = async (value: boolean) => {
  try {
    // 如果开启通知，先请求权限
    if (value) {
      // 检查通知权限
      const permission = await window.api.requestNotificationPermission()
      if (permission === 'granted') {
        // 保存设置
        localStorage.setItem('notifications', 'true')
        // 显示测试通知
        window.api.sendNotification('通知已开启', {
          body: '这是一条测试通知',
          icon: '/path/to/icon.png'
        })
        ElMessage.success('已开启消息提醒')
      } else {
        // 如果用户拒绝了通知权限，将开关状态设回关闭
        notifications.value = false
        localStorage.setItem('notifications', 'false')
        ElMessage.error('通知权限被拒绝')
      }
    } else {
      // 关闭通知
      localStorage.setItem('notifications', 'false')
      ElMessage.success('已关闭消息提醒')
    }
  } catch (error) {
    console.error('切换通知状态失败:', error)
    ElMessage.error('切换通知状态失败')
    notifications.value = false
    localStorage.setItem('notifications', 'false')
  }
}

// 组件加载时查通知权限
onMounted(async () => {
  if (notifications.value) {
    const permission = await window.api.requestNotificationPermission()
    if (permission !== 'granted') {
      notifications.value = false
      localStorage.setItem('notifications', 'false')
    }
  }
})

// 快捷键设置
const shortcutOpen = ref(localStorage.getItem('shortcutOpen') || 'Ctrl + Shift + G')
const isRecording = ref(false)

// 记录快捷键
const recordShortcut = (e: KeyboardEvent) => {
  e.preventDefault()
  if (!isRecording.value) return
  const modifiers: string[] = []
  if (e.ctrlKey) modifiers.push('Ctrl')
  if (e.shiftKey) modifiers.push('Shift') 
  if (e.altKey) modifiers.push('Alt')
  if (e.metaKey) modifiers.push('Meta')

  const key = e.key.toUpperCase()
  if (!['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) {
    const shortcut = [...modifiers, key].join(' + ')
    shortcutOpen.value = shortcut
    
    // 保存到 localStorage
    localStorage.setItem('shortcutOpen', shortcut)
    
    // 通知主进程更新快捷键
    window.api.sendMessage('update-shortcut', shortcut)
    
    ElMessage.success('快捷键设置成功')
  }
}

// 重置快捷键
const resetShortcut = () => {
  const defaultShortcut = 'Ctrl + Shift + G'
  shortcutOpen.value = defaultShortcut
  localStorage.setItem('shortcutOpen', defaultShortcut)
  window.api.sendMessage('update-shortcut', defaultShortcut)
  ElMessage.success('快捷键已重置')
}

// 组件加载时设置快捷键
onMounted(() => {
  const savedShortcut = localStorage.getItem('shortcutOpen')
  if (savedShortcut) {
    window.api.sendMessage('update-shortcut', savedShortcut)
  }
})

const autoBackup = ref(localStorage.getItem('autoBackup') === 'true')
const backupPath = ref(localStorage.getItem('backupPath') || '')

// 切换自动备份
const toggleAutoBackup = async (value: boolean) => {
  try {
    if (value && !backupPath.value) {
      // 如果开启自动备份但没有设置备份路径，提示选择路径
      const path = await selectBackupPath()
      if (!path) {
        autoBackup.value = false
        return
      }
    }
    
    localStorage.setItem('autoBackup', value.toString())
    if (value) {
      // 开启时立即进行一次备份
      await performBackup()
      ElMessage.success('已开启自动备份')
    } else {
      ElMessage.success('已关闭自动备份')
    }
  } catch (error) {
    console.error('切换自动备份失败:', error)
    ElMessage.error('切换自动备份失败')
    autoBackup.value = false
    localStorage.setItem('autoBackup', 'false')
  }
}

// 选择备份路径
const selectBackupPath = async () => {
  try {
    const path = await window.api.selectDirectory()
    if (path) {
      backupPath.value = path
      localStorage.setItem('backupPath', path)
      ElMessage.success('备份路径设置成功')
      return path
    }
  } catch (error) {
    console.error('选择备份路径失败:', error)
    ElMessage.error('选择备份路径失败')
  }
  return null
}

// 执行备份
const performBackup = async () => {
  if (!backupPath.value) {
    ElMessage.error('请先选择备份路径')
    return false
  }

  try {
    const success = await window.api.backupData(backupPath.value)
    if (success) {
      ElMessage.success('备份成功')
      return true
    } else {
      throw new Error('备份失败')
    }
  } catch (error) {
    console.error('备份失败:', error)
    ElMessage.error('备份失败')
    return false
  }
}

// 清除聊天记录缓存
const clearCache = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有聊天记录吗？此操作不可恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const success = await window.api.clearChatCache()
    if (success) {
      ElMessage.success('聊天记录已清除')
    } else {
      throw new Error('清除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清除缓存失败:', error)
      ElMessage.error('清除缓存失败')
    }
  }
}

// 定时备份
let backupInterval: NodeJS.Timeout | null = null

// 启动定时备份
const startAutoBackup = () => {
  if (autoBackup.value && backupPath.value) {
    // 每小时执行一次备份
    backupInterval = setInterval(performBackup, 60 * 60 * 1000)
  }
}

// 停止定时备份
const stopAutoBackup = () => {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
  }
}

// 组件挂载时启动自动备份
onMounted(() => {
  if (autoBackup.value) {
    startAutoBackup()
  }
})

// 组件卸载时停止自动备份
onUnmounted(() => {
  stopAutoBackup()
})

// 检查更新
const checkUpdate = () => {
  ElMessage.info('正在检查更新...')
  window.api.sendMessage('check-for-updates')
}

// 更新状态
const updateAvailable = ref(false)
const downloadProgress = ref(0)
const updateInfo = ref<any>(null)
const isDownloading = ref(false)

// 监听更新事件
const setupUpdateListeners = () => {
  // 检查更新
  window.api.sendMessage('ipc-on', 'checking-for-update', () => {
    ElMessage.info('正在检查更新...')
  })

  // 有可用更新
  window.api.sendMessage('ipc-on', 'update-available', (info) => {
    updateAvailable.value = true
    updateInfo.value = info
    ElMessageBox.confirm(
      `发现新版本 ${info.version}\n\n更新内容：\n${info.releaseNotes || '暂无更新说明'}`,
      '更新提示',
      {
        confirmButtonText: '立即更新',
        cancelButtonText: '稍后再说',
        type: 'info'
      }
    ).then(() => {
      isDownloading.value = true
      window.api.sendMessage('start-download')
    }).catch(() => {
      ElMessage.info('已取消更新')
    })
  })

  // 没有可用更新
  window.api.sendMessage('ipc-on', 'update-not-available', () => {
    ElMessage.success('当前已是最新版本')
  })

  // 下载进度
  window.api.sendMessage('ipc-on', 'download-progress', (progressObj) => {
    downloadProgress.value = progressObj.percent
  })

  // 更新已下载
  window.api.sendMessage('ipc-on', 'update-downloaded', () => {
    isDownloading.value = false
    ElMessageBox.confirm(
      '更新已下载完成，是否立即安装？',
      '安装确认',
      {
        confirmButtonText: '立即安装',
        cancelButtonText: '稍后安装',
        type: 'success'
      }
    ).then(() => {
      window.api.sendMessage('quit-and-install')
    })
  })

  // 更新错误
  window.api.sendMessage('ipc-on', 'update-error', (error) => {
    isDownloading.value = false
    ElMessage.error(`更新失败: ${error}`)
  })
}

// 组件挂载时设置监听器
onMounted(() => {
  setupUpdateListeners()
  if (autoBackup.value) {
    startAutoBackup()
  }
})

interface OpenSourceLib {
  name: string
  url: string
  description: string
  category?: string
}

const openSourceLibs: OpenSourceLib[] = [
  // 核心框架
  {
    name: 'Vue.js',
    url: 'https://github.com/vuejs/core',
    description: '渐进式 JavaScript 框架',
    category: '核心框架'
  },
  {
    name: 'Element Plus',
    url: 'https://github.com/element-plus/element-plus',
    description: '基于 Vue 3 的组件库',
    category: '核心框架'
  },
  {
    name: 'Electron',
    url: 'https://github.com/electron/electron',
    description: '使用 JavaScript 构建跨平台桌面应用',
    category: '核心框架'
  },
  {
    name: 'electron-vite',
    url: 'https://github.com/alex8088/electron-vite',
    description: 'Electron + Vite 整合框架',
    category: '核心框架'
  },
  // 路由和状态管理
  {
    name: 'Vue Router',
    url: 'https://github.com/vuejs/router',
    description: 'Vue.js 官方路由管理器',
    category: '路由和状态管理'
  },
  {
    name: 'Pinia',
    url: 'https://github.com/vuejs/pinia',
    description: '符合直觉的 Vue.js 状态管理库',
    category: '路由和状态管理'
  },
  // 开发工具
  {
    name: 'TypeScript',
    url: 'https://github.com/microsoft/TypeScript',
    description: 'JavaScript 的超集，添加可选的静态类型',
    category: '开发工具'
  },
  {
    name: 'Vite',
    url: 'https://github.com/vitejs/vite',
    description: '下一代前端开发与构建工具',
    category: '开发工具'
  },
  // 工具库
  {
    name: 'Axios',
    url: 'https://github.com/axios/axios',
    description: '基于 Promise 的 HTTP 客户端',
    category: '工具库'
  },
  {
    name: 'dayjs',
    url: 'https://github.com/iamkun/dayjs',
    description: '轻量的日期处理库',
    category: '工具库'
  },
  {
    name: 'markdown-it',
    url: 'https://github.com/markdown-it/markdown-it',
    description: 'Markdown 解析器',
    category: '工具库'
  },
  // UI 组件
  {
    name: '@vueuse/core',
    url: 'https://github.com/vueuse/vueuse',
    description: 'Vue Composition API 工具集',
    category: 'UI 组件'
  },
  {
    name: 'highlight.js',
    url: 'https://github.com/highlightjs/highlight.js',
    description: '代码语法高亮库',
    category: 'UI 组件'
  }
]
</script>

<style scoped>
.settings-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  width: 100%;
}

.settings-header {
  margin-bottom: 24px;
}

.settings-header h2 {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.settings-content {
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 20px;
}

.settings-item:last-child {
  margin-bottom: 0;
}

.item-label {
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
  width: 100px;
}

.backup-path-input {
  display: flex;
  gap: 8px;
  flex: 1;
}

.app-info {
  margin-bottom: 24px;
}

.divider {
  height: 1px;
  background-color: #eee;
  margin: 20px 0;
}

.version, .author {
  margin-bottom: 12px;
  color: #666;
  font-size: 14px;
}

.open-source {
  margin-top: 24px;
}

.open-source h3 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
}

.description {
  font-size: 14px;
  color: #666;
  margin-bottom: 16px;
}

.libs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lib-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lib-desc {
  font-size: 13px;
  color: #666;
}

.el-link {
  font-size: 14px;
  min-width: 120px;
}

:deep(.el-input) {
  width: 200px;
}

:deep(.el-switch) {
  margin-right: 8px;
}

.shortcut-input {
  display: flex;
  gap: 8px;
  width: 300px;
}

:deep(.el-input.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.category-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin: 16px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.category-title:first-child {
  margin-top: 0;
}

.libs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lib-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.roadmap {
  margin: 24px 0;
}

.roadmap h3 {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 20px;
  color: #333;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-category {
  background: #f8f9fc;
  border-radius: 8px;
  padding: 16px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.category-header .el-icon {
  font-size: 18px;
}

.category-header :deep(.check) {
  color: #67c23a;
}

.category-header :deep(.timer) {
  color: #409eff;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.feature-item {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  cursor: default;
}

.feature-item span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-item.implemented {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
  border: 1px solid rgba(103, 194, 58, 0.2);
}

.feature-item.implemented:hover {
  background: rgba(103, 194, 58, 0.15);
  transform: translateY(-1px);
}

.feature-item.planned {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.feature-item.planned:hover {
  background: rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
}
</style> 