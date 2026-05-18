# Gemini Image Studio - 设计方案

## 项目概述

基于 OpenRouter API 调用 Gemini 模型的 AI 图片工作室。支持三大核心功能：

1. **文字生成图片** (Text → Image) — 输入描述，生成图片
2. **图片编辑** (Image + Text → Image) — 上传图片 + 文字描述，生成编辑后的图片
3. **图片解释** (Image → Text) — 上传图片，AI 解释/分析图片内容

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | React + Vite (TypeScript) |
| 样式 | Tailwind CSS v4 |
| API Key 存储 | 浏览器 localStorage（无需后端） |
| API 代理 | OpenRouter → Gemini 模型 |
| UI 风格 | Glassmorphism（毛玻璃 + 暗色主题） |

---

## API 调用方案

### 基本信息
- **接口地址：** `POST https://openrouter.ai/api/v1/chat/completions`
- **认证方式：** `Authorization: Bearer <YOUR_API_KEY>`

### 模型选择
| 用途 | 模型 ID | 说明 |
|------|---------|------|
| 图片生成/编辑 | `google/gemini-2.5-flash-image` | Nano Banana 模型，支持生成图片 |
| 图片解释 | `google/gemini-2.5-flash` | 快速视觉理解模型 |

### 1. 文字生成图片

**请求格式：**
```json
{
  "model": "google/gemini-2.5-flash-image",
  "messages": [
    { "role": "user", "content": "画一只穿着宇航服的可爱柯基" }
  ],
  "modalities": ["image", "text"]
}
```

**带图片配置（可选）：**
```json
{
  "model": "google/gemini-2.5-flash-image",
  "messages": [
    { "role": "user", "content": "一座未来城市在夕阳下的电影级风景" }
  ],
  "modalities": ["image", "text"],
  "image_config": {
    "aspect_ratio": "16:9",
    "image_size": "2K"
  }
}
```

支持的宽高比：`1:1`(默认), `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

支持的分辨率：`1K`(默认), `2K`, `4K`

**响应格式：**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "这是您要求的图片...",
      "images": [{
        "type": "image_url",
        "image_url": {
          "url": "data:image/png;base64,iVBORw0KGgo..."
        }
      }]
    }
  }]
}
```

### 2. 图片编辑（Image + Text → Image）

上传图片作为 base64，附上编辑指令：

```json
{
  "model": "google/gemini-2.5-flash-image",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "把天空改成夕阳，添加橙色和紫色的云彩" },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,/9j/4AAQ..." } }
    ]
  }],
  "modalities": ["image", "text"]
}
```

### 3. 图片解释（Image → Text）

不需要 `modalities` 参数，纯文本返回：

```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "请详细描述这张图片的内容" },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,/9j/4AAQ..." } }
    ]
  }]
}
```

---

## 项目目录结构

```
gemini-pic/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── DESIGN.md                     # 本设计文档
├── src/
│   ├── main.tsx                  # 入口文件
│   ├── App.tsx                   # 主应用组件
│   ├── index.css                 # 全局样式 + Tailwind
│   ├── api/
│   │   └── openrouter.ts         # OpenRouter API 客户端封装
│   ├── components/
│   │   ├── Header.tsx            # 顶部导航栏 + 设置按钮
│   │   ├── SettingsModal.tsx     # 设置弹窗（API Key / URL / 模型配置）
│   │   ├── ModeSelector.tsx      # 模式切换标签：生成 / 编辑 / 解释
│   │   ├── GeneratePanel.tsx     # 文字生成图片面板
│   │   ├── EditPanel.tsx         # 图片编辑面板
│   │   ├── ExplainPanel.tsx      # 图片解释面板
│   │   ├── ImageUploader.tsx     # 拖拽/点击上传图片组件
│   │   ├── ResultDisplay.tsx     # 结果展示（图片/文字）
│   │   └── ImageHistory.tsx      # 历史记录缩略图
│   ├── hooks/
│   │   └── useSettings.ts        # 设置管理 Hook（localStorage）
│   └── types/
│       └── index.ts              # TypeScript 类型定义
```

---

## UI 设计

### 整体布局

