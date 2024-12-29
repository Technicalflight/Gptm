import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { dialog } from '@electron/remote'
import fs from 'fs'
import path from 'path'

// Custom APIs for renderer
const api = {
  // 发送 IPC 消息
  sendMessage: (channel: string, ...args: unknown[]) => {
    if (channel === 'ipc-on') {
      // 特殊处理 ipc-on 消息，用于添加事件监听器
      const [eventName, callback] = args
      if (typeof eventName === 'string' && typeof callback === 'function') {
        ipcRenderer.on(eventName, (_event, ...eventArgs) => callback(...eventArgs))
      }
    } else {
      ipcRenderer.send(channel, ...args)
    }
  },
  // 请求通知权限
  requestNotificationPermission: async () => {
    return await Notification.requestPermission()
  },
  // 发送通知
  sendNotification: (title: string, options: NotificationOptions) => {
    return new Notification(title, options)
  },
  // 选择目录
  selectDirectory: async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.filePaths[0]
  },
  // 备份数据
  backupData: async (backupPath: string) => {
    try {
      // 确保备份目录存在
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true })
      }

      // 获取所有聊天记录
      const chatData: Record<string, unknown> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('chat_')) {
          chatData[key] = localStorage.getItem(key)
        }
      }

      // 创建备份文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFile = path.join(backupPath, `chat_backup_${timestamp}.json`)
      
      fs.writeFileSync(backupFile, JSON.stringify(chatData, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error('备份失败:', error)
      return false
    }
  },
  // 清除聊天记录缓存
  clearChatCache: () => {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('chat_')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      return true
    } catch (error) {
      console.error('清除缓存失败:', error)
      return false
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
