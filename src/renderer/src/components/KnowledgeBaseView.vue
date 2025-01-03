<template>
  <div class="knowledge-base-container">
    <div class="header">
      <h2>知识库管理</h2>
      <div class="header-actions">
        <el-button @click="testEmbeddingModel" :loading="testingConnection">
          <el-icon><Connection /></el-icon>测试连接
        </el-button>
        <el-button @click="showModelSettings">
          <el-icon><Setting /></el-icon>模型设置
        </el-button>
        <el-button type="primary" @click="createKnowledgeBase">
          <el-icon><Plus /></el-icon>新建知识库
        </el-button>
      </div>
    </div>

    <div class="knowledge-list">
      <el-card v-for="kb in knowledgeBases" 
               :key="kb.id" 
               class="kb-card"
               :class="{ 'active': kb.id === activeKnowledgeBase?.id }">
        <div class="kb-header">
          <span class="kb-name">{{ kb.name }}</span>
          <div class="kb-actions">
            <el-button-group>
              <el-button size="small" @click="editKnowledgeBase(kb)">
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteKnowledgeBase(kb)">
                删除
              </el-button>
            </el-button-group>
          </div>
        </div>
        <div class="kb-info">
          <p>文档数量: {{ kb.documentCount }}</p>
          <p>最后更新: {{ new Date(kb.lastUpdate).toLocaleString() }}</p>
        </div>
      </el-card>
    </div>

    <!-- 知识库编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentKnowledgeBase ? '编辑知识库' : '新建知识库'"
      width="80%"
      :close-on-click-modal="false"
    >
      <el-form :model="kbForm" label-width="100px">
        <el-form-item label="知识库名称">
          <el-input v-model="kbForm.name" placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="kbForm.description"
            type="textarea"
            placeholder="请输入知识库描述"
          />
        </el-form-item>
        <el-form-item label="文档管理">
          <div class="documents-container">
            <!-- 文件上传区域 -->
            <div class="upload-section">
              <el-upload
                action="#"
                :auto-upload="false"
                :on-change="handleFileChange"
                :file-list="fileList"
                multiple
              >
                <el-button type="primary">选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">
                    支持 PDF、Word、TXT 等文档格式
                  </div>
                </template>
              </el-upload>
            </div>

            <!-- 文档列表和编辑区域 -->
            <div class="documents-list">
              <el-tabs v-model="activeDocTab" type="card" class="doc-tabs">
                <!-- 已上传的文档标签页 -->
                <el-tab-pane 
                  v-for="(doc, index) in documents" 
                  :key="doc.id || index"
                  :label="doc.name"
                  :name="doc.id || String(index)"
                >
                  <div class="document-editor">
                    <div class="editor-toolbar">
                      <span class="doc-info">
                        {{ doc.name }} ({{ formatFileSize(doc.size) }})
                      </span>
                      <div class="toolbar-actions">
                        <el-button 
                          type="text" 
                          @click="saveDocumentContent(doc)"
                          :disabled="!doc.isEdited"
                        >
                          保存修改
                        </el-button>
                        <el-button 
                          type="text" 
                          @click="removeDocument(doc)"
                          class="danger-text"
                        >
                          删除文档
                        </el-button>
                      </div>
                    </div>
                    <el-input
                      v-model="doc.content"
                      type="textarea"
                      :rows="15"
                      @input="() => handleDocumentEdit(doc)"
                    />
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveKnowledgeBase">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Embedding模型设置对话框 -->
    <el-dialog
      v-model="modelSettingsVisible"
      title="Embedding模型设置"
      width="600px"
    >
      <el-form :model="modelSettings" label-width="120px">
        <el-form-item label="模型类型">
          <el-select v-model="modelSettings.type" placeholder="请选择模型类型">
            <el-option label="Jina" value="jina" />
            <el-option label="OpenAI" value="openai" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>

        <template v-if="modelSettings.type === 'custom'">
          <el-form-item label="模型名称">
            <el-input v-model="modelSettings.name" placeholder="请输入模型名称" />
          </el-form-item>
        </template>

        <el-form-item label="Base URL">
          <el-input 
            v-model="modelSettings.baseUrl" 
            placeholder="请输入API基础URL"
            :disabled="modelSettings.type === 'openai'"
          />
        </el-form-item>

        <el-form-item label="API Key">
          <el-input 
            v-model="modelSettings.apiKey" 
            type="password" 
            placeholder="请输入API密钥"
            show-password
          />
        </el-form-item>

        <template v-if="modelSettings.type === 'custom'">
          <el-form-item label="其他参数">
            <el-input
              v-model="modelSettings.extraParams"
              type="textarea"
              placeholder="请输入其他参数(JSON格式)"
              :rows="4"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="modelSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveModelSettings">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Setting, Connection } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'

interface KnowledgeBase {
  id: string
  name: string
  description: string
  documentCount: number
  lastUpdate: number
}

interface Document {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  timestamp: number;
  isEdited?: boolean;
}

