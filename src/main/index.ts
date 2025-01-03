import { app, shell, BrowserWindow, ipcMain, Notification, globalShortcut, BaseWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initialize, enable } from '@electron/remote/main'
import { autoUpdater } from 'electron-updater'

// 初始化 @electron/remote
initialize()

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// 更新事件处理
autoUpdater.on('error', (error) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-error', error.message)
  }
})

autoUpdater.on('checking-for-update', () => {
  if (mainWindow) {
    mainWindow.webContents.send('checking-for-update')
  }
})

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info)
  }
})

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info)
  }
})

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj)
  }
})

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info)
  }
})

// 检查更新
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates()
})

// 开始下载
ipcMain.on('start-download', () => {
  autoUpdater.downloadUpdate()
})

// 安装更新
ipcMain.on('quit-and-install', () => {
  autoUpdater.quitAndInstall()
})

// 检查是否支持通知
if (Notification.isSupported()) {
  // 设置通知的应用名称
  app.setAppUserModelId(app.getName())
}

// 存储主窗口引用
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    transparent: true,
    titleBarStyle: 'customButtonsOnHover',
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  // 设置窗口最小尺寸
  mainWindow?.setMinimumSize(800, 600)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 启用 remote
  enable(mainWindow.webContents)
}

// 注册快捷键
function registerShortcut(accelerator: string): void {
  // 先注销所有已注册的快捷键
  globalShortcut.unregisterAll()

  try {
    // 将快捷键格式转换为 Electron 可识别的格式
    const electronAccelerator = accelerator
      .toLowerCase()
      .replace(/\s+\+\s+/g, '+')
      // 替换特殊键名
      .replace(/ctrl/i, 'CommandOrControl')
      .replace(/alt/i, 'Alt')
      .replace(/shift/i, 'Shift')
      .replace(/meta/i, 'Super')
      // 确保字母键大写
      .replace(/\+([a-z])$/, (_match, letter) => '+' + letter.toUpperCase())

    // 注册新的快捷键
    const ret = globalShortcut.register(electronAccelerator, () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
        }
        mainWindow.show()
        mainWindow.focus()
      }
    })

    if (!ret) {
      console.log('快捷键注册失败:', electronAccelerator)
    } else {
      console.log('快捷键注册成功:', electronAccelerator)
    }
  } catch (error) {
    console.error('快捷键注册错误:', error)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Window control
  ipcMain.on('minimize-window', () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.minimize()
  })

  ipcMain.on('maximize-window', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('close-window', () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.close()
  })

  // 处理快捷键更新
  ipcMain.on('update-shortcut', (_event, shortcut: string) => {
    // 将快捷键格式转换为 Electron 可识别的格式
    const accelerator = shortcut
      .toLowerCase()
      .replace(/\s+\+\s+/g, '+')
      .replace(/meta/i, 'Super')
    
    registerShortcut(accelerator)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 当应用退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// 添加 IPC 处理程序
ipcMain.handle('open-external', async (_event, url) => {
  try {
    // Create a new window for authorization
    const authWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      parent: mainWindow as BaseWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: 'persist:oauth'  // 使用持久化的 session
      }
    })

    // 设置默认的用户代理
    const session = authWindow.webContents.session
    const userAgent = authWindow.webContents.getUserAgent().replace(/Electron\/\S+\s/, '')
    session.setUserAgent(userAgent)

    // 监听所有 URL 变化
    const handleUrlChange = async (navigationUrl) => {
      // 检查是否是回调 URL（支持两种格式）
      const isCallback = navigationUrl.startsWith('http://localhost:5173/callback') || 
                        navigationUrl.startsWith('http://localhost:5173/?code=')
      
      if (isCallback) {
        try {
          const urlObj = new URL(navigationUrl)
          const code = urlObj.searchParams.get('code')
          const state = urlObj.searchParams.get('state')

          // 发送数据到主窗口
          if (mainWindow && code && state) {
            mainWindow.webContents.send('oauth-callback', { code, state })
            
            // 关闭授权窗口
            authWindow.destroy()
            
            // 刷新主窗口
            setTimeout(() => {
              if (mainWindow) {
                mainWindow.webContents.send('reload-main-window')
              }
            }, 1000)
          }
        } catch (error) {
          console.error('Error handling callback:', error)
          authWindow.destroy()
        }
      }
    }

    // 监听所有可能的导航事件
    authWindow.webContents.on('will-redirect', (_event, url) => {
      handleUrlChange(url)
    })

    authWindow.webContents.on('will-navigate', (_event, url) => {
      handleUrlChange(url)
    })

    // 处理加载错误
    authWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription)
      // 如果加载失败，尝试使用系统浏览器打开
      shell.openExternal(url).catch(console.error)
      authWindow.destroy()
    })

    // 直接加载授权 URL
    try {
      await authWindow.loadURL(url, {
        userAgent: userAgent,
        httpReferrer: 'https://github.com'
      })
      return { success: true }
    } catch (loadError) {
      console.error('Failed to load URL in auth window:', loadError)
      // 如果加载失败，尝试使用系统浏览器打开
      await shell.openExternal(url)
      authWindow.destroy()
      return { success: true }
    }
  } catch (error: unknown) {
    console.error('Failed to open external URL:', error)
    return { success: false, error: (error as Error).message }
  }
})

