# 🎨 你画我猜 - 多人在线绘图猜词游戏

支持本地局域网、公网访问、云平台部署。

---

## 🚀 快速开始（推荐：部署到 Render）

### 一键部署到 Render（免费、24小时在线）

**步骤 1：创建 GitHub 仓库**
1. 访问 https://github.com/new
2. 仓库名称：`draw-and-guess`
3. 点击 **Create repository**

**步骤 2：上传代码**
```bash
# 在本地项目文件夹中运行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/draw-and-guess.git
git push -u origin main
```

**步骤 3：部署到 Render**
1. 访问 https://dashboard.render.com
2. 用 GitHub 账号登录
3. 点击 **New +** → **Web Service**
4. 选择你的 `draw-and-guess` 仓库
5. 配置：
   - **Name**: `draw-and-guess`（或任意名称）
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
6. 点击 **Create Web Service**

**步骤 4：等待部署**
- 等待 2-3 分钟
- 部署完成后会显示网址：`https://draw-and-guess-xxxx.onrender.com`
- 把这个网址发给朋友即可联机！

---

## 📁 本地运行

### 方式一：局域网（同一 WiFi）
```bash
npm install
npm start
```
访问 `http://localhost:3456`

### 方式二：公网访问（需要内网穿透）
```bash
npm run public    # localtunnel
npm run cloudflare # Cloudflare Tunnel
```

---

## 🎮 游戏规则

1. 2 人以上即可开始
2. 轮流绘画，其他玩家猜词
3. 猜对得分，越快得分越高（100分 + 时间奖励）
4. 每轮 60 秒，共 3 轮
5. 最终得分最高者获胜

---

## 📂 项目结构

```
.
├── server.js              # 游戏服务器
├── render.yaml            # Render 部署配置
├── package.json
├── README.md
└── public/
    ├── index.html         # 游戏页面
    ├── style.css          # 样式
    └── game.js            # 游戏逻辑
```

---

## ❓ 常见问题

### Render 部署后 WebSocket 连不上？
确保 `game.js` 中使用的是相对路径连接 WebSocket，已配置好。

### Render 免费版会休眠？
是的，15分钟无访问会休眠，首次访问需要等待 30 秒唤醒。

### 如何自定义词库？
修改 `server.js` 中的 `WORD_LIST` 数组。

---

## 🛠️ 技术栈

- 后端：Node.js + WebSocket (ws)
- 前端：HTML5 Canvas + 原生 JavaScript
- 部署：Render / Cloudflare Tunnel / localtunnel

---

## 📄 License

MIT
