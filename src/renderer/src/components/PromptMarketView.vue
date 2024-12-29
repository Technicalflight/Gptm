<template>
  <div class="prompt-market">
    <div class="market-header">
      <h2>提示词模板市场</h2>
      <div class="header-buttons">
        <el-button @click="exportPrompts">
          <el-icon><Download /></el-icon>导出模板
        </el-button>
        <el-upload
          class="upload-button"
          accept=".json"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="handleImport"
        >
          <el-button>
            <el-icon><Upload /></el-icon>导入模板
          </el-button>
        </el-upload>
        <el-button type="primary" @click="showAddPromptDialog">
          <el-icon><Plus /></el-icon>添加提示词
        </el-button>
      </div>
    </div>
    
    <div class="prompt-grid">
      <div class="add-prompt-card" @click="showAddPromptDialog">
        <el-icon><Plus /></el-icon>
        <span>添加新模板</span>
      </div>
      
      <el-card v-for="(prompt, index) in allPrompts" :key="index" class="prompt-card">
        <template #header>
          <div class="card-header">
            <span>{{ prompt.title }}</span>
            <div class="button-group">
              <el-button type="info" size="small" @click="viewPrompt(prompt)">查看</el-button>
              <el-button type="success" size="small" @click="sharePrompt(prompt)">分享</el-button>
              <el-button type="primary" size="small" @click="usePrompt(prompt)">使用</el-button>
              <el-button 
                v-if="isUserPrompt(prompt)"
                type="danger" 
                size="small" 
                @click="deletePrompt(prompt)"
              >删除</el-button>
            </div>
          </div>
        </template>
        <div class="card-content">
          <p class="scenario">场景: {{ prompt.scenario }}</p>
          <p class="description">{{ prompt.description }}</p>
          <div class="prompt-text">{{ prompt.prompt.slice(0, 50) }}...</div>
        </div>
      </el-card>
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="完整提示词"
      width="50%"
      :close-on-click-modal="false"
    >
      <div class="dialog-content">
        <h3>{{ selectedPrompt?.title }}</h3>
        <p class="scenario">场景: {{ selectedPrompt?.scenario }}</p>
        <p class="description">{{ selectedPrompt?.description }}</p>
        <div class="full-prompt">{{ selectedPrompt?.prompt }}</div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button type="success" @click="sharePrompt(selectedPrompt!)">分享</el-button>
          <el-button type="primary" @click="usePrompt(selectedPrompt!)">
            使用此提示词
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="shareDialogVisible"
      title="分享提示词"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="share-content">
        <h4>{{ selectedPrompt?.title }}</h4>
        <p class="share-desc">扫描二维码获取提示词：</p>
        <div class="share-qr" ref="qrCodeRef"></div>
        <div class="prompt-preview">
          <p class="preview-title">提示词预览：</p>
          <div class="preview-text">{{ selectedPrompt?.prompt.slice(0, 50) }}...</div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="copyPromptText">复制提示词</el-button>
          <el-button @click="shareDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="addPromptVisible"
      title="添加提示词模板"
      width="60%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addPromptFormRef"
        :model="newPrompt"
        :rules="promptRules"
        label-width="100px"
        label-position="top"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="newPrompt.title" placeholder="请输入提示词标题" />
        </el-form-item>
        
        <el-form-item label="场景" prop="scenario">
          <el-input v-model="newPrompt.scenario" placeholder="请输入使用场景" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="newPrompt.description"
            type="textarea"
            :rows="2"
            placeholder="请输入提示词描述"
          />
        </el-form-item>
        
        <el-form-item label="提示词内容" prop="prompt">
          <el-input
            v-model="newPrompt.prompt"
            type="textarea"
            :rows="6"
            placeholder="请输入完整的提示词内容"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addPromptVisible = false">取消</el-button>
          <el-button type="primary" @click="submitNewPrompt">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, FormInstance, FormRules, ElMessageBox } from 'element-plus'
import { Plus, Download, Upload } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import type { UploadFile } from 'element-plus'

interface Prompt {
  title: string;
  scenario: string;
  description: string;
  prompt: string;
}

const dialogVisible = ref(false)
const shareDialogVisible = ref(false)
const selectedPrompt = ref<Prompt | null>(null)
const qrCodeRef = ref<HTMLElement | null>(null)

