<template>
  <div class="login-container">
    <div class="login-content">
      <div class="logo-container">
        <img src="../assets/logo.jpg" alt="Logo" class="logo" />
      </div>
      <div class="login-box">
        <div class="login-header">
          <h2>登录</h2>
          <p class="subtitle">使用以下方式登录</p>
        </div>
        
        <div class="oauth-buttons">
          <el-button
            type="primary"
            class="github-button"
            @click="handleGithubLogin"
            :loading="loading.github"
          >
            <el-icon class="github-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path></svg></el-icon>
            使用 GitHub 账号登录
          </el-button>

          <el-button
            style="margin-left: 0px;"
            type="primary"
            class="linuxdo-button"
            @click="handleLinuxDOLogin"
            :loading="loading.linuxdo"
          >
            <el-icon class="linuxdo-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2L2 19h20L12 2zm0 3.84L19.16 17H4.84L12 5.84zM11 10v3h2v-3h-2zm0 4v2h2v-2h-2z"></path></svg></el-icon>
            使用 Linux DO 账号登录
          </el-button>

          <div class="agreement-section">
            <el-checkbox v-model="agreedToTerms" @change="handleAgreementChange">
              我已阅读并同意
              <el-link type="primary" :underline="false" @click="showUserAgreement">《用户协议》</el-link>
              和
              <el-link type="primary" :underline="false" @click="showPrivacyPolicy">《隐私政策》</el-link>
            </el-checkbox>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

// 定义 IPC 返回值类型
interface IpcResult {
  success: boolean
  error?: string
}

// 定义事件类型
interface IpcEvent {
  sender: unknown
}

interface OAuthCallback {
  code: string
  state: string
}

// 引入 electron IPC
declare const window: Window & {
  electron: {
    ipcRenderer: {
      invoke: (channel: string, url: string) => Promise<IpcResult>
      on: (channel: string, callback: (event: IpcEvent, data: OAuthCallback) => void) => void
      removeListener: (channel: string, callback: (event: IpcEvent, data: OAuthCallback) => void) => void
    }
  }
}

const router = useRouter()
const loading = reactive({
  github: false,
  linuxdo: false
})

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx'
const GITHUB_REDIRECT_URI = 'http://localhost:5173'

// Linux DO OAuth 配置
const LINUXDO_CLIENT_ID = 'xxxxxxxxxxxxxxxxxxx'
const LINUXDO_REDIRECT_URI = 'http://localhost:5173/callback'
const LINUXDO_AUTH_ENDPOINT = 'https://connect.linux.do/oauth2/authorize'

