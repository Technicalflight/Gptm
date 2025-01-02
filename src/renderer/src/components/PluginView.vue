<template>
  <div class="plugin-container">
    <div class="plugin-header">
      <h2>插件管理</h2>
      <div class="header-buttons">
        <el-button @click="refreshPlugins">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
        <el-button type="primary" @click="openPluginMarket">
          <el-icon><Shop /></el-icon>插件市场
        </el-button>
        <el-button type="success" @click="openDevGuide">
          <el-icon><Document /></el-icon>开发指南
        </el-button>
        <el-button @click="importPlugin">
          <el-icon><Upload /></el-icon>导入插件
        </el-button>
        <el-button @click="exportPlugins">
          <el-icon><Download /></el-icon>导出插件
        </el-button>
      </div>
    </div>

    <!-- 插件列表 -->
    <div class="plugin-grid">
      <el-card v-for="plugin in plugins" :key="plugin.id" class="plugin-card">
        <div class="plugin-info">
          <div class="plugin-icon">
            <img :src="pluginIcons[plugin.id as keyof typeof pluginIcons] || defaultIcon" :alt="plugin.name">
          </div>
          <div class="plugin-details">
            <div class="plugin-name">{{ plugin.name }}</div>
            <div class="plugin-version">v{{ plugin.version }}</div>
            <div class="plugin-author">作者: {{ plugin.author }}</div>
            <div class="plugin-description">{{ plugin.description }}</div>
          </div>
        </div>
        <div class="plugin-actions">
          <el-switch
            v-model="plugin.enabled"
            @change="togglePlugin(plugin)"
            :loading="plugin.loading"
          />
          <el-button 
            type="primary" 
            text 
            @click="openPluginSettings(plugin)"
            :disabled="!plugin.enabled"
          >
            <el-icon><Setting /></el-icon>
          </el-button>
          <el-button 
            type="success" 
            text 
            @click="exportSinglePlugin(plugin)"
          >
            <el-icon><Download /></el-icon>
          </el-button>
          <el-button 
            type="danger" 
            text 
            @click="uninstallPlugin(plugin)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 插件设置弹窗 -->
    <el-dialog
      v-model="settingsVisible"
      :title="currentPlugin?.name + ' 设置'"
      width="500px"
    >
      <template v-if="currentPlugin">
        <div class="plugin-icon-upload">
          <div class="current-icon">
            <img 
              :src="currentPlugin.icon || pluginIcons[currentPlugin.id as keyof typeof pluginIcons] || defaultIcon" 
              :alt="currentPlugin.name"
            >
          </div>
          <div class="upload-actions">
            <el-upload
              class="icon-upload"
              accept="image/*"
              :show-file-list="false"
              :auto-upload="false"
              @change="(uploadFile) => currentPlugin && handleIconUpload(currentPlugin, uploadFile.raw)"
            >
              <el-button type="primary" size="small">
                <el-icon><Upload /></el-icon>
                更换图标
              </el-button>
            </el-upload>
            <el-button 
              type="info" 
              size="small" 
              @click="currentPlugin.icon = ''"
              v-if="currentPlugin.icon"
            >
              <el-icon><Delete /></el-icon>
              恢复默认
            </el-button>
          </div>
        </div>
        <el-divider />
        <el-form
          ref="settingsForm"
          :model="pluginSettings"
          label-width="100px"
        >
          <el-form-item
            v-for="(_value, key) in currentPlugin.config"
            :key="key"
            :label="key"
          >
            <el-input v-model="pluginSettings[key]" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="settingsVisible = false">取消</el-button>
          <el-button type="primary" @click="savePluginSettings">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 插件市场弹窗 -->
    <el-dialog
      v-model="marketVisible"
      title="插件市场"
      width="800px"
    >
      <div class="market-content">
        <div class="market-search">
          <el-input
            v-model="searchQuery"
            placeholder="搜索插件..."
            prefix-icon="Search"
          >
            <template #append>
              <el-button @click="searchPlugins">
                搜索
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="market-list">
          <el-card v-for="plugin in marketPlugins" :key="plugin.id" class="market-item">
            <div class="market-plugin-info">
              <img 
                :src="pluginIcons[plugin.id as keyof typeof pluginIcons] || defaultIcon" 
                :alt="plugin.name" 
                class="market-plugin-icon"
              >
              <div class="market-plugin-details">
                <div class="market-plugin-name">{{ plugin.name }}</div>
                <div class="market-plugin-version">v{{ plugin.version }}</div>
                <div class="market-plugin-author">作者: {{ plugin.author }}</div>
                <div class="market-plugin-description">{{ plugin.description }}</div>
              </div>
            </div>
            <div class="market-plugin-actions">
              <el-button 
                type="primary" 
                :disabled="isPluginInstalled(plugin)"
                @click="installPlugin(plugin)"
              >
                {{ isPluginInstalled(plugin) ? '已安装' : '安装' }}
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
    </el-dialog>

    <!-- 插件开发指南弹窗 -->
    <el-dialog
      v-model="devGuideVisible"
      title="插件开发指南"
      width="800px"
      class="dev-guide-dialog"
    >
      <div class="dev-guide-content">
        <h3>插件开发步骤</h3>
        <el-timeline>
          <el-timeline-item
            timestamp="步骤 1"
            placement="top"
          >
            <div class="step-content">
              <h4>创建插件配置文件</h4>
              <p>创建一个 plugin.json 文件，包含插件的基本信息：</p>
              <el-card class="code-block">
                <pre>{
  "id": "your-plugin-id",
  "name": "插件名称",
  "version": "1.0.0",
  "description": "插件功能描述",
  "author": "作者名称",
  "enabled": true,
  "config": {
    // 插件配置项
    "optionKey": "默认值"
  },
  "code": {
    "handle": "async function(content, context) { /* 处理逻辑 */ }"
  }
}</pre>
              </el-card>
            </div>
          </el-timeline-item>
          
          <el-timeline-item
            timestamp="步骤 2"
            placement="top"
          >
            <div class="step-content">
              <h4>实现插件处理函数</h4>
              <p>在 handle 函数中实现插件的核心逻辑：</p>
              <el-card class="code-block">
                <pre>async function (content, context) {
  try {
    // 检查插件配置
    if (!this.config.someOption) {
      return content;
    }
    
    // 实现插件逻辑
    let processedContent = content;
    
    // 示例：文本处理
    processedContent = processedContent.replace(
      /pattern/g,
      'replacement'
    );
    
    return processedContent;
  } catch (error) {
    console.error('插件处理失败:', error);
    return content;
  }
}</pre>
              </el-card>
            </div>
          </el-timeline-item>
          
          <el-timeline-item
            timestamp="步骤 3"
            placement="top"
          >
            <div class="step-content">
              <h4>配置项说明</h4>
              <p>插件配置项支持以下类型：</p>
              <el-card class="code-block">
                <pre>{
  "config": {
    "booleanOption": true,    // 开关类型
    "stringOption": "value",  // 文本类型
    "numberOption": 100,      // 数字类型
    "arrayOption": [],        // 数组类型
    "objectOption": {}        // 对象类型
  }
}</pre>
              </el-card>
            </div>
          </el-timeline-item>
          
          <el-timeline-item
            timestamp="步骤 4"
            placement="top"
          >
            <div class="step-content">
              <h4>插件示例</h4>
              <p>这里是一个完整的插件示例：</p>
              <el-card class="code-block">
                <pre>{
  "id": "text-replacer",
  "name": "文本替换插件",
  "version": "1.0.0",
  "description": "自动替换文本中的特定内容",
  "author": "Your Name",
  "enabled": true,
  "config": {
    "autoReplace": true,
    "replacements": {
      "hello": "你好",
      "world": "世界"
    }
  },
  "code": {
    "handle": "async function (content, context) {
      try {
        if (!this.config.autoReplace) {
          return content;
        }
        
        let result = content;
        const replacements = this.config.replacements;
        
        for (const [from, to] of Object.entries(replacements)) {
          result = result.replace(
            new RegExp(from, 'g'),
            to
          );
        }
        
        return result;
      } catch (error) {
        console.error('替换失败:', error);
        return content;
      }
    }"
  }
}</pre>
              </el-card>
            </div>
          </el-timeline-item>
        </el-timeline>
        
        <div class="dev-guide-footer">
          <h3>注意事项</h3>
          <el-alert
            title="插件安全"
            type="warning"
            description="插件代码会在用户环境中执行，请确保代码安全可靠，不包含恶意内容。"
            show-icon
            :closable="false"
            class="guide-alert"
          />
          <el-alert
            title="错误处理"
            type="info"
            description="始终包含适当的错误处理，确保插件在出错时能够优雅降级。"
            show-icon
            :closable="false"
            class="guide-alert"
          />
          <el-alert
            title="性能优化"
            type="info"
            description="处理大量数据时要注意性能，避免过度消耗系统资源。"
            show-icon
            :closable="false"
            class="guide-alert"
          />
          
          <h3>开发文档</h3>
          <p>查看完整的开发文档获取更多信息：</p>
          <div class="doc-links">
            <el-link 
              type="primary" 
              href="https://docs.gptm.dev/plugins/guide" 
              target="_blank"
            >
              <el-icon><Document /></el-icon>
              开发指南
            </el-link>
            <el-link 
              type="primary" 
              href="https://docs.gptm.dev/plugins/api" 
              target="_blank"
            >
              <el-icon><Connection /></el-icon>
              API 文档
            </el-link>
            <el-link 
              type="primary" 
              href="https://docs.gptm.dev/plugins/examples" 
              target="_blank"
            >
              <el-icon><Collection /></el-icon>
              示例代码
            </el-link>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Delete, Shop, Refresh, Document, Upload, Download, Connection, Collection} from '@element-plus/icons-vue'