// 添加 Linux DO 授权处理
ipcMain.handle('open-linuxdo-auth', async (_event, url) => {
  try {
    // 创建授权窗口
    const authWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      parent: mainWindow || undefined,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        partition: 'persist:oauth'
      }
    })

    // 设置用户代理
    const session = authWindow.webContents.session
    const userAgent = authWindow.webContents.getUserAgent().replace(/Electron\/\S+\s/, '')
    session.setUserAgent(userAgent)

    // 监听 URL 变化
    const handleUrlChange = async (navigationUrl) => {
      if (navigationUrl.startsWith('http://localhost:5173/callback')) {
        try {
          const urlObj = new URL(navigationUrl)
          const code = urlObj.searchParams.get('code')
          const state = urlObj.searchParams.get('state')

          if (mainWindow && code && state) {
            mainWindow.webContents.send('oauth-callback', { code, state })
            // 关闭授权窗口
            authWindow.destroy()
            
            // 刷新主窗口
            setTimeout(() => {
              if (mainWindow) {
                mainWindow.webContents.send('reload-main-window')
              }
            }, 1000)
          }
        } catch (error) {
          console.error('Error handling callback:', error)
          authWindow.destroy()
        }
      }
    }

    // 监听导航事件
    authWindow.webContents.on('will-redirect', (_event, url) => {
      handleUrlChange(url)
    })

    authWindow.webContents.on('will-navigate', (_event, url) => {
      handleUrlChange(url)
    })

    // 加载授权 URL
    await authWindow.loadURL(url)
    return { success: true }
    
  } catch (error: unknown) {
    console.error('Failed to open Linux DO auth window:', error)
    return { success: false, error: (error as Error).message }
  }
})

// 添加密码对话框处理
ipcMain.on('show-password-dialog', async (event, message) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    event.reply('password-dialog-response', { response: 1, returnValue: '' });
    return;
  }

  const result = await dialog.showMessageBox(win, {
    title: '密码输入',
    message: message,
    type: 'question',
    buttons: ['确定', '取消'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    // 如果用户点击确定，打开一个新的对话框用于输入密码
    const promptResult = await dialog.showMessageBox(win, {
      title: '输入密码',
      message: '请输入密码：',
      type: 'question',
      buttons: ['确定', '取消'],
      defaultId: 0,
      cancelId: 1
    });

    event.reply('password-dialog-response', {
      response: promptResult.response,
      returnValue: promptResult.response === 0 ? 'dummy-password' : ''  // 实际应用中需要真实的密码输入
    });
  } else {
    event.reply('password-dialog-response', {
      response: 1,
      returnValue: ''
    });
  }
});

// Helper function to handle OAuth callbacks

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
