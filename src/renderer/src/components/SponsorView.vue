<template>
  <div class="sponsor-container">
    <div class="sponsor-content">
      <div class="header">
        <h2 class="title">请作者喝杯奶茶 <span class="emoji">☕</span></h2>
        <p class="subtitle">您的支持是我持续更新的动力</p>
      </div>
      
      <div class="qr-container">
        <div class="qr-item">
          <div class="qr-wrapper">
            <img 
              src="../assets/alipay.png" 
              alt="支付宝" 
              class="qr-code"
              @click="(e) => showQRCode((e.target as HTMLImageElement).src)"
            />
            <div class="qr-overlay">
              <el-icon class="overlay-icon"><Promotion /></el-icon>
              <span>点击中</span>
            </div>
          </div>
          <div class="qr-info">
            <el-icon class="platform-icon"><Money /></el-icon>
            <span class="qr-label">支付宝</span>
          </div>
        </div>
        
        <div class="qr-item">
          <div class="qr-wrapper">
            <img 
              src="../assets/wechat.png" 
              alt="微信" 
              class="qr-code"
              @click="(e) => showQRCode((e.target as HTMLImageElement).src)"
            />
            <div class="qr-overlay">
              <el-icon class="overlay-icon"><Promotion /></el-icon>
              <span>点击中</span>
            </div>
          </div>
          <div class="qr-info">
            <el-icon class="platform-icon"><ChatDotRound /></el-icon>
            <span class="qr-label">微信支付</span>
          </div>
        </div>
      </div>

      <div class="thank-section">
        <el-icon class="heart-icon"><StarFilled /></el-icon>
        <p class="thank-text">感谢您的支持！</p>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="showPreview" width="400px" :show-close="false" class="preview-dialog">
      <img :src="previewImage" class="preview-image" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Money, ChatDotRound, Promotion, StarFilled } from '@element-plus/icons-vue'

const showPreview = ref(false)
const previewImage = ref('')

const showQRCode = (image: string) => {
  if (image && image.includes('data:image') || image.includes('blob:') || image.includes('file:')) {
    previewImage.value = image
    showPreview.value = true
  }
}
</script>

<style scoped>
.sponsor-container {
  flex: 1;
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  min-height: 100%;
}

.sponsor-content {
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.header {
  text-align: center;
}

.title {
  font-size: 32px;
  color: #2c3e50;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.emoji {
  font-size: 36px;
}

.subtitle {
  font-size: 16px;
  color: #5c6b7c;
}

.qr-container {
  display: flex;
  gap: 60px;
  margin: 20px 0;
  flex-wrap: wrap;
  justify-content: center;
}

.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.qr-wrapper {
  background: white;
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.qr-wrapper:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.qr-wrapper:hover .qr-overlay {
  opacity: 1;
}

.qr-code {
  width: 220px;
  height: 220px;
  border-radius: 10px;
  display: block;
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  color: white;
  gap: 10px;
}

.overlay-icon {
  font-size: 24px;
}

.qr-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f2f5;
  padding: 8px 16px;
  border-radius: 20px;
}

.platform-icon {
  font-size: 18px;
  color: #409EFF;
}

.qr-label {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
}

.thank-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.heart-icon {
  font-size: 24px;
  color: #f56c6c;
  animation: pulse 1.5s infinite;
}

.thank-text {
  font-size: 18px;
  color: #5c6b7c;
  font-weight: 500;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.preview-dialog :deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

.preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.preview-image {
  width: 100%;
  display: block;
}
</style> 