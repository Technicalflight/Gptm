<template>
  <div class="chat-container">
    <!-- 聊天列表区域 -->
    <div class="chat-list">
      <div class="search-bar">
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索模型..." 
        />
        <el-icon class="search-icon"><Search /></el-icon>
      </div>
      <div class="chat-items">
        <div 
          v-for="[modelId, config] in filteredModels" 
          :key="modelId"
          class="chat-item"
          :class="{ active: currentModelId === modelId }"
          @click="switchModel(modelId)"
        >
          <div class="chat-avatar">
            <img 
              :src="getModelIconUrl(modelId)"
              :alt="config.name"
              class="model-icon"
            />
          </div>
          <div class="chat-info">
            <div class="chat-name">{{ config.name }}</div>
            <div class="chat-preview">{{ config.versions[0] }}</div>
          </div>
          <div class="chat-actions">
            <el-button
              class="action-btn"
              type="text"
              @click.stop="openModelSettings(modelId)"
            >
              <el-icon><Setting /></el-icon>
            </el-button>
            <!-- 只为自定义模型显示删除按钮 -->
            <el-button
              v-if="isCustomModel(modelId)"
              class="action-btn delete-btn"
              type="text"
              @click.stop="deleteModel(modelId)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <!-- 添加新模型按钮 -->
        <div class="chat-item add-model-item" @click="showAddModelDialog">
          <div class="chat-avatar">
            <el-icon class="add-icon"><Plus /></el-icon>
          </div>
          <div class="chat-info">
            <div class="chat-name">添加新模型</div>
            <div class="chat-preview">自定义你的AI模型</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="chat-area">
      <div class="chat-header">
        <div class="chat-title">{{ currentChat.title }}</div>
        <div class="header-tools">
          <el-button 
            type="text" 
            @click="clearChatHistory"
            :disabled="currentChat.messages.length === 0"
          >
            <el-icon><Delete /></el-icon>
            清空聊天
          </el-button>
        </div>
      </div>
      
      <div class="message-container" ref="messageContainer">
        <template v-if="currentChat.messages.length === 0">
          <div class="empty-state">
            <el-icon class="empty-icon"><ChatDotRound /></el-icon>
            <p>开始与 {{ currentChat.title }} 对话</p>
          </div>
        </template>
        <template v-else>
          <div 
            v-for="message in currentChat.messages" 
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div 
              class="message-content"
              v-if="message.role === 'user'"
            >{{ message.content }}</div>
            <div 
              class="message-content markdown-body"
              v-else
              v-html="md.render(message.content)"
            ></div>
            <div class="message-footer">
              <div class="message-actions" v-if="message.role === 'assistant'">
                <el-button
                  type="text"
                  size="small"
                  @click="copyMessage(message.content)"
                >
                  <el-icon><DocumentCopy /></el-icon>
                  复制
                </el-button>
              </div>
              <div class="message-time">{{ new Date(message.timestamp).toLocaleTimeString() }}</div>
            </div>
          </div>
        </template>
      </div>
      
      <div class="input-area">
        <div class="toolbar">
          <el-popover
            placement="top"
            :width="300"
            trigger="click"
            popper-class="emoji-popover"
          >
            <template #reference>
              <el-icon class="toolbar-icon"><Lollipop /></el-icon>
            </template>
            <div class="emoji-container">
              <div class="emoji-tabs">
                <div 
                  v-for="category in emojiCategories" 
                  :key="category.name"
                  class="emoji-tab"
                  :class="{ active: currentEmojiCategory === category.name }"
                  @click="currentEmojiCategory = category.name"
                >
                  {{ category.icon }}
                </div>
              </div>
              <div class="emoji-list">
                <div 
                  v-for="emoji in currentCategoryEmojis" 
                  :key="emoji"
                  class="emoji-item"
                  @click="insertEmoji(emoji)"
                >
                  {{ emoji }}
                </div>
              </div>
              <div class="recent-emojis" v-if="recentEmojis.length > 0">
                <div class="recent-title">最近使用</div>
                <div class="emoji-list">
                  <div 
                    v-for="emoji in recentEmojis" 
                    :key="emoji"
                    class="emoji-item"
                    @click="insertEmoji(emoji)"
                  >
                    {{ emoji }}
                  </div>
                </div>
              </div>
            </div>
          </el-popover>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
          >
            <el-icon class="toolbar-icon"><Paperclip /></el-icon>
          </el-upload>
        </div>
        <div class="input-box">
          <textarea 
            v-model="messageInput"
            placeholder="请输入消息..."
            @keydown.enter.prevent="sendMessage"
          ></textarea>
        </div>
        <div class="send-button-container">
          <el-button 
            type="primary" 
            class="send-button"
            @click="sendMessage"
            :loading="isLoading"
            :disabled="isLoading || !messageInput.trim()"
          >
            {{ isLoading ? '等待回复...' : '发送' }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 添加文件预览区域 -->
    <div v-if="selectedFile" class="file-preview">
      <div class="file-info">
        <el-icon><Document /></el-icon>
        <span class="file-name">{{ selectedFile.name }}</span>
        <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
      </div>
      <el-button
        type="text"
        class="remove-file"
        @click="removeFile"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 模型设置对话框 -->
    <el-dialog
      v-model="modelSettingsVisible"
      :title="currentModel.name + ' 设置'"
      width="500px"
    >
      <div class="model-settings">
        <div class="settings-item">
          <span class="item-label">API Key</span>
          <el-input
            v-model="currentModel.apiKey"
            placeholder="请输入 API Key"
            show-password
          />
        </div>
        <div class="settings-item">
          <span class="item-label">Base URL</span>
          <el-input
            v-model="currentModel.baseUrl"
            placeholder="请输入 Base URL"
          >
            <template #append>
              <el-button @click="resetBaseUrl">
                重置
              </el-button>
            </template>
          </el-input>
          <div class="settings-hint">
            如果使用第三方代理，可以在此修改 Base URL
          </div>
        </div>
        <div class="settings-item">
          <span class="item-label">模型版本</span>
          <div class="version-list">
            <el-select 
              v-model="currentModel.version" 
              placeholder="请选择模型版本"
              style="margin-bottom: 8px; width: 100%;"
            >
              <el-option
                v-for="option in [...currentModel.versions, ...currentModel.customVersions]"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
            
            <!-- 添加自定义版本的输入区域 -->
            <div class="add-version">
              <el-input
                v-model="newVersionName"
                placeholder="输入模型名称"
                style="width: 300px; margin-right: 8px;"
              />
              <el-button 
                type="primary" 
                @click="addCustomVersion"
                :disabled="!newVersionName"
              >
                添加
              </el-button>
            </div>
            
            <!-- 显示自定义版本列表 -->
            <div v-if="currentModel.customVersions.length > 0" class="custom-versions">
              <div class="custom-version-title">自定义版本:</div>
              <div 
                v-for="(version, index) in currentModel.customVersions" 
                :key="version"
                class="custom-version-item"
              >
                <span>{{ version }}</span>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click="removeCustomVersion(index)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <div class="settings-item">
          <span class="item-label">系统角色</span>
          <el-input
            v-model="currentModel.systemRole"
            type="textarea"
            :rows="3"
            placeholder="请输入系统角色设定"
          />
        </div>
        <div class="settings-item">
          <span class="item-label">温度</span>
          <el-slider
            v-model="currentModel.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :marks="{
              0: '精确',
              1: '平衡',
              2: '创意'
            }"
          />
        </div>
        <div class="settings-item">
          <span class="item-label">最大长度</span>
          <el-input-number
            v-model="currentModel.maxLength"
            :min="100"
            :max="32000"
            :step="100"
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="modelSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveModelSettings">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加新模型对话框 -->
    <el-dialog
      v-model="addModelVisible"
      title="添加新模型"
      width="500px"
    >
      <div class="model-settings">
        <div class="settings-item">
          <span class="item-label">模型ID</span>
          <el-input
            v-model="newModel.id"
            placeholder="请输入模型ID（英文字母和数字）"
          />
        </div>
        <div class="settings-item">
          <span class="item-label">模型名称</span>
          <el-input
            v-model="newModel.name"
            placeholder="请输入模型名称"
          />
        </div>
        <div class="settings-item">
          <span class="item-label">Base URL</span>
          <el-input
            v-model="newModel.baseUrl"
            placeholder="请输入模型API地址"
          />
        </div>
        <div class="settings-item">
          <span class="item-label">默认版本</span>
          <el-input
            v-model="newModel.defaultVersion"
            placeholder="请输入默认版本名称"
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addModelVisible = false">取消</el-button>
          <el-button type="primary" @click="addNewModel">添加</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import OpenAI from 'openai'
import { Delete } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/vs2015.css'

// 当前选中的模型
const currentModelId = ref('openai')
const currentChat = reactive({
  title: 'OpenAI',
  messages: [] as Message[]
})

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// 模型设置相关
const modelSettingsVisible = ref(false)
const currentModel = reactive({
  name: '',
  apiKey: '',
  baseUrl: '',
  version: '',
  versions: [] as string[],
  customVersions: [] as string[],
  systemRole: '',
  temperature: 1,
  maxLength: 2000
})

// 模型配置数据
const modelConfigs = reactive({
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    versions: ['GPT-4', 'GPT-4 Turbo', 'GPT-3.5']
  },
  gemini: {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    versions: ['Gemini Pro', 'Gemini Ultra']
  },
  claude: {
    name: 'Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    versions: ['Claude 3 Opus', 'Claude 3 Sonnet', 'Claude 2']
  },
  mistral: {
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    versions: ['Mistral Large', 'Mistral Medium', 'Mistral Small']
  },
  qwen: {
    name: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    versions: ['Qwen Max', 'Qwen Plus', 'Qwen Turbo']
  },
  wenxin: {
    name: '文心一言',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    versions: ['ERNIE 4.0', 'ERNIE 3.5']
  },
  hunyuan: {
    name: '腾讯混元',
    baseUrl: 'https://hunyuan.cloud.tencent.com/hyllm/v1',
    versions: ['Hunyuan']
  },
  minimax: {
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    versions: ['abab5.5', 'abab5']
  },
  moonshot: {
    name: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    versions: ['Moonshot V2']
  },
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    versions: ['Command', 'Command Light']
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    versions: ['Claude 3']
  },
  perplexity: {
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    versions: ['pplx-7b', 'pplx-70b']
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    versions: ['DeepSeek Chat', 'DeepSeek Coder']
  },
  yi: {
    name: '零一万物',
    baseUrl: 'https://api.01.ai',
    versions: ['Yi-34B', 'Yi-6B']
  },
  zhipu: {
    name: '智谱清言',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v3',
    versions: ['ChatGLM4', 'ChatGLM3']
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/v1',
    versions: ['LLaMA2-70B', 'Mixtral-8x7B']
  },
  replicate: {
    name: 'Replicate',
    baseUrl: 'https://api.replicate.com/v1',
    versions: ['Llama-2', 'CodeLlama']
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    versions: ['Together-v1']
  },
  fireworks: {
    name: 'Fireworks',
    baseUrl: 'https://api.fireworks.ai/v1',
    versions: ['Fireworks-1']
  },
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/api',
    versions: ['Local Models']
  },
  bedrock: {
    name: 'Amazon Bedrock',
    baseUrl: 'https://bedrock.aws.amazon.com/v1',
    versions: ['Claude', 'Titan']
  },
  vertexai: {
    name: 'Google Vertex AI',
    baseUrl: 'https://vertexai.googleapis.com/v1',
    versions: ['PaLM 2', 'Gemini']
  },
  doubao: {
    name: '豆包',
    baseUrl: 'https://api.doubao.com/v1',
    versions: ['Doubao-1']
  },
  stepfun: {
    name: '阶跃星辰',
    baseUrl: 'https://api.stepfun.com/v1',
    versions: ['Stepfun-1']
  },
  kling: {
    name: '可灵',
    baseUrl: 'https://api.kling.ai/v1',
    versions: ['Kling-1']
  },
  nova: {
    name: 'AWS Nova',
    baseUrl: 'https://api.nova.aws/v1',
    versions: ['Nova-1']
  },
  Nvidia: {
    name: 'Chat with RTX',
    baseUrl: 'http://localhost:8000/v1',
    versions: ['Local RTX']
  }
})