interface ModelSettings {
  type: 'jina' | 'openai' | 'custom'
  name?: string
  baseUrl: string
  apiKey: string
  extraParams?: string
}

const knowledgeBases = ref<KnowledgeBase[]>([])
const dialogVisible = ref(false)
const currentKnowledgeBase = ref<KnowledgeBase | null>(null)
const activeKnowledgeBase = ref<KnowledgeBase | null>(null)
const fileList = ref<UploadFile[]>([])

const kbForm = ref({
  name: '',
  description: '',
  files: [] as UploadFile[]
})

const activeDocTab = ref('')
const documents = ref<Document[]>([])

const modelSettingsVisible = ref(false)
const modelSettings = ref<ModelSettings>({
  type: 'jina',
  baseUrl: '',
  apiKey: '',
  extraParams: '{}'
})

const testingConnection = ref(false)

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 处理文档编辑
const handleDocumentEdit = (doc: Document) => {
  doc.isEdited = true
}

// 保存文档内容
const saveDocumentContent = async (doc: Document) => {
  try {
    const kbId = currentKnowledgeBase.value?.id
    if (!kbId) return

    const kbFiles = JSON.parse(localStorage.getItem(`kb_files_${kbId}`) || '[]')
    const fileIndex = kbFiles.findIndex((f: Document) => f.id === doc.id)
    
    if (fileIndex !== -1) {
      kbFiles[fileIndex] = {
        ...doc,
        timestamp: Date.now()
      }
      localStorage.setItem(`kb_files_${kbId}`, JSON.stringify(kbFiles))
      doc.isEdited = false
      ElMessage.success('文档保存成功')
    }
  } catch (error) {
    console.error('保存文档失败:', error)
    ElMessage.error('保存文档失败')
  }
}

// 移除文档
const removeDocument = (doc: Document) => {
  const index = documents.value.findIndex(d => d.id === doc.id)
  if (index !== -1) {
    documents.value.splice(index, 1)
    // 如果还有其他文档，切换到第一个
    if (documents.value.length > 0) {
      activeDocTab.value = documents.value[0].id
    }
  }
}

// 创建新知识库
const createKnowledgeBase = () => {
  currentKnowledgeBase.value = null
  kbForm.value = {
    name: '',
    description: '',
    files: []
  }
  fileList.value = []
  dialogVisible.value = true
}

// 编辑知识库
const editKnowledgeBase = async (kb: KnowledgeBase) => {
  currentKnowledgeBase.value = kb
  kbForm.value = {
    name: kb.name,
    description: kb.description,
    files: []
  }
  fileList.value = []
  
  // 加载知识库文档
  try {
    const kbFiles = JSON.parse(localStorage.getItem(`kb_files_${kb.id}`) || '[]')
    documents.value = kbFiles.map((file: any) => ({
      ...file,
      id: file.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isEdited: false
    }))
    
    if (documents.value.length > 0) {
      activeDocTab.value = documents.value[0].id
    }
  } catch (error) {
    console.error('加载知识库文档失败:', error)
    ElMessage.error('加载知识库文档失败')
  }
  
  dialogVisible.value = true
}

// 删除知识库
const deleteKnowledgeBase = async (kb: KnowledgeBase) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除该知识库吗？删除后无法恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 删除知识库信息
    const savedKbs = JSON.parse(localStorage.getItem('knowledge_bases') || '{}')
    delete savedKbs[kb.id]
    localStorage.setItem('knowledge_bases', JSON.stringify(savedKbs))

    // 删除相关的文件信息
    localStorage.removeItem(`kb_files_${kb.id}`)

    // 更新显示列表
    await loadKnowledgeBases()
    
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除知识库失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 处理文件变化
const handleFileChange = async (file: UploadFile) => {
  if (file.raw instanceof File) {
    try {
      const content = await readFileContent(file.raw)
      const newDoc: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        content,
        type: file.raw.type,
        size: file.raw.size,
        timestamp: Date.now(),
        isEdited: false
      }
      documents.value.push(newDoc)
      activeDocTab.value = newDoc.id
    } catch (error) {
      console.error('读取文件失败:', error)
      ElMessage.error('读取文件失败')
    }
  }
}

// 保存知识库
const saveKnowledgeBase = async () => {
  if (!kbForm.value.name) {
    ElMessage.error('请输入知识库名称')
    return
  }

  try {
    const kbId = currentKnowledgeBase.value?.id || `kb_${Date.now()}`
    const newKnowledgeBase: KnowledgeBase = {
      id: kbId,
      name: kbForm.value.name,
      description: kbForm.value.description,
      documentCount: documents.value.length,
      lastUpdate: Date.now()
    }

    // 保存知识库信息
    const savedKbs = JSON.parse(localStorage.getItem('knowledge_bases') || '{}')
    savedKbs[kbId] = newKnowledgeBase
    localStorage.setItem('knowledge_bases', JSON.stringify(savedKbs))

    // 保存文件信息
    if (documents.value.length > 0) {
      localStorage.setItem(`kb_files_${kbId}`, JSON.stringify(documents.value))
    }

    // 更新显示列表
    await loadKnowledgeBases()
    
    ElMessage.success('保存成功')
    dialogVisible.value = false
  } catch (error) {
    console.error('保存知识库失败:', error)
    ElMessage.error('保存失败')
  }
}

