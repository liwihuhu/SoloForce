# SoloForce

<p align="center">
  <img src="./public/logo.png" alt="SoloForce Logo" width="180"/>
</p>

<p align="center">
  <a href="https://github.com/yourusername/SoloForce">
    <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version"/>
  </a>
  <a href="https://github.com/yourusername/SoloForce/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License"/>
  </a>
  <a href="https://github.com/yourusername/SoloForce">
    <img src="https://img.shields.io/badge/React-18.x-61dafb" alt="React"/>
  </a>
  <a href="https://github.com/yourusername/SoloForce">
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6" alt="TypeScript"/>
  </a>
  <a href="https://github.com/yourusername/SoloForce">
    <img src="https://img.shields.io/badge/Express-5.x-fff?style=flat&logo=express" alt="Express"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/yourusername/SoloForce">
    <img src="https://img.shields.io/github/stars/yourusername/SoloForce?style=social" alt="Stars"/>
  </a>
  <a href="https://github.com/yourusername/SoloForce/fork">
    <img src="https://img.shields.io/github/forks/yourusername/SoloForce?style=social" alt="Forks"/>
  </a>
</p>

---

## 📋 目录

- [项目介绍](#-项目介绍)
- [项目预览](#-项目预览)
- [核心特性](#-核心特性)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [配置说明](#-配置说明)
- [使用指南](#-使用指南)
- [未来规划](#-未来规划)
- [许可证](#-许可证)

---

## 📖 项目介绍

**SoloForce（一人公司）** 是一款基于 AI 的智能管理流编排系统，结合OpenClaw实现一人本地化运营一个数字公司。

在AI经济时代，个人或小型团队如何高效管理多个 AI 助手完成复杂任务？SoloForce 给出了答案——通过 AI 技术实现**一个人管理一个"数字团队"**的梦想。

### 🌟 核心理念

> **未来的企业将不再依赖传统的"人力资源"，而是转向"数字人力资源"**
> 
> 一个人类 CEO + N 个 AI 数字员工 = 一个高效运转的"一人公司"

SoloForce 正是这一理念的实践者——让每个人都能成为真正的"一人公司"掌舵人。

---

## 📸 项目预览

<p align="center">

| | |
|:---:|:---:|
| <img src="./docs/images/team-topology.png" width="400"/> | <img src="./docs/images/employee-management.png" width="400"/> |
| **团队拓扑** | **员工管理** |
| <img src="./docs/images/team-management.png" width="400"/> | <img src="./docs/images/task-center.png" width="400"/> |
| **团队管理** | **任务中心** |

</p>

---

## ✨ 核心特性

### 1️⃣ 团队拓扑可视化

<img src="./docs/images/feature-topology.png" width="100%"/>

图形化展示"数字员工"组织和隶属关系，支持拖拽连线建立管理流程。

---

### 2️⃣ 自定义数字员工

<img src="./docs/images/feature-employee.png" width="100%"/>

创建和管理专属的数字员工，定义角色、技能和职责，打造你的虚拟团队。

---

### 3️⃣ AI 智能任务分发

<img src="./docs/images/feature-task-distribute.png" width="100%"/>

输入任务后，AI 自动分析并分发给合适的"数字员工"，模拟真实公司的任务分配流程。

---

### 4️⃣ OpenClaw 执行集成

<img src="./docs/images/feature-execute.png" width="100%"/>

任务执行完成后，提取可执行的技术命令，一键发送到 OpenClaw 执行。

---

### 5️⃣ 多团队管理

<img src="./docs/images/feature-teams.png" width="100%"/>

支持创建多个虚拟团队，每个团队有独立的员工配置和拓扑关系。

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| 可视化 | React Flow |
| 后端 | Express + Node.js |
| AI 引擎 | OpenAI 兼容 API |

---

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/SoloForce.git
cd SoloForce

# 安装依赖
npm install
```

### 配置

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件，配置你的 API Key
```

### 启动

```bash
# 终端1: 启动后端服务
npm run server

# 终端2: 启动前端服务
npm run dev
```

访问 http://localhost:5300

### 构建

```bash
npm run build
```

---

## 📁 项目结构

```
SoloForce/
├── public/                 # 静态资源
│   └── avatars/           # 数字员工头像
├── src/                   # 前端源码
│   ├── components/        # React 组件
│   ├── pages/             # 页面组件
│   ├── store.ts           # 状态管理
│   ├── types.ts           # 类型定义
│   └── App.tsx            # 主应用
├── server.ts              # Express 后端服务
├── package.json           # 项目配置
└── vite.config.ts         # Vite 配置
```

---

## 🔧 配置说明

### 环境变量

在项目根目录创建 `.env` 文件：

```env
# 后端服务端口
PORT=5301

# 大模型 API (必需)
# 支持 OpenAI 兼容 API (GPT, Claude, Qwen, DeepSeek 等)
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_MODEL=qwen2.5-7b-instruct
OPENAI_API_KEY=your_api_key_here

# OpenClaw 配置 (可选)
OPENCLAW_URL=http://127.0.0.1:18789
OPENCLAW_TOKEN=your_token
OPENCLAW_AGENT_ID=main
```

### 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 5300 | Vite 开发服务器 |
| 后端 | 5301 | Express API 服务 |

---

## 📖 使用指南

| 步骤 | 操作 | 说明 |
|:---:|------|------|
| 1️⃣ | 创建团队 | 在"团队管理"页面创建虚拟团队，配置成员和关系 |
| 2️⃣ | 建立拓扑 | 通过拖拽连接"数字员工"节点，建立隶属关系 |
| 3️⃣ | 发布任务 | 在"董事长命令中心"输入任务，AI 自动分发 |
| 4️⃣ | 执行命令 | 任务完成后，编辑确认发送至 OpenClaw 执行 |

---

## 🔮 未来规划

### v2.0 - 多模态交互
- [ ] 支持语音输入任务
- [ ] 添加语音播报执行结果
- [ ] 支持图片/文件上传

### v2.1 - 智能进化
- [ ] AI 员工自主学习优化
- [ ] 任务执行历史智能分析
- [ ] 自动建议最优工作流程

### v2.2 - 生态扩展
- [ ] 支持更多 AI 平台接入
- [ ] 插件市场 - 共享工作流模板
- [ ] API 开放 - 第三方应用集成

### v3.0 - 数字劳动力市场
- [ ] 数字员工市场
- [ ] 团队协作
- [ ] 企业级部署

---

## 🤝 寻求合作

SoloForce 现寻求志同道合的合作伙伴，共同探索"一人公司"的无限可能：

### 🔍 我们正在寻找

| 方向 | 说明 |
|------|------|
| 🌐 **技术合作伙伴** | AI Agent 平台、云服务商、开发者工具 |
| 📢 **推广渠道** | 科技博主、社区达人、内容创作者 |
| 💡 **产品顾问** | 产品设计、用户体验、商业化策略 |
| 💰 **投资支持** | 天使投资/种子轮（用于团队扩充和产品迭代） |

### 💼 合作形式

- **技术集成** - 将 SoloForce 能力整合到你的产品中
- **联合运营** - 共同打造"一人公司"生态社区
- **定制开发** - 为企业客户提供私有化部署服务
- **内容共创** - 教程、案例、最佳实践

### 📞 联系我们

- 📧 邮件：1781824487@qq.com
- 💬 GitHub Issues：欢迎提出问题与建议
- 🌐 官网：https://soloforce.ai（筹备中）

---

## 📄 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE) 文件。

---

<p align="center">
  <strong>SoloForce - 让一个人成就一家公司</strong>
</p>

<p align="center">
  ⭐ 如果这个项目对你有帮助，欢迎 Star 支持！
</p>
