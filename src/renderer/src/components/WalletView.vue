<template>
  <div class="wallet-container">
    <div class="wallet-header">
      <h2>API 余额</h2>
      <div class="header-actions">
        <el-button 
          type="primary" 
          :icon="Refresh"
          :loading="isRefreshing"
          @click="refreshAllBalances"
        >
          刷新余额
        </el-button>
        <el-button type="primary" @click="addNewKey">
          <el-icon><Plus /></el-icon>添加 API Key
        </el-button>
      </div>
    </div>
    
    <div class="wallet-cards">
      <!-- 动态渲染已添加的模型卡片 -->
      <div 
        v-for="(balance, modelId) in modelBalances" 
        :key="modelId"
        class="wallet-card"
      >
        <div class="card-header">
          <img 
            src="https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/openai.svg" 
            :alt="modelId"
            class="model-icon"
          />
          <span class="model-name">{{ modelId === 'one-api' ? 'One API' : 'New API' }}</span>
          <el-tag 
            size="small" 
            :type="balance.status === 'error' ? 'danger' : 'info'"
            class="update-time"
          >
            {{ balance.lastUpdate ? new Date(balance.lastUpdate).toLocaleTimeString() : '未更新' }}
          </el-tag>
        </div>
        <div class="card-body">
          <div class="balance-info">
            <span class="balance-label">可用额度</span>
            <span class="balance-value">${{ balance.available.toFixed(2) }}</span>
          </div>
          <div class="usage-info">
            <span class="usage-label">已用额度</span>
            <span class="usage-value">${{ balance.used.toFixed(2) }}</span>
          </div>
          <el-progress 
            :percentage="balance.total ? (balance.used / balance.total * 100) : 0" 
            :format="format" 
            :stroke-width="8"
            :status="balance.status === 'error' ? 'exception' : 'success'"
          />
        </div>
        <div class="card-footer">
          <el-button size="small" @click="showApiKey(modelId)">查看 Key</el-button>
          <el-button size="small" type="danger" @click="deleteModel(modelId)">删除</el-button>
        </div>
      </div>

      <!-- 添加新模型卡片 -->
      <div class="wallet-card add-card" @click="addNewKey">
        <el-icon><Plus /></el-icon>
        <span>添加新模型</span>
      </div>
    </div>

    <!-- 添加设置弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentModel.name ? `${currentModel.name} 设置` : '添加新模型'"
      width="500px"
    >
      <div class="api-settings">
        <template v-if="!currentModel.name">
          <div class="settings-item">
            <span class="item-label">选择模型</span>
            <el-select v-model="currentModel.name" placeholder="请选择模型">
              <el-option label="One API" value="one-api" />
              <el-option label="New API" value="new-api" />
            </el-select>
          </div>
        </template>
        
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
            :placeholder="'接口地址，如：https://api.openai.com'"
          >
            <template #append>
              <el-button @click="currentModel.baseUrl = ''">
                重置
              </el-button>
            </template>
          </el-input>
          <div class="settings-hint">
            如果使用第三方代理，可以在此修改 Base URL
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveApiKey">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加密码输入对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="密码输入"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <el-form :model="passwordForm" @submit.prevent="handlePasswordSubmit">
        <el-form-item label="密码" :error="passwordForm.error">
          <el-input
            v-model="passwordForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handlePasswordSubmit"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePasswordCancel">取消</el-button>
          <el-button type="primary" @click="handlePasswordSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { deriveKey } from '../script/cryptoUtils'; // 引入加密工具函数

const format = (percentage: number) => percentage + '% 余额';

// 添加弹窗相关的状态
const dialogVisible = ref(false);
const currentModel = ref({
  name: '',
  apiKey: '',
  baseUrl: ''
});

// 定义加密相关常量

// 添加余额状态
interface ModelBalance {
  available: number;
  used: number;
  total: number;
  status: 'success' | 'error' | 'loading';
  lastUpdate: number;
}

// 添加余额状态
const modelBalances = ref<Record<string, ModelBalance>>({});

// 添加刷新状态
const isRefreshing = ref(false);

// 添加密码对话框相关状态
const passwordDialogVisible = ref(false);
const passwordForm = ref({
  password: '',
  error: ''
});
const passwordResolve = ref<((value: { response: number; returnValue: string }) => void) | null>(null);

