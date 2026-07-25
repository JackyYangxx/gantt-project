# Gantt Project

协同甘特图项目管理工具，适用于小团队。本地运行，支持局域网内多人实时协作。

## 快速开始

```bash
npm run setup
npm run dev
```

服务端运行在 http://localhost:3001，客户端开发服务器在 http://localhost:5173。  
团队成员可通过 `http://<你的IP>:3001` 访问。

## 技术栈

- **前端** — React + Vite
- **后端** — Fastify
- **数据库** — SQLite + better-sqlite3（WAL 模式）
- **甘特图** — Frappe Gantt
- **实时协作** — Yjs + y-websocket（CRDT 协议）
- **桌面端** — Electron + electron-builder（Windows x64）

## 功能

### 项目管理
- 用户注册和登录
- 多项目管理，支持创建、重命名、删除
- 项目权限控制 — 只有被授权的用户才能查看和编辑项目

### 任务管理
- 任务 CRUD，支持层级结构（父子任务）
- 任务进度百分比滑块 + 进展详情备注
- 任务依赖关系
- Excel 导入导出（.xlsx）
- 提供导入模板下载

### 甘特图
- 拖拽调整任务日期
- 日/周/月视图切换
- 任务依赖连线可视化

### 实时协作
- CRDT 驱动的多人实时同步
- 在线用户感知（显示谁在线）
- WebSocket 数据持久化到 SQLite

### 管理后台
- 管理员账号管理（路径：`/a7x9k2m`）
- 创建账号时可分配项目权限
- 修改用户密码

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发模式（服务端 + 客户端） |
| `npm run dev:electron` | 启动 Electron 桌面开发模式 |
| `npm run build:client` | 构建客户端生产版本 |
| `npm run build:electron` | 构建 Electron 桌面应用 |
| `npm run test:e2e` | 运行 E2E 测试（Playwright） |
| `npm run reset-db` | 重置数据库 |

## 数据导入格式

点击甘特图顶栏的 **导入模板** 可下载示例 Excel 文件。

| name | start | end | progress | progress_notes |
|------|-------|-----|----------|----------------|
| 示例任务 | 2024-01-01 | 2024-01-15 | 50 | 进行中，进展顺利 |

## 许可

MIT
