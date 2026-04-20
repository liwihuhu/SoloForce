# SoloForce

> 🌐 **Language / 语言**: [English](./README.md) | [中文](./README-zh.md)

<p align="center">
  <img src="./public/logo.png" alt="SoloForce Logo" width="180"/>
</p>

<p align="center">
  <strong>One Person × Digital Twin × AI Collaboration × Cyber Employee Raising</strong>
</p>

<p align="center">
  <a href="https://github.com/yourusername/SoloForce">
    <img src="https://img.shields.io/badge/version-2.0.0-blue" alt="Version"/>
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
    <img src="https://img.shields.io/badge/Three.js-r150-rosa" alt="Three.js"/>
  </a>
</p>

---

## 🆕 v2.0 Update Notes (April 2026)

> This release adds three core features:
> 1. 🏢 **Digital Twin Company Map** — 6-floor 3D building, browse single floor or see all floors at once
> 2. 💬 **AI Meeting Room** — Multi-role negotiation discussion + shared blackboard
> 3. 🏭 **Multi-Industry Templates** — 8 industries, 28+ role types
>
> ⚠️ This version is still being improved and may have some issues.

---

## 📋 Table of Contents

- [Introduction](#-introduction)
- [Project Preview](#-project-preview)
- [Core Features](#-core-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 📖 Introduction

**SoloForce** is an AI-powered digital twin workflow orchestration system — build your virtual company with digital employees and run a fully functional enterprise in cyberspace.

### 🌟 Core Vision

> **The future of enterprises will no longer rely on traditional "human resources" but shift to "digital human resources"**
>
> One human CEO + N AI digital employees = One highly efficient "one-person company"

---

## 📸 Project Preview

### 🏢 Company Map — Digital Twin Floors

| | |
|:---:|:---:|
| <img src="./docs/images/公司地图-1F.png" width="400"/> | <img src="./docs/images/公司地图-6F.png" width="400"/> |
| **1F Lobby** — Reception & Employee Workstations | **6F OpenClaw Server Room** — Neural Network Core |
| <img src="./docs/images/公司地图-2F.png" width="400"/> | <img src="./docs/images/公司地图-3F.png" width="400"/> |
| **2F HR** — Employee Archive Management | **3F Projects** — Multi-Project Kanban |
| <img src="./docs/images/公司地图-4F.png" width="400"/> | <img src="./docs/images/公司地图-5F.png" width="400"/> |
| **4F Task Hall** — Command Podium | **5F Archives** — File Cabinet Array |

### 🗺️ Flat Overview

<img src="./docs/images/平铺总览.png" width="100%"/>

All floors stacked vertically — see the entire digital building at a glance.

### 💬 Meeting Room — AI Negotiation Discussion

<img src="./docs/images/会议模式.png" width="100%"/>

Multi-role AI negotiation discussion, with the user (arbitrator) able to interject at any time.

### Team Topology

| | |
|:---:|:---:|
| <img src="./docs/images/team-topology.png" width="400"/> | <img src="./docs/images/employee-management.png" width="400"/> |
| **Team Topology** | **Employee Management** |
| <img src="./docs/images/team-management.png" width="400"/> | <img src="./docs/images/task-center.png" width="400"/> |
| **Team Management** | **Task Center** |

---

## ✨ Core Features

### 🏢 1️⃣ Company Map (Digital Twin Floors) 🆕

A digital twin of a 6-story office building, each floor with its own theme color and 3D scene. Two browsing modes:

- **Single Floor 3D View** — Click a floor tab to focus on that floor's 3D visualization with auto-orbiting camera
- **Flat Overview** — All floors stacked vertically for a bird's-eye view of the entire digital building

Enables full visualization of company organizational structure, employee relationships, task distribution, and task execution flow data.

---

### 💬 2️⃣ Meeting Room (AI Negotiation Discussion) 🆕

Multi-role AI negotiation space simulating real meeting scenarios:

- **AI Queue Speaking** — Multiple AI roles speak in sequence; the user (arbitrator) can interject at any time
- **Shared Black Board** — Add key discussion points during the meeting, displayed in real-time
- **Customizable System Prompts** — Define AI role personalities, speaking styles, and discussion rules
- **Negotiation Engine** — AI autonomously judges when to speak, maintaining discussion rhythm

---

### 👥 3️⃣ Team Topology Visualization

Graphically display "digital employee" organization and reporting relationships, supporting drag-and-drop connections to establish management workflows.

---

### 🏭 4️⃣ Multi-Industry Templates 🆕

Support creating companies in different industries with dedicated role configurations:

| Industry | Representative Roles |
|----------|----------------------|
| Tech / Internet | Frontend, Backend, Architect, QA, Product, Operations |
| Finance / Securities | Securities Analyst, Fund Manager, Risk Controller, Quant Researcher |
| Healthcare | Medical Editor, Health Advisor, Data Analyst, BD Manager |
| Education | Course Advisor, Researcher, Subject Teacher, Study Abroad Consultant |
| Media / Creative | Content Editor-in-Chief, New Media Ops, Video Editor, BD |
| Manufacturing | Process Engineer, Quality Manager, Supply Chain, Equipment Maintenance |
| Enterprise General | Admin, Legal, Finance, HR |
| Custom | Freely define industry and roles |

**Standard Roles (12 types)**: Chairman, Executive Officer, Manager, Developer, Designer, Data Analyst, Writer, Customer Support, Researcher, QA, Sales, Custom.

---

### 🤖 5️⃣ Custom Digital Employees

Create and manage dedicated digital employees, define roles, skills, and responsibilities to build your virtual team.

---

### ⚡ 6️⃣ AI Intelligent Task Distribution

After entering a task, AI automatically analyzes and assigns it to the appropriate "digital employee", simulating a real company's task assignment process.

---

### 🚀 7️⃣ OpenClaw Execution Integration

After task execution is complete, extract executable technical commands and send them to OpenClaw with one click.

---

### 📋 8️⃣ Multi-Team Management

Support creating multiple virtual teams, each with independent employee configuration, topology relationships, and industry attributes.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| 3D Visualization | Three.js + @react-three/fiber + @react-three/drei |
| Topology Graph | React Flow (drag-and-drop connections) |
| Backend | Express + Node.js + SiliconFlow API |
| AI Execution | OpenClaw Gateway + SiliconFlow LLM |

---

## 🚀 Getting Started

### Installation

```bash
git clone https://github.com/yourusername/SoloForce.git
cd SoloForce
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env and fill in your SiliconFlow API Key
```

### Start

```bash
# Start both frontend + backend
npm run dev:all

# Or separately:
npm run server   # backend port 5301
npm run dev      # frontend port 5300
```

Visit **http://localhost:5300**

### Build

```bash
npm run build
```

---

## 📁 Project Structure

```
SoloForce/
├── public/
│   └── avatars/           # Digital employee avatars
├── docs/
│   └── images/           # 📸 Project screenshots
├── src/
│   ├── control-room/     # 🏢 Digital twin floor system (6-floor 3D)
│   │   ├── Floor3DDemo.tsx # 3D floor main scene
│   │   └── floorConfigs.ts  # Floor configuration
│   ├── components/
│   │   ├── EmployeeNode.tsx # Topology graph node
│   │   ├── ChatPanel.tsx   # Right-side chat panel
│   │   └── Sidebar.tsx     # Sidebar
│   ├── pages/
│   │   ├── TeamTopology.tsx  # Team topology graph
│   │   ├── TeamManagement.tsx # Team management
│   │   ├── MeetingRoom.tsx   # 💬 Meeting room (negotiation)
│   │   └── TaskCenter.tsx    # Task center
│   └── store.ts            # Zustand state management
├── server.ts                # Express backend (OpenClaw integration)
└── package.json
```

---

## 🔧 Configuration

### Environment Variables

```env
PORT=5301

# SiliconFlow LLM API (Required)
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_MODEL=Qwen2.5-7B-Instruct
OPENAI_API_KEY=your_siliconflow_key

# OpenClaw (Optional — for meeting room AI role speaking)
OPENCLAW_URL=http://127.0.0.1:18789
OPENCLAW_TOKEN=your_openclaw_token
```

### Port Reference

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5300 | Vite dev server |
| Backend | 5301 | Express API service |

---

## 📖 Usage Guide

| Step | Action | Description |
|:---:|--------|-------------|
| 1️⃣ | Company Map | Top menu 「🏢 Company Map」 → Select floor (single/flat view) |
| 2️⃣ | Team Topology | 「👥 Topology」 → Drag to connect employees and establish relationships |
| 3️⃣ | Create Company | 「Team Management」 → Choose industry template → Add members → Build topology |
| 4️⃣ | Meeting Room | 「💬 Meeting」 → Select team → Start negotiation → Arbitrate and ask questions |
| 5️⃣ | Submit Task | 「⚡ Command Center」 → Input task → AI auto-distributes |

---

## 🔮 Roadmap

### v2.1 - Intelligent Evolution
- [ ] AI employee self-learning optimization
- [ ] Intelligent analysis of task execution history
- [ ] Auto-suggest optimal workflows

### v2.2 - Ecosystem Expansion
- [ ] Support more AI platform integrations
- [ ] Plugin marketplace — share workflow templates
- [ ] API — third-party integrations

### v3.0 - Digital Labor Market
- [ ] Digital employee marketplace
- [ ] Team collaboration features
- [ ] Enterprise deployment support

---

## 🤝 Partnership

SoloForce is seeking like-minded partners:

| Direction | Description |
|-----------|-------------|
| 🌐 **Tech Partners** | AI Agent platforms, cloud services |
| 📢 **Promotion Channels** | Tech bloggers, community influencers |
| 💡 **Product Advisors** | Product design, UX |
| 💰 **Investment** | Angel/seed funding |

### 📞 Contact

- 📧 Email: 1781824487@qq.com
- 💬 GitHub Issues: Ask questions and make suggestions anytime

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>SoloForce - One Person, One Company</strong>
</p>

<p align="center">
  ⭐ If you find this project helpful, please star to show your support!
</p>