const generateQRCode = async () => {
  if (!qrCodeRef.value || !selectedPrompt.value) return
  try {
    const promptText = selectedPrompt.value.prompt
    const qrCode = await QRCode.toDataURL(promptText, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250
    })
    const img = document.createElement('img')
    img.src = qrCode
    img.style.width = '250px'
    img.style.height = '250px'
    qrCodeRef.value.innerHTML = ''
    qrCodeRef.value.appendChild(img)
  } catch (err) {
    console.error('Failed to generate QR code:', err)
  }
}

const sharePrompt = async (prompt: Prompt) => {
  selectedPrompt.value = prompt
  shareDialogVisible.value = true
  await generateQRCode()
}

const copyPromptText = async () => {
  if (!selectedPrompt.value) return
  try {
    await navigator.clipboard.writeText(selectedPrompt.value.prompt)
    ElMessage({
      message: '提示词已复制到剪贴板！',
      type: 'success',
      duration: 2000
    })
  } catch (err) {
    ElMessage({
      message: '复制失败，请手动复制提示词。',
      type: 'error',
      duration: 2000
    })
    console.error('Failed to copy:', err)
  }
}

const prompts = [
  {
    title: '代码助手',
    scenario: '编程开发',
    description: '帮助编写、审查和优化代码的AI助手',
    prompt: '你是一个专业的程序员，精通各种编程语言和最佳实践。请帮助我完成代码编写、审查和优化。在回答时，请注重代码的可读性、性能和安全性。如果发现潜在问题，请指出并提供改进建议。请遵循以下原则：\n1. 提供清晰的代码注释\n2. 使用最佳实践和设计模式\n3. 考虑代码的可扩展性和维护性\n4. 关注性能优化和安全漏洞\n5. 给出详细的解释和建议'
  },
  {
    title: '文章优化',
    scenario: '内容创作',
    description: '改进文章结构和表达的AI助手',
    prompt: '作为一个专业的文案编辑，你擅长优化文章结构和表达。请帮助我改进文章的清晰度、连贯性和吸引力。分析现有内容，提供具体的修改建议，确保文章既专业又易于理解。请从以下方面进行优化：\n1. 文章结构和逻辑流程\n2. 段落之间的过渡和连贯性\n3. 词准确性和表达多样性\n4. 语法和标点符号使用\n5. 整体可读性和吸引力'
  },
  {
    title: '数据分析',
    scenario: '数据处理',
    description: '数据分析和可视化的AI助手',
    prompt: '作为一个数据分析专家，你精通数据处理、统计分析和数据可视化。请帮助我分析数据集，找出关键趋势和洞察。在回答时，请提供详细的分析方法、统计依据，并建议合适的可视化方式。分析应包含：\n1. 数据清洗和预处理建议\n2. 描述性统计分析\n3. 相关性分析和假设检验\n4. 关键发现和洞察\n5. 可视化方案建议'
  },
  {
    title: '产品经理',
    scenario: '产品设计',
    description: '帮助规划和优化产品功能的AI助手',
    prompt: '你是一位经验丰富的产品经理，精通产品设计和用户体验。请帮助我进行产品规划、功能设计和优化。在回答时，请注重用户需求、市场趋势和商业价值。���析应包含：\n1. 用户需求分析\n2. 功能优先级排序\n3. 用户流程设计\n4. 竞品分析建议\n5. 数据指标设计'
  },
  {
    title: '学习导师',
    scenario: '教育辅导',
    description: '帮助理解和掌握知识的AI助手',
    prompt: '你是一位贴心的学习导师，擅长将复杂概念并帮助他人理解。请用通俗易懂的方式解释问题，并提供实用的学习建议。回答时请：\n1. 使用简单的类比和例子\n2. 分步骤解释复杂概念\n3. 提供实践练习建议\n4. 解答常见疑惑\n5. 给出进阶学习路径'
  },
  {
    title: '创意写作',
    scenario: '文学创作',
    description: '激发创意并改进写作的AI助手',
    prompt: '你是一位富有创造力的写作导师，擅长激发灵感并提供写作建议。请帮助我发展创意并改进写作技巧。指导应包含：\n1. 故事结构建议\n2. 角色发展建议\n3. 场景描写技巧\n4. 对话写作技巧\n5. 情节推进方法'
  },
  {
    title: '市场营销',
    scenario: '营销策划',
    description: '制定营销策略的AI助手',
    prompt: '你是一位资深的市场营销专家，精通各种营销策略和方法。请帮助我制定有效的营销计划和内容策略。建议应包含：\n1. 目标受众分析\n2. 营销渠道选择\n3. 内��策略规划\n4. 投放优化建议\n5. 效果评估方法'
  },
  {
    title: '面试教练',
    scenario: '求职面试',
    description: '帮助准备面试的AI助手',
    prompt: '你是一位经验丰富的面试教练，精通各类面试技巧和准备方法。请帮助我准备面试，提供专业的建议和模板练。指导应包含：\n1. 常见问题解答技巧\n2. 行为面试准备方法\n3. 专业问题应对策略\n4. 面试礼仪建议\n5. 反问环节准备'
  },
  {
    title: '生活管家',
    scenario: '日常生活',
    description: '提供生活建议的AI助手',
    prompt: '你是一位贴心的生活管家，擅长提供各种实用的生活建议和解决方案。请帮助我解决日常生活中的各种问题。建议应包含：\n1. 时间管理方法\n2. 健康饮食建议\n3. 家居整理技巧\n4. 理财规划建议\n5. 生活效率提升'
  },
  {
    title: '健身教练',
    scenario: '运动健康',
    description: '制定运动计划的AI助手',
    prompt: '你是一位专业的健身教练，精通运动科学和训练方法。请帮助我制定科学的运动计划和健康建议。指导应包含：\n1. 体能评估建议\n2. 训练计划制定\n3. 动作要领指导\n4. 营养补充建议\n5. 恢复方法建议'
  }
]