// 切换模型
const switchModel = (modelId: string) => {
  currentModelId.value = modelId
  const config = modelConfigs[modelId]
  if (config) {
    currentChat.title = config.name
    // 加载该模型的历史消息
    currentChat.messages = loadChatHistory(modelId)
  }
}

// 添��模型设置持久化相关的方法
const loadModelSettings = (modelId: string) => {
  try {
    const settings = localStorage.getItem(`model_settings_${modelId}`)
    if (settings) {
      const parsed = JSON.parse(settings)
      return {
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || modelConfigs[modelId].baseUrl,
        version: parsed.version || modelConfigs[modelId].versions[0],
        customVersions: parsed.customVersions || [],
        systemRole: parsed.systemRole || '',
        temperature: parsed.temperature ?? 1,
        maxLength: parsed.maxLength || 2000
      }
    }
  } catch (error) {
    console.error('加载模型设置失败:', error)
  }
  // 返回默认设置
  return {
    apiKey: '',
    baseUrl: modelConfigs[modelId].baseUrl,
    version: modelConfigs[modelId].versions[0],
    customVersions: [],
    systemRole: '',
    temperature: 1,
    maxLength: 2000
  }
}

// 定义模型设置的接口
interface ModelSettings {
  apiKey: string
  baseUrl: string
  version: string
  customVersions: string[]
  systemRole: string
  temperature: number
  maxLength: number
}

