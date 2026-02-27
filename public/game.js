// 游戏状态
let ws = null;
let playerId = null;
let roomId = null;
let isDrawer = false;
let currentWord = null;

// DOM 元素
const loginScreen = document.getElementById('loginScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const roundEndModal = document.getElementById('roundEndModal');
const gameEndModal = document.getElementById('gameEndModal');

const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const startBtn = document.getElementById('startBtn');
const playersList = document.getElementById('playersList');
const gamePlayersList = document.getElementById('gamePlayersList');

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const canvasTools = document.getElementById('canvasTools');
const waitingOverlay = document.getElementById('waitingOverlay');
const clearBtn = document.getElementById('clearBtn');

const currentRoundEl = document.getElementById('currentRound');
const timeLeftEl = document.getElementById('timeLeft');
const wordDisplay = document.getElementById('wordDisplay');
const wordHint = document.getElementById('wordHint');
const drawerName = document.getElementById('drawerName');
const drawerInfo = document.getElementById('drawerInfo');

const guessInput = document.getElementById('guessInput');
const sendGuessBtn = document.getElementById('sendGuessBtn');
const chatMessages = document.getElementById('chatMessages');

const correctWord = document.getElementById('correctWord');
const roundScores = document.getElementById('roundScores');
const finalScores = document.getElementById('finalScores');
const playAgainBtn = document.getElementById('playAgainBtn');

// 绘画状态
let isDrawing = false;
let currentColor = '#000000';
let currentSize = 3;
let lastX = 0;
let lastY = 0;

// 连接 WebSocket
async function connect() {
  let wsUrl;

  // 尝试获取 ngrok 公网地址
  try {
    const response = await fetch('/ngrok-url.json');
    const data = await response.json();
    // ngrok 使用 wss (WebSocket Secure)
    wsUrl = data.url.replace('https://', 'wss://');
    console.log('使用公网地址:', wsUrl);
  } catch (e) {
    // 使用本地地址
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}`;
    console.log('使用本地地址:', wsUrl);
  }

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Connected to server');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleMessage(data);
  };

  ws.onclose = () => {
    console.log('Disconnected from server');
    alert('与服务器断开连接，请刷新页面重试');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// 处理消息
function handleMessage(data) {
  switch (data.type) {
    case 'joined':
      playerId = data.playerId;
      roomId = data.roomId;
      updatePlayersList(data.players);
      if (data.gameState === 'playing') {
        showGameScreen();
      } else {
        showLobbyScreen();
      }
      break;

    case 'playerJoined':
      addPlayerToList(data.player);
      addSystemMessage(`${data.player.name} 加入了房间`);
      break;

    case 'playerLeft':
      removePlayerFromList(data.playerId);
      addSystemMessage('有玩家离开了房间');
      break;

    case 'gameStarted':
      showGameScreen();
      clearCanvas();
      addSystemMessage('游戏开始！');
      break;

    case 'newRound':
      handleNewRound(data);
      break;

    case 'yourTurn':
      handleYourTurn(data.word);
      break;

    case 'guessWord':
      handleGuessWord(data);
      break;

    case 'timeUpdate':
      timeLeftEl.textContent = data.timeLeft;
      break;

    case 'draw':
      handleDraw(data);
      break;

    case 'drawHistory':
      data.history.forEach(draw => handleDraw(draw));
      break;

    case 'clearCanvas':
      clearCanvas();
      break;

    case 'guess':
      addGuessMessage(data.playerName, data.guess);
      break;

    case 'correctGuess':
      handleCorrectGuess(data);
      break;

    case 'roundEnded':
      handleRoundEnded(data);
      break;

    case 'gameEnded':
      handleGameEnded(data);
      break;

    case 'chat':
      addChatMessage(data.playerName, data.message);
      break;
  }
}

// 发送消息
function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// 加入游戏
async function joinGame() {
  const name = playerNameInput.value.trim();
  if (!name) {
    alert('请输入你的名字');
    return;
  }

  await connect();

  // 等待连接建立后发送加入消息
  setTimeout(() => {
    send({
      type: 'join',
      name: name,
      roomId: roomIdInput.value.trim()
    });
  }, 500);
}

// 显示大厅
function showLobbyScreen() {
  loginScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
}

// 显示游戏界面
function showGameScreen() {
  loginScreen.classList.add('hidden');
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

// 更新玩家列表
function updatePlayersList(players) {
  playersList.innerHTML = '';
  gamePlayersList.innerHTML = '';

  players.forEach(player => {
    addPlayerToList(player);
  });
}

// 添加玩家到列表
function addPlayerToList(player) {
  // 大厅列表
  const lobbyItem = document.createElement('li');
  lobbyItem.textContent = player.name;
  lobbyItem.dataset.id = player.id;
  if (player.id === playerId) {
    lobbyItem.classList.add('you');
    lobbyItem.textContent += ' (你)';
  }

  // 检查是否已存在
  const existingLobby = playersList.querySelector(`[data-id="${player.id}"]`);
  if (!existingLobby) {
    playersList.appendChild(lobbyItem);
  }

  // 游戏列表
  const gameItem = document.createElement('li');
  gameItem.dataset.id = player.id;
  gameItem.innerHTML = `
    <span>${player.name} ${player.id === playerId ? '(你)' : ''}</span>
    <span class="score">${player.score || 0}</span>
  `;

  const existingGame = gamePlayersList.querySelector(`[data-id="${player.id}"]`);
  if (!existingGame) {
    gamePlayersList.appendChild(gameItem);
  }
}

// 从列表移除玩家
function removePlayerFromList(playerId) {
  const lobbyItem = playersList.querySelector(`[data-id="${playerId}"]`);
  const gameItem = gamePlayersList.querySelector(`[data-id="${playerId}"]`);
  if (lobbyItem) lobbyItem.remove();
  if (gameItem) gameItem.remove();
}

// 更新分数
function updateScores(scores) {
  scores.forEach(player => {
    const item = gamePlayersList.querySelector(`[data-id="${player.id}"]`);
    if (item) {
      item.querySelector('.score').textContent = player.score;
    }
  });
}

// 处理新回合
function handleNewRound(data) {
  currentRoundEl.textContent = data.round;
  timeLeftEl.textContent = data.timeLeft;
  drawerName.textContent = data.drawer.name;

  // 标记当前画家
  document.querySelectorAll('#gamePlayersList li').forEach(li => {
    li.classList.remove('current-drawer');
  });
  const drawerItem = gamePlayersList.querySelector(`[data-id="${data.drawer.id}"]`);
  if (drawerItem) {
    drawerItem.classList.add('current-drawer');
  }

  // 清空聊天
  chatMessages.innerHTML = '';
  addSystemMessage(`第 ${data.round} 轮开始！画家是 ${data.drawer.name}`);

  // 隐藏弹窗
  roundEndModal.classList.add('hidden');

  clearCanvas();
}

// 处理成为画家
function handleYourTurn(word) {
  isDrawer = true;
  currentWord = word;
  wordHint.textContent = word;
  waitingOverlay.classList.add('hidden');
  canvasTools.style.display = 'flex';
  guessInput.placeholder = '你是画家，不能猜测';
  guessInput.disabled = true;
  sendGuessBtn.disabled = true;

  addSystemMessage(`轮到你画画了！你要画的词是：${word}`);
}

// 处理猜测词
function handleGuessWord(data) {
  isDrawer = false;
  wordHint.textContent = data.hint;
  waitingOverlay.classList.remove('hidden');
  canvasTools.style.display = 'none';
  guessInput.placeholder = '输入猜测...';
  guessInput.disabled = false;
  sendGuessBtn.disabled = false;

  // 显示词长度提示
  const placeholder = [];
  for (let i = 0; i < data.wordLength; i++) {
    placeholder.push('__');
  }
  wordHint.textContent = placeholder.join(' ');
}

// 处理绘画数据
function handleDraw(data) {
  ctx.beginPath();
  ctx.moveTo(data.prevX, data.prevY);
  ctx.lineTo(data.x, data.y);
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// 处理正确答案
function handleCorrectGuess(data) {
  updateScores(data.scores);
  addCorrectMessage(data.playerName, data.points);
}

// 处理回合结束
function handleRoundEnded(data) {
  correctWord.textContent = data.word;

  roundScores.innerHTML = '';
  data.scores.sort((a, b) => b.score - a.score).forEach((player, index) => {
    const item = document.createElement('div');
    item.className = `score-item rank-${index + 1}`;
    item.innerHTML = `
      <span>${index + 1}. ${player.name}</span>
      <span>${player.score} 分</span>
    `;
    roundScores.appendChild(item);
  });

  roundEndModal.classList.remove('hidden');

  // 3秒后自动隐藏
  setTimeout(() => {
    roundEndModal.classList.add('hidden');
  }, 3000);
}

// 处理游戏结束
function handleGameEnded(data) {
  finalScores.innerHTML = '';
  data.finalScores.sort((a, b) => b.score - a.score).forEach((player, index) => {
    const item = document.createElement('div');
    item.className = `score-item rank-${index + 1}`;
    item.innerHTML = `
      <span>${index + 1}. ${player.name}</span>
      <span>${player.score} 分</span>
    `;
    finalScores.appendChild(item);
  });

  gameEndModal.classList.remove('hidden');
  roundEndModal.classList.add('hidden');
}

// 添加系统消息
function addSystemMessage(message) {
  const div = document.createElement('div');
  div.className = 'chat-message system';
  div.textContent = message;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加猜测消息
function addGuessMessage(playerName, guess) {
  const div = document.createElement('div');
  div.className = 'chat-message guess';
  div.innerHTML = `<span class="player-name">${playerName}</span>: ${guess}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加正确答案消息
function addCorrectMessage(playerName, points) {
  const div = document.createElement('div');
  div.className = 'chat-message correct';
  div.innerHTML = `🎉 <span class="player-name">${playerName}</span> 猜对了！+${points}分`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加聊天消息
function addChatMessage(playerName, message) {
  const div = document.createElement('div');
  div.className = 'chat-message';
  div.innerHTML = `<span class="player-name">${playerName}</span>: ${message}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 绘画功能
function getCanvasCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  if (e.touches) {
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY
    };
  }

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function startDrawing(e) {
  if (!isDrawer) return;

  isDrawing = true;
  const coords = getCanvasCoordinates(e);
  lastX = coords.x;
  lastY = coords.y;
}

function draw(e) {
  if (!isDrawing || !isDrawer) return;

  e.preventDefault();
  const coords = getCanvasCoordinates(e);

  // 本地绘制
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(coords.x, coords.y);
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = currentSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 发送给服务器
  send({
    type: 'draw',
    x: coords.x,
    y: coords.y,
    prevX: lastX,
    prevY: lastY,
    color: currentColor,
    size: currentSize
  });

  lastX = coords.x;
  lastY = coords.y;
}

function stopDrawing() {
  isDrawing = false;
}

function clearCanvas() {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 事件监听
joinBtn.addEventListener('click', joinGame);

leaveBtn.addEventListener('click', () => {
  if (ws) {
    ws.close();
  }
  location.reload();
});

startBtn.addEventListener('click', () => {
  send({ type: 'startGame' });
});

// 画布事件
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

// 颜色选择
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentColor = btn.dataset.color;
  });
});

// 粗细选择
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSize = parseInt(btn.dataset.size);
  });
});

// 清空画布
clearBtn.addEventListener('click', () => {
  send({ type: 'clearCanvas' });
});

// 发送猜测
function sendGuess() {
  const guess = guessInput.value.trim();
  if (!guess || guessInput.disabled) return;

  send({
    type: 'guess',
    guess: guess
  });

  guessInput.value = '';
}

sendGuessBtn.addEventListener('click', sendGuess);
guessInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendGuess();
  }
});

// 再玩一局
playAgainBtn.addEventListener('click', () => {
  gameEndModal.classList.add('hidden');
  send({ type: 'startGame' });
});

// 回车加入
playerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinGame();
  }
});

// 初始化画布
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);