// 显示密码对话框的方法
const showPasswordDialog = async (_message: string): Promise<{ response: number; returnValue: string }> => {
  passwordForm.value.password = '';
  passwordForm.value.error = '';
  passwordDialogVisible.value = true;
  
  return new Promise((resolve) => {
    passwordResolve.value = resolve;
  });
};

// 处理密码提交
const handlePasswordSubmit = () => {
  if (!passwordForm.value.password) {
    passwordForm.value.error = '请输入密码';
    return;
  }
  
  if (passwordResolve.value) {
    passwordResolve.value({
      response: 0,
      returnValue: passwordForm.value.password
    });
    passwordResolve.value = null;
  }
  
  passwordDialogVisible.value = false;
};

// 处理密码取消
const handlePasswordCancel = () => {
  if (passwordResolve.value) {
    passwordResolve.value({
      response: 1,
      returnValue: ''
    });
    passwordResolve.value = null;
  }
  
  passwordDialogVisible.value = false;
};

// 更新余额信息
const updateBalance = async (modelId: string) => {
  const settings = localStorage.getItem(`wallet_${modelId}`);
  if (!settings) return;

  try {
    const parsedSettings = JSON.parse(settings);
    const encryptedApiKey = Uint8Array.from(parsedSettings.encryptedApiKey);
    
    const { response, returnValue } = await showPasswordDialog('请输入密码以解密 API Key');
    if (response !== 0) return; // 用户点击了取消
    const password = returnValue;

    try {
      const salt = encryptedApiKey.slice(0, 16);
      const iv = encryptedApiKey.slice(16, 28);
      const encrypted = encryptedApiKey.slice(28);
      
      // 派生密钥
      const key = await deriveKey(password, salt, 100000);
      
      // 解密
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );
      
      // 解码API Key
      const decoder = new TextDecoder();
      const decryptedApiKey = decoder.decode(decryptedBuffer);

      // 设置请求头
      const headers = {
        'Authorization': `Bearer ${decryptedApiKey}`,
        'Content-Type': 'application/json'
      };

      // 根据不同的模型使用不同的API端点
      const baseUrl = parsedSettings.baseUrl || 'https://api.openai.com';
      const subscriptionUrl = `${baseUrl}/v1/dashboard/billing/subscription`;
      const usageUrl = `${baseUrl}/v1/dashboard/billing/usage`;

      // 获取订阅信息
      const subscriptionResponse = await fetch(subscriptionUrl, { headers });
      if (!subscriptionResponse.ok) {
        throw new Error('获取订阅信息失败');
      }
      const subscriptionData = await subscriptionResponse.json();

      // 获取使用量信息
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const usageResponse = await fetch(`${usageUrl}?start_date=${startDate}&end_date=${endDate}`, { headers });
      if (!usageResponse.ok) {
        throw new Error('获取使用量信息失败');
      }
      const usageData = await usageResponse.json();

      // 更新余额信息
      modelBalances.value[modelId] = {
        available: subscriptionData.hard_limit_usd || 0,
        used: usageData.total_usage ? (usageData.total_usage / 100) : 0,
        total: subscriptionData.hard_limit_usd || 0,
        status: 'success',
        lastUpdate: Date.now()
      };
    } catch (error) {
      console.error('解密或获取余额失败:', error);
      modelBalances.value[modelId].status = 'error';
      ElMessage.error('获取余额失败');
    }
  } catch (error) {
    console.error(`更新${modelId}余额失败:`, error);
    modelBalances.value[modelId].status = 'error';
    ElMessage.error(`更新${modelId}余额失败`);
  }
};

// 刷新所有模型余额
const refreshAllBalances = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;

  try {
    await Promise.all(Object.keys(modelBalances.value).map(updateBalance));
    ElMessage.success('余额更新成功');
  } catch (error) {
    console.error('更新余额失败:', error);
    ElMessage.error('部分模型余额更新失败');
  } finally {
    isRefreshing.value = false;
  }
};

// 在组件挂载时自动更新余额
onMounted(() => {
  loadSavedModels(); // 先加载已保存的模型
  refreshAllBalances(); // 然后更新所有模型的余额
});

// 添加新的 API Key
const addNewKey = () => {
  currentModel.value = {
    name: '',
    apiKey: '',
    baseUrl: ''
  };
  dialogVisible.value = true;
};