// 读取文件内容
const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = (_e) => {
      reject(new Error('读取文件失败'))
    }
    reader.readAsText(file)
  })
}

// 加载知识库列表
const loadKnowledgeBases = async () => {
  try {
    const savedKbs = JSON.parse(localStorage.getItem('knowledge_bases') || '{}')
    knowledgeBases.value = Object.values(savedKbs)
  } catch (error) {
    console.error('加载知识库列表失败:', error)
    ElMessage.error('加载知识库列表失败')
  }
}

// 显示模型设置对话框
const showModelSettings = () => {
  // 加载已保存的设置
  try {
    const savedSettings = localStorage.getItem('embedding_model_settings')
    if (savedSettings) {
      modelSettings.value = JSON.parse(savedSettings)
    }
  } catch (error) {
    console.error('加载模型设置失败:', error)
  }
  modelSettingsVisible.value = true
}

// 保存模型设置
const saveModelSettings = () => {
  try {
    // 验证必填字段
    if (!modelSettings.value.apiKey) {
      ElMessage.error('请输入API Key')
      return
    }

    if (modelSettings.value.type !== 'openai' && !modelSettings.value.baseUrl) {
      ElMessage.error('请输入Base URL')
      return
    }

    // 验证自定义参数JSON格式
    if (modelSettings.value.type === 'custom' && modelSettings.value.extraParams) {
      try {
        JSON.parse(modelSettings.value.extraParams)
      } catch (e) {
        ElMessage.error('其他参数必须是有效的JSON格式')
        return
      }
    }

    // 保存设置
    localStorage.setItem('embedding_model_settings', JSON.stringify(modelSettings.value))
    ElMessage.success('保存成功')
    modelSettingsVisible.value = false
  } catch (error) {
    console.error('保存模型设置失败:', error)
    ElMessage.error('保存失败')
  }
}

// 测试Embedding模型连接
const testEmbeddingModel = async () => {
  testingConnection.value = true
  try {
    // 获取模型设置
    const settings = JSON.parse(localStorage.getItem('embedding_model_settings') || '{}')
    if (!settings.apiKey) {
      ElMessage.error('请先配置API Key')
      return
    }

    if (settings.type !== 'openai' && !settings.baseUrl) {
      ElMessage.error('请先配置Base URL')
      return
    }

    // 准备测试文本
    const testText = '这是一个测试文本,用于验证Embedding模型的连接。'

    // 调用API进行测试
    const response = await fetch(settings.baseUrl + '/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.type === 'custom' && settings.name ? 
               settings.name : 
               settings.type === 'openai' ? 
               'text-embedding-ada-002' : 
               'jina-embeddings-v2',
        input: testText
      })
    })

    if (!response.ok) {
      throw new Error('API调用失败: ' + response.statusText)
    }

    const result = await response.json()
    
    // 验证返回的embedding是否正确
    if (!result.data?.[0]?.embedding || !Array.isArray(result.data[0].embedding)) {
      throw new Error('返回的embedding格式不正确')
    }

    ElMessage.success({
      message: '连接测试成功!',
      duration: 3000
    })
  } catch (error: any) {
    console.error('连接测试失败:', error)
    ElMessage.error({
      message: '连接测试失败: ' + (error.message || '未知错误'),
      duration: 5000
    })
  } finally {
    testingConnection.value = false
  }
}

onMounted(() => {
  loadKnowledgeBases()
  // 加载模型设置
  try {
    const savedSettings = localStorage.getItem('embedding_model_settings')
    if (savedSettings) {
      modelSettings.value = JSON.parse(savedSettings)
    }
  } catch (error) {
    console.error('加载模型设置失败:', error)
  }
})
</script>

<style scoped>
.knowledge-base-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.knowledge-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.kb-card {
  transition: all 0.3s ease;
}

.kb-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kb-card.active {
  border: 2px solid var(--el-color-primary);
}

.kb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.kb-name {
  font-size: 16px;
  font-weight: 500;
}

.kb-info {
  color: #666;
  font-size: 14px;
}

.kb-info p {
  margin: 5px 0;
}

.documents-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 400px;
}

.upload-section {
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
}

.documents-list {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.doc-tabs {
  height: 100%;
}

.document-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #dcdfe6;
}

.doc-info {
  color: #666;
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
}

.danger-text {
  color: #f56c6c;
}

.danger-text:hover {
  color: #f78989;
}

:deep(.el-tabs__content) {
  padding: 16px;
  height: calc(100% - 40px);
}

:deep(.el-tab-pane) {
  height: 100%;
}

:deep(.el-textarea__inner) {
  font-family: monospace;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style> 