import defaultIcon from '../assets/plugin-default.png'

interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  config: Record<string, any>
  icon?: string
  loading?: boolean
}

// 插件列表
const plugins = ref<Plugin[]>([])
const marketPlugins = ref<Plugin[]>([])
const currentPlugin = ref<Plugin | null>(null)
const settingsVisible = ref(false)
const marketVisible = ref(false)
const searchQuery = ref('')
const pluginSettings = ref<Record<string, any>>({})
const devGuideVisible = ref(false)

// 添加防抖控制变量
const toggleInProgress = ref<Record<string, boolean>>({})

// 加载插件列表
const loadPlugins = async () => {
  try {
    // 从本地存储加载插件数据
    const savedPlugins = localStorage.getItem('plugins')
    if (savedPlugins) {
      plugins.value = JSON.parse(savedPlugins)
    }
  } catch (error) {
    console.error('加载插件失败:', error)
    ElMessage.error('加载插件失败')
  }
}

// 刷新插件列表
const refreshPlugins = async () => {
  await loadPlugins()
  ElMessage.success('插件列表已刷新')
}

// 修改切换插件状态的方法
const togglePlugin = async (plugin: Plugin) => {
  // 如果该插件正在切换中，则不处理
  if (toggleInProgress.value[plugin.id]) {
    return;
  }

  try {
    toggleInProgress.value[plugin.id] = true;
    plugin.loading = true;
    
    // 这里添加启用/禁用插件的逻辑
    await new Promise(resolve => setTimeout(resolve, 500)); // 减少延时时间
    
    // 保存状态到本地存储
    localStorage.setItem('plugins', JSON.stringify(plugins.value));
    
    ElMessage.success(`${plugin.name} ${plugin.enabled ? '已启用' : '已禁用'}`);
  } catch (error) {
    console.error('切换插件状态失败:', error);
    plugin.enabled = !plugin.enabled; // 恢复状态
    ElMessage.error('操作失败');
  } finally {
    plugin.loading = false;
    toggleInProgress.value[plugin.id] = false;
  }
}