// 修改 saveModelSettings 函数名避免重复
const persistModelSettings = (modelId: string, settings: ModelSettings) => {
  try {
    localStorage.setItem(`model_settings_${modelId}`, JSON.stringify(settings))
  } catch (error) {
    console.error('保存模型设置失败:', error)
  }
}

// 修改保存设置的方法
const saveModelSettings = () => {
  // 保存当前设置
  const settings: ModelSettings = {
    apiKey: currentModel.apiKey,
    baseUrl: currentModel.baseUrl,
    version: currentModel.version,
    customVersions: currentModel.customVersions,
    systemRole: currentModel.systemRole,
    temperature: currentModel.temperature,
    maxLength: currentModel.maxLength
  }
  
  persistModelSettings(currentModelId.value, settings)
  
  if (currentModelId.value === 'openai') {
    initOpenAIClient()
  }
  
  ElMessage.success('设置已保存')
  modelSettingsVisible.value = false
}

const initOpenAIClient = () => {
  openai.value = new OpenAI({
    apiKey: currentModel.apiKey,
    baseURL: currentModel.baseUrl || 'https://api.openai.com/v1',
    dangerouslyAllowBrowser: true
  })
}

// 发送消息
const messageInput = ref('')
const isLoading = ref(false)


// 文件上传相关
const uploadRef = ref()
const selectedFile = ref<File | null>(null)