// 保存 API Key 设置
const saveApiKey = async () => {
  if (!currentModel.value.apiKey.trim()) {
    ElMessage.error('请输入 API Key');
    return;
  }

  const { response, returnValue } = await showPasswordDialog('请输入密码以加密 API Key');
  if (response !== 0) return; // 用户点击了取消
  const password = returnValue;

  try {
    // 生成盐值和IV
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);

    // 派生密钥
    const key = await deriveKey(password, salt, 100000);

    // 加密 API Key
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(currentModel.value.apiKey);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      dataBuffer
    );

    // 组合加密数据
    const combined = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);

    // 保存加密后的 API Key 和其他设置到 localStorage
    const settings = {
      encryptedApiKey: Array.from(combined),
      baseUrl: currentModel.value.baseUrl
    };
    localStorage.setItem(`wallet_${currentModel.value.name}`, JSON.stringify(settings));

    // 添加新模型的余额状态
    if (!modelBalances.value[currentModel.value.name]) {
      modelBalances.value[currentModel.value.name] = {
        available: 0,
        used: 0,
        total: 0,
        status: 'loading',
        lastUpdate: 0
      };
    }

    ElMessage.success('设置已保存');
    dialogVisible.value = false;

    // 刷新余额
    refreshAllBalances();
  } catch (error) {
    console.error('保存API Key失败:', error);
    ElMessage.error('保存API Key失败');
  }
};

// 查看 API Key
const showApiKey = async (modelName: string) => {
  try {
    const settings = localStorage.getItem(`wallet_${modelName}`);
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      const encryptedApiKey = Uint8Array.from(parsedSettings.encryptedApiKey);
      
      const { response, returnValue } = await showPasswordDialog('请输入密码以解密 API Key');
      if (response !== 0) return; // 用户点击了取消
      const password = returnValue;

      try {
        const salt = encryptedApiKey.slice(0, 16);
        const iv = encryptedApiKey.slice(16, 28);
        const encrypted = encryptedApiKey.slice(28);
        
        // 派生密钥
        const key = await deriveKey(password, salt, 100000);
        
        // 解密
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          encrypted
        );
        
        // 解码API Key
        const decoder = new TextDecoder();
        const decryptedApiKey = decoder.decode(decryptedBuffer);

        currentModel.value = {
          name: modelName,
          apiKey: decryptedApiKey,
          baseUrl: parsedSettings.baseUrl
        };
        dialogVisible.value = true;
      } catch (error) {
        console.error('解密API Key失败:', error);
        ElMessage.error('密码错误或解密失败');
      }
    } else {
      currentModel.value = {
        name: modelName,
        apiKey: '',
        baseUrl: ''
      };
      dialogVisible.value = true;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    ElMessage.error('加载设置失败');
  }
};

// 加载已保存的模型
const loadSavedModels = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('wallet_')) {
        const modelId = key.replace('wallet_', '');
        modelBalances.value[modelId] = {
          available: 0,
          used: 0,
          total: 0,
          status: 'loading',
          lastUpdate: 0
        };
      }
    }
  } catch (error) {
    console.error('加载已保存的模型失败:', error);
    ElMessage.error('加载已保存的模型失败');
  }
};

// 添加删除模型的功能
const deleteModel = (modelId: string) => {
  try {
    localStorage.removeItem(`wallet_${modelId}`);
    delete modelBalances.value[modelId];
    ElMessage.success('删除成功');
  } catch (error) {
    console.error('删除模型失败:', error);
    ElMessage.error('删除模型失败');
  }
};

// 解密 API Key 的辅助函数
</script>

<style scoped>
.wallet-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  width: 100%;
}

.wallet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.wallet-header h2 {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.wallet-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 0 10px;
  width: 100%;
}

.wallet-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.wallet-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  width: 100%;
}

.model-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.model-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.card-body {
  margin-bottom: 16px;
  flex: 1;
}

.balance-info, .usage-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.balance-label, .usage-label {
  color: #666;
  font-size: 14px;
}

.balance-value, .usage-value {
  font-weight: 500;
  color: #333;
}

.card-footer {
  margin-top: auto;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  color: #666;
  border: 2px dashed #ddd;
  background: #fafafa;
}

.add-card:hover {
  color: #333;
  border-color: #ccc;
  background: #f5f5f5;
}

.add-card .el-icon {
  font-size: 24px;
}

@media screen and (max-width: 1200px) {
  .wallet-cards {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media screen and (max-width: 768px) {
  .wallet-cards {
    grid-template-columns: 1fr;
  }
}

.api-settings {
  padding: 10px;
}

.settings-item {
  margin-bottom: 20px;
}

.item-label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.settings-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-select) {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.update-time {
  margin-left: auto;
  font-size: 12px;
}
</style> 