const viewPrompt = (prompt: Prompt) => {
  selectedPrompt.value = prompt
  dialogVisible.value = true
}

const usePrompt = async (prompt: Prompt) => {
  if (dialogVisible.value) {
    dialogVisible.value = false
  }
  
  try {
    await navigator.clipboard.writeText(prompt.prompt)
    ElMessage({
      message: '提示词已复制到剪贴板！请在对应模型设置中点击设置按钮，将其粘贴到系统角色中。',
      type: 'success',
      duration: 5000,
      showClose: true,
      grouping: true,
    })
  } catch (err) {
    ElMessage({
      message: '复制失败，请手动复制提示词。',
      type: 'error',
      duration: 3000,
    })
    console.error('Failed to copy:', err)
  }
}

const promptRules: FormRules = {
  title: [
    { required: true, message: '请输入提示词标题', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  scenario: [
    { required: true, message: '请输入使用场景', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入提示词描述', trigger: 'blur' }
  ],
  prompt: [
    { required: true, message: '请输入提示词内容', trigger: 'blur' },
    { min: 10, message: '提示词内容不能少于 10 个字符', trigger: 'blur' }
  ]
}

const addPromptVisible = ref(false)
const addPromptFormRef = ref<FormInstance>()
const newPrompt = ref<Prompt>({
  title: '',
  scenario: '',
  description: '',
  prompt: ''
})

const systemPrompts = [...prompts]

const userPrompts = ref<Prompt[]>([])

const allPrompts = computed(() => {
  return [...systemPrompts, ...userPrompts.value]
})

const showAddPromptDialog = () => {
  newPrompt.value = {
    title: '',
    scenario: '',
    description: '',
    prompt: ''
  }
  addPromptVisible.value = true
}

const submitNewPrompt = async () => {
  if (!addPromptFormRef.value) return
  
  await addPromptFormRef.value.validate((valid) => {
    if (valid) {
      userPrompts.value.push({ ...newPrompt.value })
      
      localStorage.setItem('userPrompts', JSON.stringify(userPrompts.value))
      
      ElMessage({
        message: '提示词添加成功！',
        type: 'success',
        duration: 2000
      })
      
      addPromptVisible.value = false
    }
  })
}

const loadUserPrompts = () => {
  const savedPrompts = localStorage.getItem('userPrompts')
  if (savedPrompts) {
    userPrompts.value = JSON.parse(savedPrompts)
  }
}

loadUserPrompts()

const isUserPrompt = (prompt: Prompt) => {
  return userPrompts.value.some(p => p.title === prompt.title && p.prompt === prompt.prompt)
}

const deletePrompt = (prompt: Prompt) => {
  ElMessageBox.confirm(
    '确定要删除这个提示词模板吗？',
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    userPrompts.value = userPrompts.value.filter(p => 
      !(p.title === prompt.title && p.prompt === prompt.prompt)
    )
    localStorage.setItem('userPrompts', JSON.stringify(userPrompts.value))
    ElMessage({
      type: 'success',
      message: '删除成功'
    })
  }).catch(() => {
    // 取消删除
  })
}

const exportPrompts = () => {
  if (userPrompts.value.length === 0) {
    ElMessage({
      message: '暂无自定义模板可导出',
      type: 'warning'
    })
    return
  }

  const exportData = {
    version: '1.0',
    prompts: userPrompts.value,
    exportDate: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `prompt-templates-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage({
    message: '导出成功！',
    type: 'success'
  })
}

const handleImport = (file: UploadFile) => {
  if (!file || !file.raw) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const importData = JSON.parse(content)

      // 验证导入数据的格式
      if (!importData.prompts || !Array.isArray(importData.prompts)) {
        throw new Error('无效的模板文件格式')
      }

      // 验证每个提示词的必要字段
      const isValidPrompt = (p: unknown): p is Prompt => {
        const prompt = p as Partial<Prompt>
        return typeof prompt.title === 'string' &&
               typeof prompt.scenario === 'string' &&
               typeof prompt.description === 'string' &&
               typeof prompt.prompt === 'string'
      }

      if (!importData.prompts.every(isValidPrompt)) {
        throw new Error('模板数据格式不正确')
      }

      // 确认导入
      ElMessageBox.confirm(
        `确定导入 ${importData.prompts.length} 个模板？`,
        '导入确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        }
      ).then(() => {
        // 合并现有模板，去重
        const newPrompts = importData.prompts.filter(newPrompt => 
          !userPrompts.value.some(existingPrompt => 
            existingPrompt.title === newPrompt.title && 
            existingPrompt.prompt === newPrompt.prompt
          )
        )

        userPrompts.value = [...userPrompts.value, ...newPrompts]
        localStorage.setItem('userPrompts', JSON.stringify(userPrompts.value))

        ElMessage({
          message: `成功导入 ${newPrompts.length} 个新模板！`,
          type: 'success'
        })
      }).catch(() => {
        // 取消导入
      })
    } catch (err) {
      ElMessage({
        message: '导入失败：文件格式不正确',
        type: 'error'
      })
    }
  }
  reader.readAsText(file.raw)
}
</script>

<style scoped>
.prompt-market {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
  width: 100%;
  box-sizing: border-box;
}

.prompt-card {
  height: 100%;
  min-height: 200px;
  margin: 0;
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.button-group {
  display: flex;
  gap: 8px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scenario {
  color: #409EFF;
  font-size: 15px;
  font-weight: 500;
}

.description {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.prompt-text {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.full-prompt {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  white-space: pre-wrap;
  line-height: 1.6;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

.share-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 20px;
}

.share-desc {
  color: #666;
  margin: 0;
  text-align: center;
  font-size: 15px;
}

.share-qr {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.prompt-preview {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
}

.preview-title {
  color: #666;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.preview-text {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.el-dialog__body) {
  padding: 24px 0;
}

.market-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-prompt-card {
  height: 100%;
  min-height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  color: #909399;
  background: #f5f7fa;
}

.add-prompt-card:hover {
  border-color: #409EFF;
  color: #409EFF;
  background: #ecf5ff;
}

.add-prompt-card .el-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.add-prompt-card span {
  font-size: 16px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  box-shadow: none;
  border: 1px solid #dcdfe6;
}

:deep(.el-input__wrapper:hover),
:deep(.el-textarea__inner:hover) {
  border-color: #409EFF;
}

:deep(.el-form-item.is-error .el-input__wrapper),
:deep(.el-form-item.is-error .el-textarea__inner) {
  border-color: #f56c6c;
}

.header-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.upload-button {
  display: inline-block;
}

:deep(.el-upload) {
  display: inline-block;
}
</style> 