// 读取文件内容
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 检查文件类型

    const allowedExtensions = /\.(txt|md|js|ts|json|html|css|xml)$/i

    // 放宽文件类型检查，只检查扩展名
    if (!file.name.match(allowedExtensions)) {
      reject(new Error('不支持的文件类型，请上传文本文件'))
      return
    }

    // 检查文件大小
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      reject(new Error('文件大小不能超过10MB'))
      return
    }

    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result
        if (typeof result === 'string') {
          // 如果文件大于100KB，只读取前100KB
          const maxLength = 100 * 1024
          let content = result
          if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '\n... (文件过大，仅显示前100KB内容)'
          }
          resolve(content)
        } else {
          reject(new Error('文件内容格式错误'))
        }
      } catch (error) {
        console.error('读取文件失败:', error)
        reject(new Error('读取文件失败'))
      }
    }

    reader.onerror = (e) => {
      console.error('FileReader error:', e)
      reject(new Error('读取文件失败'))
    }

    try {
      reader.readAsText(file, 'UTF-8') // 指定编码为 UTF-8
    } catch (error) {
      console.error('读取文件时出错:', error)
      reject(new Error('读取文件失败'))
    }
  })
}

// 修改文件选择处理方法
const handleFileChange = async (uploadFile: any) => {
  try {
    const file = uploadFile.raw || uploadFile // 处理 el-upload 的文件对象
    if (!file) {
      throw new Error('无效的文件')
    }
    await readFileContent(file) // 测试是否可以读取
    selectedFile.value = file
  } catch (error) {
    console.error('文件处理失败:', error)
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('文件处理失败')
    }
    removeFile()
  }
}