```
┌─────────────────────────────────────────────────────┐
│  🎨 Gemini Image Studio                    ⚙️ Settings │  ← Header
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  [ 生成 ] [ 编辑 ] [ 解释 ]  ← Mode Tabs           │
│                      │                              │
│  ┌────────────────┐  │    ┌──────────────────────┐  │
│  │                │  │    │                      │  │
│  │  输入区域       │  │    │    结果展示区域       │  │
│  │  (Prompt /     │  │    │    (生成的图片 /      │  │
│  │   Image Upload)│  │    │     文字解释)         │  │
│  │                │  │    │                      │  │
│  └────────────────┘  │    └──────────────────────┘  │
│                      │                              │
│  [ 生成图片 ]        │    [ 下载 ] [ 复制 ]          │
│                      │                              │
│                      │    ── 历史记录 ──             │
│                      │    [📷] [📷] [📷] [📷]       │
├──────────────────────┴──────────────────────────────┤
│                      Footer                         │
└─────────────────────────────────────────────────────┘
```

### 色彩方案
- **背景：** 深色渐变 `#0a0a1a → #1a1a2e`
- **毛玻璃卡片：** `bg-white/5 backdrop-blur-xl border border-white/10`
- **主色调：** 紫蓝渐变 `#7c3aed → #3b82f6`
- **文字：** 白色主文字，`white/60` 次要文字
- **按钮：** 紫蓝渐变 + hover 发光效果
- **输入框：** 半透明暗色背景 + 聚焦时紫色边框

### 三种模式详情

#### 模式一：文字生成图片
- 多行文本输入框（prompt）
- 宽高比选择器（下拉菜单）
- 分辨率选择（可选）
- "生成图片" 按钮
- 加载动画（脉冲 / 旋转动画）
- 结果：图片 + 下载按钮

#### 模式二：图片编辑
- 图片上传区域（拖拽 / 点击 / 粘贴）
- 图片预览（可删除重新上传）
- 编辑指令文本框
- "编辑图片" 按钮
- 结果：编辑后的图片 + 下载按钮

#### 模式三：图片解释
- 图片上传区域
- 可选的提问文本框（如 "这张图片里有什么动物？"）
- "分析图片" 按钮
- 结果：Markdown 格式的文字解释

---

## 核心模块设计

### API 客户端 (`openrouter.ts`)

```typescript
interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 三个核心函数
generateImage(config, prompt, options?) → Promise<GenerateResult>
editImage(config, imageBase64, prompt, options?) → Promise<GenerateResult>
explainImage(config, imageBase64, question?) → Promise<string>
```

### 设置管理 (`useSettings.ts`)

```typescript
interface Settings {
  apiKey: string;
  baseUrl: string;       // 默认 https://openrouter.ai/api/v1
  imageModel: string;    // 默认 google/gemini-2.5-flash-image
  visionModel: string;   // 默认 google/gemini-2.5-flash
}

// localStorage key: 'gemini-studio-settings'
```

### 类型定义 (`types/index.ts`)

```typescript
type AppMode = 'generate' | 'edit' | 'explain'
type AspectRatio = '1:1' | '16:9' | '9:16' | '2:3' | '3:2' | ...
type ImageSize = '1K' | '2K' | '4K'

interface HistoryItem {
  id: string
  mode: AppMode
  prompt: string
  inputImage?: string     // base64
  resultImage?: string    // base64
  resultText?: string
  timestamp: number
}
```

---

## 实现步骤

### Step 1: 项目初始化
- 使用 Vite 创建 React + TypeScript 项目
- 安装依赖：`tailwindcss`, `@tailwindcss/vite`
- 配置 Tailwind CSS v4、Vite、TypeScript

### Step 2: 类型定义 & API 客户端
- 定义所有 TypeScript 接口
- 实现 `openrouter.ts` 三个核心 API 函数
- 错误处理与超时机制

### Step 3: 设置系统
- `useSettings` Hook
- `SettingsModal` 组件（API Key / Base URL / 模型选择）
- 首次打开自动弹出设置引导

### Step 4: 通用 UI 组件
- `Header` — 顶部导航
- `ImageUploader` — 拖拽上传（支持粘贴）
- `ResultDisplay` — 图片/文字结果展示 + 下载
- `ModeSelector` — 模式切换标签

### Step 5: 三个功能面板
- `GeneratePanel` — 文字生成图片
- `EditPanel` — 图片编辑
- `ExplainPanel` — 图片解释

### Step 6: 历史记录 & 整合
- `ImageHistory` — 历史缩略图（localStorage 存储）
- `App.tsx` 整合所有组件
- 响应式适配（移动端）

---

## 验证方案

1. `npm run dev` 启动无报错
2. 设置弹窗可正常配置 API Key 并持久化
3. **生成模式：** 输入描述 → 图片正确显示 → 可下载
4. **编辑模式：** 上传图片 + 编辑指令 → 编辑后图片显示
5. **解释模式：** 上传图片 → 文字解释正确显示
6. 历史记录正常保存与显示
7. 移动端响应式正常
