const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 词库
const WORD_LIST = [
  '苹果', '香蕉', '橙子', '西瓜', '草莓',
  '猫', '狗', '大象', '狮子', '老虎',
  '汽车', '自行车', '飞机', '轮船', '火车',
  '太阳', '月亮', '星星', '云朵', '彩虹',
  '房子', '学校', '医院', '图书馆', '公园',
  '老师', '医生', '警察', '厨师', '画家',
  '篮球', '足球', '乒乓球', '羽毛球', '游泳',
  '春天', '夏天', '秋天', '冬天', '下雪',
  '蛋糕', '冰淇淋', '巧克力', '披萨', '汉堡',
  '吉他', '钢琴', '小提琴', '鼓', '笛子',
  '手机', '电脑', '电视', '相机', '机器人',
  '恐龙', '外星人', '超人', '公主', '海盗'
];

// MIME 类型
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// 游戏状态
const rooms = new Map();
const players = new Map();

class Room {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.currentDrawer = null;
    this.currentWord = null;
    this.round = 0;
    this.maxRounds = 3;
    this.timeLeft = 60;
    this.gameState = 'waiting'; // waiting, playing, ended
    this.timer = null;
    this.drawHistory = [];
    this.correctGuessers = new Set();
  }

  addPlayer(player) {
    this.players.push(player);
    player.room = this;
    this.broadcast({
      type: 'playerJoined',
      player: { id: player.id, name: player.name, score: player.score }
    });
  }

  removePlayer(player) {
    const index = this.players.findIndex(p => p.id === player.id);
    if (index > -1) {
      this.players.splice(index, 1);
      player.room = null;
    }

    if (this.players.length === 0) {
      this.endGame();
      rooms.delete(this.id);
    } else {
      this.broadcast({
        type: 'playerLeft',
        playerId: player.id
      });

      // 如果离开的是当前画家，切换到下一个
      if (this.currentDrawer && this.currentDrawer.id === player.id) {
        this.nextTurn();
      }
    }
  }

  startGame() {
    if (this.players.length < 2) return;

    this.gameState = 'playing';
    this.round = 1;
    this.scores = {};
    this.players.forEach(p => p.score = 0);

    this.broadcast({
      type: 'gameStarted',
      maxRounds: this.maxRounds
    });

    this.startRound();
  }

  startRound() {
    this.correctGuessers.clear();
    this.drawHistory = [];
    this.timeLeft = 60;

    // 选择当前画家（轮询）
    const drawerIndex = (this.round - 1) % this.players.length;
    this.currentDrawer = this.players[drawerIndex];

    // 随机选择词语
    this.currentWord = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];

    this.broadcast({
      type: 'newRound',
      round: this.round,
      drawer: { id: this.currentDrawer.id, name: this.currentDrawer.name },
      timeLeft: this.timeLeft
    });

    // 告诉画家词语
    this.currentDrawer.ws.send(JSON.stringify({
      type: 'yourTurn',
      word: this.currentWord
    }));

    // 告诉其他玩家词语长度
    this.players.forEach(p => {
      if (p.id !== this.currentDrawer.id) {
        p.ws.send(JSON.stringify({
          type: 'guessWord',
          wordLength: this.currentWord.length,
          hint: this.currentWord.charAt(0) + '...'
        }));
      }
    });

    this.startTimer();
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.timeLeft--;

      this.broadcast({
        type: 'timeUpdate',
        timeLeft: this.timeLeft
      });

      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);
  }

  endRound() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.broadcast({
      type: 'roundEnded',
      word: this.currentWord,
      scores: this.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    });

    this.round++;

    if (this.round > this.maxRounds * this.players.length) {
      setTimeout(() => this.endGame(), 3000);
    } else {
      setTimeout(() => this.startRound(), 3000);
    }
  }

  endGame() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.gameState = 'waiting';
    this.currentDrawer = null;
    this.currentWord = null;

    this.broadcast({
      type: 'gameEnded',
      finalScores: this.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    });
  }

  nextTurn() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.endRound();
  }

  handleGuess(player, message) {
    if (player.id === this.currentDrawer.id) return;
    if (this.correctGuessers.has(player.id)) return;

    const guess = message.guess.trim();

    // 广播猜测（但不显示正确答案）
    this.broadcast({
      type: 'guess',
      playerId: player.id,
      playerName: player.name,
      guess: guess,
      correct: false
    });

    // 检查答案
    if (guess.toLowerCase() === this.currentWord.toLowerCase()) {
      this.correctGuessers.add(player.id);

      // 计算得分（越快猜对得分越高）
      const basePoints = 100;
      const timeBonus = Math.floor(this.timeLeft / 2);
      const points = basePoints + timeBonus;

      player.score += points;
      this.currentDrawer.score += Math.floor(points / 2); // 画家也得分

      this.broadcast({
        type: 'correctGuess',
        playerId: player.id,
        playerName: player.name,
        points: points,
        scores: this.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      });

      // 如果所有人都猜对了，结束本轮
      if (this.correctGuessers.size >= this.players.length - 1) {
        setTimeout(() => this.endRound(), 2000);
      }
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(message);
      }
    });
  }
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const player = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: null,
    ws: ws,
    room: null,
    score: 0
  };

  players.set(player.id, player);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'join':
          player.name = message.name || `玩家${player.id.substr(0, 4)}`;
          const roomId = message.roomId || 'default';

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Room(roomId));
          }

          const room = rooms.get(roomId);
          room.addPlayer(player);

          // 发送当前房间状态
          ws.send(JSON.stringify({
            type: 'joined',
            playerId: player.id,
            roomId: roomId,
            players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
            gameState: room.gameState,
            currentDrawer: room.currentDrawer ? { id: room.currentDrawer.id, name: room.currentDrawer.name } : null
          }));

          // 如果游戏正在进行，发送绘画历史
          if (room.gameState === 'playing' && room.drawHistory.length > 0) {
            ws.send(JSON.stringify({
              type: 'drawHistory',
              history: room.drawHistory
            }));
          }
          break;

        case 'startGame':
          if (player.room && player.room.players[0].id === player.id) {
            player.room.startGame();
          }
          break;

        case 'draw':
          if (player.room && player.room.currentDrawer && player.room.currentDrawer.id === player.id) {
            player.room.drawHistory.push(message);
            player.room.broadcast({
              type: 'draw',
              x: message.x,
              y: message.y,
              prevX: message.prevX,
              prevY: message.prevY,
              color: message.color,
              size: message.size
            });
          }
          break;

        case 'clearCanvas':
          if (player.room && player.room.currentDrawer && player.room.currentDrawer.id === player.id) {
            player.room.drawHistory = [];
            player.room.broadcast({ type: 'clearCanvas' });
          }
          break;

        case 'guess':
          if (player.room && player.room.gameState === 'playing') {
            player.room.handleGuess(player, message);
          }
          break;

        case 'chat':
          if (player.room) {
            player.room.broadcast({
              type: 'chat',
              playerId: player.id,
              playerName: player.name,
              message: message.message
            });
          }
          break;
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    if (player.room) {
      player.room.removePlayer(player);
    }
    players.delete(player.id);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

const PORT = process.env.PORT || 3456;
const HOST = '0.0.0.0';

const listener = server.listen(PORT, HOST, () => {
  const actualPort = listener.address().port;
  console.log(`你画我猜服务器运行在 http://localhost:${actualPort}`);
  console.log(`局域网访问地址: http://${require('os').networkInterfaces()['WLAN']?.find(i => i.family === 'IPv4')?.address || '你的IP'}:${actualPort}`);
});