// 移除文件
const removeFile = () => {
  selectedFile.value = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 修改发送消息的方法
const sendMessage = async () => {
  const content = messageInput.value.trim()
  if ((!content && !selectedFile.value) || isLoading.value) return
  
  if (!currentModel.apiKey) {
    ElMessage.error('请先在设置中配置 API Key')
    return
  }

  isLoading.value = true
  let buffer = ''

  try {
    let messageContent = content

    // 如果有选择文件，读取文件内容
    if (selectedFile.value) {
      try {
        const fileContent = await readFileContent(selectedFile.value)
        messageContent = `${content}\n\n文件内容：\n\`\`\`\n${fileContent}\n\`\`\``
      } catch (error) {
        if (error instanceof Error) {
          ElMessage.error(error.message)
        } else {
          ElMessage.error('读取文件失败')
        }
        isLoading.value = false
        return
      }
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: messageContent,
      timestamp: Date.now()
    }
    currentChat.messages.push(userMessage)
    messageInput.value = ''
    removeFile() // 清除文件

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now()
    }
    currentChat.messages.push(assistantMessage)

    // 统一使用 OpenAI 格式发送请求
    const messages = currentChat.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    if (currentModel.systemRole) {
      messages.unshift({
        role: 'system',
        content: currentModel.systemRole
      })
    }

    const response = await fetch(`${currentModel.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentModel.apiKey}`
      },
      body: JSON.stringify({
        model: currentModel.version,
        messages,
        temperature: currentModel.temperature,
        max_tokens: currentModel.maxLength,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      
      // 将新的数据到缓冲区
      buffer += decoder.decode(value, { stream: true })
      
      // 处理缓冲区中的完整行
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保存最后一个不完整的行

      for (const line of lines) {
        if (line.trim() === '') continue
        if (line === 'data: [DONE]') continue
        if (!line.startsWith('data: ')) continue

        try {
          const data = JSON.parse(line.slice(6))
          const content = data.choices[0]?.delta?.content || ''
          if (content) {
            assistantMessage.content += content
            // 每次更新内容时保存历史
            saveChatHistory(currentModelId.value, currentChat.messages)
          }
        } catch (e) {
          console.warn('Failed to parse chunk:', line, e)
        }
      }
    }

    // 处理最后可能剩余的数据
    if (buffer.trim()) {
      try {
        if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
          const data = JSON.parse(buffer.slice(6))
          const content = data.choices[0]?.delta?.content || ''
          if (content) {
            assistantMessage.content += content
            saveChatHistory(currentModelId.value, currentChat.messages)
          }
        }
      } catch (e) {
        console.warn('Failed to parse final chunk:', buffer, e)
      }
    }
  } catch (error: unknown) {
    console.error('发送消息失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '发送消息失败')
  } finally {
    isLoading.value = false
    saveChatHistory(currentModelId.value, currentChat.messages)
  }
}

const getModelIconUrl = (modelId: string) => {
  return 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/' + modelId + '.svg'
}

// 在 script setup 中添加搜索相关的状和方法
const searchQuery = ref('')

// 添加计算属性用于过滤模型列表
const filteredModels = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return Object.entries(modelConfigs)
  
  return Object.entries(modelConfigs).filter(([, config]) => {
    return config.name.toLowerCase().includes(query) || 
           config.versions.some(v => v.toLowerCase().includes(query))
  })
})

// 在 script setup 中添加自定义版本相关的逻辑
const newVersionName = ref('')

const addCustomVersion = () => {
  if (!newVersionName.value) return
  
  currentModel.customVersions.push(newVersionName.value)
  
  // 清空输入
  newVersionName.value = ''
}

const removeCustomVersion = (index: number) => {
  currentModel.customVersions.splice(index, 1)
  // 如果删除的是当前选中的版本，重置选择
  if (!currentModel.versions.includes(currentModel.version) && 
      !currentModel.customVersions.includes(currentModel.version)) {
    currentModel.version = currentModel.versions[0] || ''
  }
}

// 添加 OpenAI 客户端实例
const openai = ref<OpenAI | null>(null)

// 添加重置 Base URL 的方法
const resetBaseUrl = () => {
  const config = modelConfigs[currentModelId.value]
  if (config && config.baseUrl) {
    currentModel.baseUrl = config.baseUrl
  }
}

// 添加消息持久存储相关的方法
const loadChatHistory = (modelId: string) => {
  try {
    const history = localStorage.getItem(`chat_history_${modelId}`)
    return history ? JSON.parse(history) : []
  } catch (error) {
    console.error('加载聊天历史失败:', error)
    return []
  }
}

const saveChatHistory = (modelId: string, messages: Message[]) => {
  try {
    localStorage.setItem(`chat_history_${modelId}`, JSON.stringify(messages))
  } catch (error) {
    console.error('保存聊天历史失败:', error)
  }
}

// 在组件挂载时加载当前模型的历史消息
onMounted(() => {
  currentChat.messages = loadChatHistory(currentModelId.value)
  const savedSettings = loadModelSettings(currentModelId.value)
  currentModel.apiKey = savedSettings.apiKey
  currentModel.baseUrl = savedSettings.baseUrl
  currentModel.version = savedSettings.version
  currentModel.customVersions = savedSettings.customVersions
  currentModel.systemRole = savedSettings.systemRole
  currentModel.temperature = savedSettings.temperature
  currentModel.maxLength = savedSettings.maxLength
})