// 生成随机状态值
const generateState = () => {
  const array = new Uint8Array(16)
  window.crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// 检查是否在 Electron 环境中
const isElectron = !!window.electron

const agreedToTerms = ref(false)

// 处理协议勾选变化
const handleAgreementChange = (value: boolean) => {
  if (!value) {
    ElMessage.warning('请阅读并同意用户协议和隐私政策')
  }
}

// 处理 GitHub 登录
const handleGithubLogin = async () => {
  if (!agreedToTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议和隐私政策')
    return
  }
  try {
    loading.github = true
    const state = generateState()
    localStorage.setItem('oauth_state', state)
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=user&state=${state}&response_type=code`
    
    if (isElectron) {
      const result = await window.electron.ipcRenderer.invoke('open-external', githubAuthUrl)
      if (!result.success) {
        throw new Error(result.error || '打开授权页面失败')
      }
    }
  } catch (error: unknown) {
    console.error('GitHub 跳转失败:', error)
    ElMessage.error('GitHub 跳转失败，请重试')
  } finally {
    loading.github = false
  }
}

// 处理 Linux DO 登录
const handleLinuxDOLogin = async () => {
  if (!agreedToTerms.value) {
    ElMessage.warning('请先阅读并同意用户协议和隐私政策')
    return
  }
  try {
    loading.linuxdo = true
    const state = generateState()
    localStorage.setItem('oauth_state', state)
    
    // 构造授权 URL
    const authUrl = `${LINUXDO_AUTH_ENDPOINT}?client_id=${LINUXDO_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(LINUXDO_REDIRECT_URI)}&state=${state}&scope=user`
    
    if (isElectron) {
      const result = await window.electron.ipcRenderer.invoke('open-linuxdo-auth', authUrl)
      if (!result.success) {
        throw new Error(result.error || '打开授权页面失败')
      }
    }
  } catch (error: unknown) {
    console.error('Linux DO 跳转失败:', error)
    ElMessage.error('Linux DO 跳转失败，请重试')
  } finally {
    loading.linuxdo = false
  }
}

// 处理 OAuth 回调
const handleOAuthCallback = async (data: { code: string; state: string }) => {
  const { state } = data
  const savedState = localStorage.getItem('oauth_state')
  
  // 只对 GitHub 登录进行状态值校验
  if (window.location.href.includes('github') && state !== savedState) {
    ElMessage.error('无效的状态值，请重试')
    return
  }

  try {
    // 这里需要调用后端 API 来交换访问令牌
    // 为了演示，我们直接模拟登录成功
    const mockUser = {
      username: 'OAuth User',
      avatar: '',
      provider: window.location.href.includes('github') ? 'github' : 'linuxdo'
    }
    
    // 保存用户信息和token
    localStorage.setItem('token', 'oauth-token')
    localStorage.setItem('user', JSON.stringify(mockUser))
    
    // 清除状态值
    localStorage.removeItem('oauth_state')
    
    ElMessage.success('登录成功')
    
    // 不需要手动跳转，主进程会自动刷新窗口
    
  } catch (error: unknown) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.linuxdo = false
    loading.github = false
  }
}

// 在组件挂载时添加事件监听
onMounted(() => {
  if (isElectron) {
    // 监听 OAuth 回调
    const handleCallback = (_event: IpcEvent, data: OAuthCallback) => {
      handleOAuthCallback(data)
    }
    window.electron.ipcRenderer.on('oauth-callback', handleCallback)

    // 监听重新加载事件
    const handleReload = () => {
      router.replace('/')
    }
    window.electron.ipcRenderer.on('reload-main-window', handleReload)

    // 保存回调函数引用以便卸载时移除
    onUnmounted(() => {
      window.electron.ipcRenderer.removeListener('oauth-callback', handleCallback)
      window.electron.ipcRenderer.removeListener('reload-main-window', handleReload)
    })
  }
})

// 显示用户协议
const showUserAgreement = () => {
  ElMessageBox.alert(`
<div class="agreement-content">
  <h3>用户协议</h3>
  
  <div class="section">
    <h4>1. 总则</h4>
    <p>1.1 本协议是您与本软件之间关于使用本软件服务所订立的协议。</p>
    <p>1.2 本软件仅作为第三方工具提供服务，不对任何第三方服务的可用性、准确性和安全性负责。</p>
  </div>

  <div class="section">
    <h4>2. 免责声明</h4>
    <p>2.1 本软件不对使用过程中的数据丢失、系统中断或任何其他不便承担责任。</p>
    <p>2.2 用户在使用本软件时造成的任何直接或间接损失，本软件不承担任何责任。</p>
    <p>2.3 本软件不对第三方服务的中断、故障或其他问题承担责任。</p>
    <p>2.4 用户使用本软件处理的所有内容和后果由用户自行承担。</p>
  </div>

  <div class="section">
    <h4>3. 服务变更、中断或终止</h4>
    <p>3.1 本软件有权随时修改或中断服务而无需通知用户。</p>
    <p>3.2 本软件不对服务的中断或终止承担任何赔偿责任。</p>
  </div>

  <div class="section">
    <h4>4. 用户行为规范</h4>
    <p>4.1 用户应遵守所有使用互联网的相关法律法规。</p>
    <p>4.2 用户不得利用本软件从事任何违法或不当行为。</p>
  </div>

  <div class="section">
    <h4>5. 其他条款</h4>
    <p>5.1 本协议的解释权归本软件所有。</p>
    <p>5.2 使用本软件即表示接受本协议的所有条款。</p>
  </div>
</div>`, '用户协议', {
    confirmButtonText: '我知道了',
    dangerouslyUseHTMLString: true,
    customClass: 'agreement-dialog'
  })
}

// 显示隐私政策
const showPrivacyPolicy = () => {
  ElMessageBox.alert(`
<div class="agreement-content">
  <h3>隐私政策</h3>

  <div class="section">
    <h4>1. 信息收集</h4>
    <p>1.1 本软件仅收集必要的用户授权信息。</p>
    <p>1.2 本软件不会主动收集或存储用户的个人敏感信息。</p>
  </div>

  <div class="section">
    <h4>2. 信息使用</h4>
    <p>2.1 收集的信息仅用于用户身份验证和服务提供。</p>
    <p>2.2 本软件不会将用户信息用于其他商业用途。</p>
  </div>

  <div class="section">
    <h4>3. 信息安全</h4>
    <p>3.1 本软件会采取合理措施保护用户信息安全。</p>
    <p>3.2 但不对因不可抗力导致的信息泄露承担责任。</p>
  </div>

  <div class="section">
    <h4>4. 免责声明</h4>
    <p>4.1 用户通过第三方服务登录时，相关信息的收集和使用由第三方的隐私政策约束。</p>
    <p>4.2 本软件不对第三方的隐私保护承担责任。</p>
    <p>4.3 用户应自行承担使用本软件所产生的风险。</p>
  </div>

  <div class="section">
    <h4>5. 信息共享</h4>
    <p>5.1 除法律法规要求外，本软件不会主动共享用户信息。</p>
    <p>5.2 用户授权的第三方服务除外。</p>
  </div>

  <div class="section">
    <h4>6. 政策更新</h4>
    <p>6.1 本政策可能随时更新，更新后的政策立即生效。</p>
    <p>6.2 继续使用本软件即表示同意更新后的政策。</p>
  </div>
</div>`, '隐私政策', {
    confirmButtonText: '我知道了',
    dangerouslyUseHTMLString: true,
    customClass: 'agreement-dialog'
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f7fa;
  -webkit-app-region: drag;
}

.login-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  -webkit-app-region: no-drag;
}

.logo-container {
  width: 180px;
  height: 180px;
  margin-bottom: 30px;
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.login-box {
  width: 400px;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-header h2 {
  font-size: 24px;
  color: #333;
  font-weight: 500;
  margin: 0 0 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.oauth-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px;
}

.github-button,
.linuxdo-button {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.github-button {
  background: #24292e;
  border-color: #24292e;
}

.github-button:hover {
  background: #2c3238;
  border-color: #2c3238;
}

.linuxdo-button {
  background: #2b5b84;
  border-color: #2b5b84;
}

.linuxdo-button:hover {
  background: #326699;
  border-color: #326699;
}

.github-icon,
.linuxdo-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agreement-section {
  margin-top: 16px;
  padding: 0 8px;
  font-size: 13px;
  color: #666;
}

.agreement-section .el-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
}

.agreement-section .el-link {
  font-size: 13px;
  padding: 0 2px;
}

.agreement-section :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #666;
}

:deep(.agreement-dialog) {
  max-width: 600px;
}

:deep(.agreement-dialog .el-message-box__content) {
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
}

:deep(.agreement-content) {
  text-align: left;
  color: #333;
}

:deep(.agreement-content h3) {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 20px;
  text-align: center;
}

:deep(.agreement-content .section) {
  margin-bottom: 20px;
}

:deep(.agreement-content h4) {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #1a1a1a;
}

:deep(.agreement-content p) {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
  color: #333;
  padding-left: 8px;
}
</style> 