// 打开插件设置
const openPluginSettings = (plugin: Plugin) => {
  currentPlugin.value = plugin
  pluginSettings.value = { ...plugin.config }
  settingsVisible.value = true
}

// 保存插件设置
const savePluginSettings = async () => {
  if (!currentPlugin.value) return
  
  try {
    // 更新插件配置
    currentPlugin.value.config = { ...pluginSettings.value }
    
    // 保存到本地存储
    localStorage.setItem('plugins', JSON.stringify(plugins.value))
    
    settingsVisible.value = false
    ElMessage.success('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败')
  }
}

// 卸载插件
const uninstallPlugin = async (plugin: Plugin) => {
  try {
    await ElMessageBox.confirm(
      `确定要卸载 ${plugin.name} 吗？`,
      '卸载确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 从列表中移除插件
    const index = plugins.value.findIndex(p => p.id === plugin.id)
    if (index > -1) {
      plugins.value.splice(index, 1)
      // 更新本地存储
      localStorage.setItem('plugins', JSON.stringify(plugins.value))
      ElMessage.success('插件已卸载')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('卸载插件失败:', error)
      ElMessage.error('卸载失败')
    }
  }
}

// 打开插件市场
const openPluginMarket = () => {
  marketVisible.value = true
  loadMarketPlugins()
}

// 加载市场插件列表
const loadMarketPlugins = async () => {
  try {
    // 使用实际的插件数据
    marketPlugins.value = [
      {
        id: 'code-formatter',
        name: '代码格式化插件',
        version: '1.0.0',
        description: '自动检测并格式化代码块，支持多种编程语言',
        author: 'GPTM Team',
        enabled: false,
        config: {
          autoFormat: true,
          languages: ["javascript", "python", "java", "cpp", "html", "css"]
        },
        icon: defaultIcon
      },
      {
        id: 'translator',
        name: '快速翻译插件',
        version: '1.0.0',
        description: '通过特定命令快速翻译文本，支持多种语言互译',
        author: 'GPTM Team',
        enabled: false,
        config: {
          defaultSourceLang: "auto",
          defaultTargetLang: "zh",
          triggerCommand: "/tr"
        },
        icon: defaultIcon
      },
      {
        id: 'markdown-enhancer',
        name: 'Markdown美化增强',
        version: '1.0.0',
        description: '自动美化Markdown格式，添加目录，优化排版',
        author: 'GPTM Team',
        enabled: false,
        config: {
          autoToc: true,
          autoFormat: true,
          addLineSpacing: true
        },
        icon: defaultIcon
      }
    ]
  } catch (error) {
    console.error('加载市场插件失败:', error)
    ElMessage.error('加载市场插件失败')
  }
}

// 搜索插件
const searchPlugins = () => {
  // 这里添加搜索逻辑
  const query = searchQuery.value.toLowerCase()
  marketPlugins.value = marketPlugins.value.filter(plugin => 
    plugin.name.toLowerCase().includes(query) ||
    plugin.description.toLowerCase().includes(query)
  )
}

// 检查插件是否已安装
const isPluginInstalled = (plugin: Plugin) => {
  return plugins.value.some(p => p.id === plugin.id)
}

// 安装插件
const installPlugin = async (plugin: Plugin) => {
  try {
    // 这里添加安装插件的逻辑
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟异步操作
    
    // 添加到插件列表
    plugins.value.push({
      ...plugin,
      enabled: false,
      config: {}
    })
    
    // 更新本地存储
    localStorage.setItem('plugins', JSON.stringify(plugins.value))
    
    ElMessage.success('插件安装成功')
  } catch (error) {
    console.error('安装插件失败:', error)
    ElMessage.error('安装失败')
  }
}

// 打开开发指南
const openDevGuide = () => {
  devGuideVisible.value = true
}

// 导入插件
const importPlugin = async () => {
  try {
    // 首先显示免责声明
    try {
      await ElMessageBox.confirm(
        `<div class="disclaimer-content">
          <h3>插件导入免责声明</h3>
          <div class="disclaimer-main">
            <div class="disclaimer-icon">
              <el-icon class="warning-icon"><Warning /></el-icon>
            </div>
            <div class="disclaimer-text">
              <p class="disclaimer-intro">导入第三方插件可能存在安全风险，请注意：</p>
              <ol>
                <li>插件可能包含第三方代码，导入前请确认来源可靠</li>
                <li>插件将在您的环境中运行，可能访问本地资源</li>
                <li>我们不对第三方插件的安全性和可靠性负责</li>
                <li>建议仅导入来自可信来源的插件</li>
              </ol>
            </div>
          </div>
          <div class="disclaimer-warning">
            <el-icon><InfoFilled /></el-icon>
            <span>继续导入即表示您已了解并接受上述风险</span>
          </div>
        </div>`,
        {
          title: '安全提醒',
          confirmButtonText: '确认导入',
          cancelButtonText: '取消',
          dangerouslyUseHTMLString: true,
          customClass: 'disclaimer-dialog',
          type: 'warning',
          showClose: true,
          closeOnClickModal: false,
          closeOnPressEscape: false
        }
      )
    } catch (error) {
      // 用户取消导入
      return
    }

    // 创建文件选择器
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      
      if (!file) return
      
      try {
        const content = await file.text()
        const pluginData = JSON.parse(content)
        
        // 验证插件格式
        if (!validatePluginData(pluginData)) {
          throw new Error('无效的插件格式')
        }
        
        // 检查插件是否已存在
        if (plugins.value.some(p => p.id === pluginData.id)) {
          const action = await ElMessageBox.confirm(
            '插件已存在，是否覆盖？',
            '导入确认',
            {
              confirmButtonText: '覆盖',
              cancelButtonText: '取消',
              type: 'warning'
            }
          )
          
          if (action === 'confirm') {
            // 移除已存在的插件
            const index = plugins.value.findIndex(p => p.id === pluginData.id)
            if (index > -1) {
              plugins.value.splice(index, 1)
            }
          } else {
            return
          }
        }
        
        // 添加新插件
        plugins.value.push({
          ...pluginData,
          enabled: false
        })
        
        // 保存到本地存储
        localStorage.setItem('plugins', JSON.stringify(plugins.value))
        
        ElMessage.success('插件导入成功')
      } catch (error) {
        console.error('导入插件失败:', error)
        ElMessage.error('导入插件失败：' + (error instanceof Error ? error.message : '未知错误'))
      }
    }
    
    input.click()
  } catch (error) {
    console.error('导入插件失败:', error)
    ElMessage.error('导入插件失败')
  }
}