// 添加清空聊天历史的功能
const clearChatHistory = () => {
  currentChat.messages = []
  saveChatHistory(currentModelId.value, [])
  ElMessage.success('聊天历史已清空')
}

// 添加 openModelSettings 方法
const openModelSettings = (modelId: string) => {
  const config = modelConfigs[modelId]
  if (config) {
    currentModel.name = config.name
    currentModel.versions = config.versions
    
    // 加载保存的设置
    const savedSettings = loadModelSettings(modelId)
    currentModel.apiKey = savedSettings.apiKey
    currentModel.baseUrl = savedSettings.baseUrl
    currentModel.version = savedSettings.version
    currentModel.customVersions = savedSettings.customVersions
    currentModel.systemRole = savedSettings.systemRole
    currentModel.temperature = savedSettings.temperature
    currentModel.maxLength = savedSettings.maxLength
    
    modelSettingsVisible.value = true
  }
}

// 在 script setup 中添加 markdown-it 导入和初始化
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: function (str, lang) {
    let highlightedCode = str
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlightedCode = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch (e) {
        console.warn('Failed to highlight code block:', e)
      }
    }
    
    return `<div class="code-block-wrapper">
      ${lang ? `<div class="code-block-header">${lang}</div>` : ''}
      <pre class="code-block"><code class="hljs language-${lang || 'plaintext'}">${highlightedCode}</code></pre>
    </div>`
  }
})

