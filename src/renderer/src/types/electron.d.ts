interface Window {
  electron: typeof import('@electron-toolkit/preload').electronAPI
  api: {
    sendMessage: (channel: string, ...args: unknown[]) => void
    requestNotificationPermission: () => Promise<NotificationPermission>
    sendNotification: (title: string, options: NotificationOptions) => Notification
  }
} 