// 导出插件
const exportPlugins = async () => {
  try {
    // 如果没有插件，显示提示
    if (plugins.value.length === 0) {
      ElMessage.warning('没有可导出的插件')
      return
    }
    
    // 创建导出数据
    const exportData = plugins.value.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      config: plugin.config,
      icon: plugin.icon
    }))
    
    // 创建 Blob
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)], 
      { type: 'application/json' }
    )
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'gptm-plugins.json'
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('插件导出成功')
  } catch (error) {
    console.error('导出插件失败:', error)
    ElMessage.error('导出插件失败')
  }
}

// 验证插件数据
const validatePluginData = (data: any): boolean => {
  const requiredFields = ['id', 'name', 'version', 'description', 'author']
  return requiredFields.every(field => data[field])
}

// 导出单个插件
const exportSinglePlugin = async (plugin: Plugin) => {
  try {
    // 创建导出数据
    const exportData = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      config: plugin.config,
      icon: plugin.icon
    }
    
    // 创建 Blob
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)], 
      { type: 'application/json' }
    )
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${plugin.id}-${plugin.version}.json`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success(`插件 ${plugin.name} 导出成功`)
  } catch (error) {
    console.error('导出插件失败:', error)
    ElMessage.error('导出插件失败')
  }
}

// 在 script setup 部分修改图标处理
const pluginIcons = {
  'code-formatter': 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/code.svg',
  'translator': 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/translate.svg',
  'markdown-enhancer': 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/markdown.svg'
} as const;

// 组件加载时初始化
onMounted(() => {
  loadPlugins()
})

// 在 script setup 部分添加图标上传相关方法
const handleIconUpload = async (plugin: Plugin, file: File | undefined) => {
  if (!file) return;
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件');
    return;
  }
  
  // 验证文件大小（限制为 1MB）
  if (file.size > 1024 * 1024) {
    ElMessage.error('图片大小不能超过 1MB');
    return;
  }
  
  try {
    // 读取文件为 base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      // 更新插件图标
      plugin.icon = base64;
      
      // 保存到本地存储
      localStorage.setItem('plugins', JSON.stringify(plugins.value));
      
      ElMessage.success('图标更新成功');
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('图标上传失败:', error);
    ElMessage.error('图标上传失败');
  }
};
</script>

<style scoped>
.plugin-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.plugin-header h2 {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.header-buttons {
  display: flex;
  gap: 12px;
}

.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  padding: 0 10px;
  max-width: 1600px;
  margin: 0 auto;
}

.plugin-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.plugin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plugin-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex: 1;
}

.plugin-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ebeef5;
}

.plugin-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.plugin-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.plugin-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.plugin-version {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.plugin-author {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.plugin-description {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.market-content {
  padding: 0 20px;
}

.market-search {
  margin-bottom: 20px;
}

.market-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  max-width: 1600px;
  margin: 0 auto;
}

.market-item {
  border-radius: 8px;
}

.market-plugin-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.market-plugin-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  padding: 8px;
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  object-fit: contain;
}

.market-plugin-details {
  flex: 1;
}

.market-plugin-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.market-plugin-version {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.market-plugin-author {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.market-plugin-description {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.market-plugin-actions {
  display: flex;
  justify-content: flex-end;
}

.dev-guide-content {
  padding: 20px;
}

.step-content {
  margin-bottom: 20px;
}

.step-content h4 {
  margin-bottom: 10px;
  color: #333;
}

.code-block {
  margin: 10px 0;
  background: #f5f7fa;
}

.code-block pre {
  padding: 15px;
  margin: 0;
  font-family: monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.dev-guide-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.dev-guide-footer h3 {
  margin-bottom: 10px;
  color: #333;
}

.dev-guide-footer p {
  margin-bottom: 10px;
  color: #666;
}

.dev-guide-dialog {
  .el-dialog__body {
    padding: 20px 30px;
  }
}

.dev-guide-content {
  h3 {
    margin: 20px 0 15px;
    font-size: 18px;
    font-weight: 500;
    color: #333;
  }

  h4 {
    margin: 15px 0 10px;
    font-size: 16px;
    font-weight: 500;
    color: #444;
  }
}

.code-block {
  margin: 10px 0;
  background: #f8f9fa;
  
  pre {
    padding: 15px;
    margin: 0;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: #333;
  }
}

.guide-alert {
  margin: 10px 0;
}

.doc-links {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  
  .el-link {
    display: flex;
    align-items: center;
    gap: 5px;
  }
}

.step-content {
  p {
    color: #666;
    margin: 10px 0;
    line-height: 1.5;
  }
}

/* 添加免责声明样式 */
:deep(.disclaimer-dialog) {
  .el-message-box {
    max-width: 580px;
    padding: 0;
  }

  .el-message-box__header {
    padding: 20px 20px 10px;
    background: #fff7ed;
    
    .el-message-box__title {
      font-size: 18px;
      color: #f56c6c;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
  
  .el-message-box__content {
    padding: 0;
  }
  
  .disclaimer-content {
    h3 {
      font-size: 18px;
      font-weight: 500;
      color: #333;
      padding: 16px 20px;
      margin: 0;
      border-bottom: 1px solid #eee;
    }

    .disclaimer-main {
      display: flex;
      gap: 20px;
      padding: 20px;
      
      .disclaimer-icon {
        .warning-icon {
          font-size: 48px;
          color: #e6a23c;
        }
      }
      
      .disclaimer-text {
        flex: 1;
        
        .disclaimer-intro {
          font-size: 15px;
          color: #333;
          margin: 0 0 16px;
          font-weight: 500;
        }
        
        ol {
          padding-left: 20px;
          margin: 0;
          
          li {
            color: #666;
            line-height: 1.8;
            margin: 8px 0;
            padding-left: 8px;
          }
        }
      }
    }
    
    .disclaimer-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 12px 20px;
      background: #fef0f0;
      color: #f56c6c;
      font-weight: 500;
      font-size: 14px;
      border-top: 1px solid #fde2e2;
      
      .el-icon {
        font-size: 16px;
      }
    }
  }

  .el-message-box__btns {
    padding: 12px 20px;
    border-top: 1px solid #eee;
  }
}

.plugin-icon-upload {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.current-icon {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ebeef5;
  padding: 12px;
}

.current-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.upload-actions {
  display: flex;
  gap: 8px;
}

.icon-upload {
  :deep(.el-upload) {
    width: auto;
  }
}

.el-divider {
  margin: 16px 0;
}
</style> 