# Beyblade X 比赛管理系统

Beyblade X 战斗陀螺比赛管理系统，支持单败淘汰、双败淘汰、循环赛、瑞士轮等多种赛制。暗黑科技风，红金配色。

## 功能特性

- 多种赛制支持：单败淘汰、双败淘汰、循环赛、瑞士轮、瑞士轮+淘汰、循环+淘汰
- 选手报名与管理（支持二维码扫码报名）
- 赛程自动生成与手动调整
- 实时比分录入与对阵图更新
- 排行榜自动计算
- 管理后台密钥保护
- 万能管理员密码（可进入/删除任意比赛）

## 技术栈

- 前端：React 19 + TypeScript + Tailwind CSS + shadcn/ui
- 后端：NestJS 10 + Drizzle ORM
- 数据库：PostgreSQL
- 二维码：qrcode.react

## 快速部署到 Railway

> **注意**：部署包中的 `container.txt` 即 `Dockerfile`，`container-ignore.txt` 即 `.dockerignore`，解压后请重命名。

### 前置条件

1. 一个 [Railway](https://railway.app/) 账号
2. 本项目的源代码

### 部署步骤

#### 方式一：一键部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 在 Railway Dashboard 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测到 Dockerfile 并使用它构建

#### 方式二：使用 Railway CLI

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 添加 PostgreSQL 插件
railway add --plugin postgresql

# 设置环境变量
railway variables set NODE_ENV=production
railway variables set MASTER_ADMIN_KEY=xgy667196

# 部署
railway up
```

### 环境变量说明

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `PORT` | ❌ | `3000` | 服务监听端口（Railway 自动注入） |
| `NODE_ENV` | ❌ | `production` | 运行环境 |
| `MASTER_ADMIN_KEY` | ❌ | `xgy667196` | 万能管理员密码 |
| `SERVER_HOST` | ❌ | `0.0.0.0` | 服务绑定地址 |

### 数据库初始化

首次部署后，需要执行数据库 schema 初始化：

```bash
# 在 Railway 控制台进入服务的 Shell，执行：
psql $DATABASE_URL -f /app/schema.sql

# 或者在本地连接远程数据库执行：
psql "postgresql://..." -f deploy/schema.sql
```

> schema.sql 文件位于项目 `deploy/` 目录下。

### 验证部署

部署成功后，访问 Railway 分配的域名：

- `/` - 选手端首页（比赛列表）
- `/admin` - 管理端入口
- `/tournament/:id` - 比赛详情页

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（前后端同时启动）
npm run dev

# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:client
```

## 生产构建

```bash
# 完整构建
npm run build:prod

# 或分步构建
npm run build:server
npm run build:client

# 启动
node dist/server/main.js
```

## 项目结构

```
├── client/              # React 前端
│   └── src/
│       ├── pages/       # 页面组件
│       ├── components/  # 可复用组件
│       ├── api/         # API 请求封装
│       └── utils/       # 工具函数
├── server/              # NestJS 后端
│   └── modules/
│       ├── tournaments/ # 比赛模块（核心业务）
│       └── view/        # 视图渲染模块
├── shared/              # 前后端共享类型
├── deploy/              # 部署相关文件（本目录）
└── package.json         # 项目配置
```

## 万能管理员密码

系统内置万能管理员密码（默认 `xgy667196`），可用于：

- 进入任意比赛的管理后台（即使不知道比赛自己的密钥）
- 删除任意比赛
- 所有需要管理密钥验证的地方

修改方式：设置环境变量 `MASTER_ADMIN_KEY` 为你想要的值。

## License

MIT
