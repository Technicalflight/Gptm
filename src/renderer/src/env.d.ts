/// <reference types="vite/client" />

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
  files: Array<{ url: string }>;
}

interface Window {
  electron: {
    ipcRenderer: {
      on: (channel: string, func: (...args: any[]) => void) => void;
      send: (channel: string, ...args: any[]) => void;
    }
  }
  api: {
    sendMessage: (channel: string, ...args: any[]) => void
    requestNotificationPermission: () => Promise<NotificationPermission>
    sendNotification: (title: string, options: NotificationOptions) => Notification
    selectDirectory: () => Promise<string>
    backupData: (backupPath: string) => Promise<boolean>
    clearChatCache: () => Promise<boolean>
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}