// 在 script setup 中添加复制功能
const copyMessage = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    ElMessage.success('复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 添加新模型相关
const addModelVisible = ref(false)
const newModel = reactive({
  id: '',
  name: '',
  baseUrl: '',
  defaultVersion: ''
})

const showAddModelDialog = () => {
  addModelVisible.value = true
  // 重置表单
  newModel.id = ''
  newModel.name = ''
  newModel.baseUrl = ''
  newModel.defaultVersion = ''
}

const addNewModel = () => {
  if (!newModel.id || !newModel.name || !newModel.baseUrl || !newModel.defaultVersion) {
    ElMessage.warning('请填写完整的模型信息')
    return
  }

  if (modelConfigs[newModel.id]) {
    ElMessage.warning('模型ID已存在')
    return
  }

  // 添加新模型到配置中
  modelConfigs[newModel.id] = {
    name: newModel.name,
    baseUrl: newModel.baseUrl,
    versions: [newModel.defaultVersion]
  }

  // 保存到本地存储
  try {
    const customModels = JSON.parse(localStorage.getItem('custom_models') || '{}')
    customModels[newModel.id] = {
      name: newModel.name,
      baseUrl: newModel.baseUrl,
      versions: [newModel.defaultVersion]
    }
    localStorage.setItem('custom_models', JSON.stringify(customModels))
    ElMessage.success('添加成功')
    addModelVisible.value = false
  } catch (error) {
    console.error('保存自定义模型失败:', error)
    ElMessage.error('保存失败')
  }
}

// 修改加载自定义模型的代码
onMounted(() => {
  try {
    const customModels = JSON.parse(localStorage.getItem('custom_models') || '{}')
    Object.entries(customModels).forEach(([id, config]) => {
      modelConfigs[id] = config
    })
  } catch (error) {
    console.error('加载自定义模型失败:', error)
  }
  // ... existing onMounted code ...
})

// 添加判断是否为自定义模型的方法
const isCustomModel = (modelId: string) => {
  try {
    const customModels = JSON.parse(localStorage.getItem('custom_models') || '{}')
    return !!customModels[modelId]
  } catch {
    return false
  }
}

// 添加删除模型的方法
const deleteModel = (modelId: string) => {
  ElMessageBox.confirm(
    '确定要删除这个模型吗？删除后将无法恢复。',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    try {
      // 从本地存储中删除
      const customModels = JSON.parse(localStorage.getItem('custom_models') || '{}')
      delete customModels[modelId]
      localStorage.setItem('custom_models', JSON.stringify(customModels))

      // 从配置中删除
      delete modelConfigs[modelId]

      // 如果当前选中的就是被删除的模型，切换到默认模型
      if (currentModelId.value === modelId) {
        switchModel('openai')
      }

      ElMessage.success('删除成功')
    } catch (error: unknown) {
      console.error('删除模型失败:', error)
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 表情相关数据
const currentEmojiCategory = ref('smileys')
const recentEmojis = ref<string[]>([])
const maxRecentEmojis = 20

const emojiCategories = [
  { name: 'smileys', icon: '😊', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'] },
  { name: 'gestures', icon: '👋', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '����'] },
  { name: 'animals', icon: '🐱', emojis: ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋'] },
  { name: 'food', icon: '🍎', emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '����', '🥒', '🌶️', '🫑', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐'] },
  { name: 'objects', icon: '💡', emojis: ['💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⚱️', '🏺'] },
  { name: 'symbols', icon: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️'] }
]

const currentCategoryEmojis = computed(() => {
  const category = emojiCategories.find(c => c.name === currentEmojiCategory.value)
  return category ? category.emojis : []
})

// 插入表情
const insertEmoji = (emoji: string) => {
  messageInput.value += emoji
  
  // 更新最近使用的表情
  const index = recentEmojis.value.indexOf(emoji)
  if (index > -1) {
    recentEmojis.value.splice(index, 1)
  }
  recentEmojis.value.unshift(emoji)
  if (recentEmojis.value.length > maxRecentEmojis) {
    recentEmojis.value.pop()
  }
  
  // 保存到本地存储
  localStorage.setItem('recent_emojis', JSON.stringify(recentEmojis.value))
}

// 在组件挂载时加载最近使用的表情
onMounted(() => {
  try {
    const saved = localStorage.getItem('recent_emojis')
    if (saved) {
      recentEmojis.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载最近使用表情失败:', error)
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100%;
  overflow: hidden;
  width: 100%;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fff;
  overflow: hidden;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.input-area {
  border-top: 1px solid #e0e0e0;
  background: #fff;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.chat-list {
  width: 280px;
  min-width: 280px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.search-bar {
  padding: 10px;
  position: relative;
}

.search-bar input {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  background: #fff;
  outline: none;
}

.search-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 16px;
}

.chat-items {
  flex: 1;
  overflow-y: auto;
  height: calc(100% - 50px);
}

.chat-item {
  display: flex;
  padding: 12px 15px;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  align-items: center;
}

.chat-item:hover {
  background: #eee;
}

.chat-item.active {
  background: #e1e1e1;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 6px;
  overflow: hidden;
  padding: 6px;
  flex-shrink: 0;
}

.model-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.chat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.chat-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: #333;
}

.chat-preview {
  font-size: 12px;
  color: #666;
  opacity: 0.8;
}

.chat-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.chat-item:hover .chat-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px;
  color: #666;
}

.action-btn:hover {
  color: #333;
}

.chat-header {
  height: 60px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.chat-title {
  font-weight: 500;
  font-size: 16px;
  color: #333;
}

.header-tools {
  display: flex;
  gap: 15px;
  color: #666;
}

.header-tools .el-icon {
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-tools .el-icon:hover {
  color: #333;
}

.toolbar {
  display: flex;
  gap: 15px;
  padding: 8px 10px;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
}

.toolbar .el-icon {
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar .el-icon:hover {
  color: #333;
}

.input-box {
  padding: 10px;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.input-box textarea {
  width: 100%;
  height: 60px;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  font-size: 14px;
}

.send-button-container {
  display: flex;
  justify-content: flex-end;
  padding: 0 10px 10px 10px;
  background: #fff;
}

.send-button {
  min-width: 80px;
}

/* 模型设置对话框样式 */
.model-settings {
  padding: 10px;
}

.model-settings .settings-item {
  margin-bottom: 20px;
}

.model-settings .item-label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-slider) {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 添加消息相关样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.message {
  max-width: 80%;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-content {
  padding: 16px;
  border-radius: 12px;
  background: #f8f9fa;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: auto;
  max-width: 100%;
}

.message.user .message-content {
  background: #e3f2fd;
}

.message.assistant .message-content {
  background: #f8f9fa;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  align-self: flex-end;
}

.input-box textarea {
  width: 100%;
  height: 60px;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  font-size: 14px;
  padding: 8px;
}

.settings-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  line-height: 1.4;
}

.version-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-version {
  display: flex;
  align-items: center;
  margin-top: 8px;
}

.custom-versions {
  margin-top: 12px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.custom-version-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.custom-version-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.custom-version-item span {
  color: #333;
  font-size: 14px;
}

.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

.markdown-body :deep(p) {
  margin: 8px 0;
  line-height: 1.6;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}

.markdown-body :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin: 8px 0;
}

.markdown-body :deep(pre code) {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 2em;
  margin: 8px 0;
}

.markdown-body :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}

.markdown-body :deep(table tr) {
  background-color: #ffffff;
  border-top: 1px solid #d0d7de;
}

.markdown-body :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: #656d76;
  border-left: 0.25em solid #d0d7de;
  margin: 8px 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  box-sizing: border-box;
  background-color: #ffffff;
  border-radius: 3px;
  margin: 8px 0;
}

.markdown-body :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #d0d7de;
  border: 0;
}

.markdown-body :deep(.code-block-wrapper) {
  position: relative;
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
}

.markdown-body :deep(.code-block-header) {
  padding: 8px 16px;
  background: #252526;
  color: #cccccc;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  border-bottom: 1px solid #323233;
}

.markdown-body :deep(.code-block) {
  margin: 0;
  padding: 16px;
  background: #1e1e1e;
  overflow-x: auto;
}

.markdown-body :deep(.code-block code.hljs) {
  padding: 0;
  background: transparent;
  color: #d4d4d4;
  font-size: 14px;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
  white-space: pre;
}

.markdown-body :deep(p code) {
  background: #f3f4f6;
  color: #24292f;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
  transition: all 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* 修改聊天列表的滚动条 */
.chat-items::-webkit-scrollbar {
  width: 4px;
}

.chat-items::-webkit-scrollbar-thumb {
  background: #e0e0e0;
}

.chat-items:hover::-webkit-scrollbar-thumb {
  background: #c0c4cc;
}

/* 修改消息容器的滚动条 */
.message-container::-webkit-scrollbar {
  width: 6px;
}

.message-container::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 3px;
}

.message-container:hover::-webkit-scrollbar-thumb {
  background: #c0c4cc;
}

/* 修改代码块的滚动条 */
.markdown-body :deep(.code-block)::-webkit-scrollbar {
  height: 6px;
}

.markdown-body :deep(.code-block)::-webkit-scrollbar-thumb {
  background: #4a4a4a;
  border-radius: 3px;
}

.markdown-body :deep(.code-block):hover::-webkit-scrollbar-thumb {
  background: #666666;
}

/* 修改设置对话框的滚动条 */
.model-settings::-webkit-scrollbar {
  width: 6px;
}

.model-settings::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 3px;
}

.model-settings:hover::-webkit-scrollbar-thumb {
  background: #c0c4cc;
}

.message-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.message-actions {
  display: flex;
  gap: 8px;
}

.message-actions .el-button {
  padding: 4px 8px;
  color: #666;
}

.message-actions .el-button:hover {
  color: #409eff;
}

.message-actions .el-icon {
  margin-right: 4px;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.add-model-item {
  margin-top: 8px;
  border-top: 1px solid #eee;
}

.add-model-item .add-icon {
  font-size: 24px;
  color: #666;
}

.add-model-item:hover .add-icon {
  color: #409eff;
}

.delete-btn {
  color: #f56c6c;
}

.delete-btn:hover {
  color: #f56c6c;
  opacity: 0.8;
}

.toolbar-icon {
  cursor: pointer;
  transition: color 0.2s ease;
}

.toolbar-icon:hover {
  color: #409eff;
}

.emoji-container {
  padding: 12px;
  max-height: 320px;
  overflow-y: auto;
  width: 100%;
}

.emoji-tabs {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid #eee;
  margin-bottom: 12px;
  padding-bottom: 8px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  gap: 4px;
}

.emoji-tab {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
  font-size: 1.2em;
}

.emoji-tab:hover {
  background-color: #f5f7fa;
}

.emoji-tab.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.emoji-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 4px;
  width: 100%;
}

.emoji-item {
  font-size: 1.4em;
  padding: 6px;
  cursor: pointer;
  text-align: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.emoji-item:hover {
  background-color: #f5f7fa;
}

.recent-emojis {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  width: 100%;
}

.recent-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

:deep(.emoji-popover) {
  padding: 0;
  max-height: none;
  overflow: visible;
  width: 300px;
}

/* 自定义滚动条样式 */
.emoji-container::-webkit-scrollbar {
  width: 4px;
}

.emoji-container::-webkit-scrollbar-track {
  background: transparent;
}

.emoji-container::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 2px;
}

.emoji-container::-webkit-scrollbar-thumb:hover {
  background: #c0c0c0;
}

.file-preview {
  margin: 8px 10px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 14px;
  color: #333;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.remove-file {
  padding: 2px;
}

.remove-file:hover {
  color: #f56c6c;
}
</style> 