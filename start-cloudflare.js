const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const CLOUDFLARED_PATH = path.join(__dirname, 'cloudflared.exe');
const PORT = 3456;

// 下载 cloudflared
async function downloadCloudflared() {
  return new Promise((resolve, reject) => {
    console.log('正在下载 Cloudflared...');

    const file = fs.createWriteStream(CLOUDFLARED_PATH);
    https.get('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('下载完成！');
            resolve();
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('下载完成！');
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(CLOUDFLARED_PATH, () => {});
      reject(err);
    });
  });
}

// 检查并下载 cloudflared
async function setup() {
  if (!fs.existsSync(CLOUDFLARED_PATH)) {
    try {
      await downloadCloudflared();
    } catch (err) {
      console.error('下载失败，请手动下载：');
      console.log('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');
      console.log('下载后放到当前目录，重命名为 cloudflared.exe');
      process.exit(1);
    }
  }
}

// 启动游戏服务器
function startGameServer() {
  return new Promise((resolve) => {
    console.log('正在启动游戏服务器...\n');

    const server = spawn('node', ['server.js'], {
      stdio: 'pipe',
      env: { ...process.env, PORT }
    });

    let urlPrinted = false;

    server.stdout.on('data', (data) => {
      const str = data.toString();
      if (!urlPrinted) {
        console.log(str.trim());
      }
    });

    server.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });

    server.on('close', (code) => {
      console.log(`游戏服务器已关闭，退出码: ${code}`);
    });

    setTimeout(() => resolve(server), 3000);
  });
}

// 启动 Cloudflare Tunnel
function startTunnel() {
  return new Promise((resolve, reject) => {
    console.log('\n正在创建 Cloudflare 公网隧道...\n');

    const tunnel = spawn(CLOUDFLARED_PATH, [
      'tunnel',
      '--url',
      `http://localhost:${PORT}`,
      '--metrics',
      'localhost:45678'
    ], {
      stdio: 'pipe'
    });

    let publicUrl = null;

    tunnel.stdout.on('data', (data) => {
      const str = data.toString();

      // 提取公网 URL
      const match = str.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !publicUrl) {
        publicUrl = match[0];

        console.log('\n========================================');
        console.log('🎉 公网访问地址已生成！');
        console.log('========================================');
        console.log(`\n🔗 公网网址: ${publicUrl}`);
        console.log(`\n📱 分享给朋友: ${publicUrl}`);
        console.log('\n✅ 无需密码，直接访问！');
        console.log('========================================\n');

        // 保存地址
        fs.writeFileSync(
          './public/ngrok-url.json',
          JSON.stringify({ url: publicUrl })
        );

        resolve({ tunnel, publicUrl });
      }
    });

    tunnel.stderr.on('data', (data) => {
      const str = data.toString();
      // 忽略 metrics 错误
      if (!str.includes('metrics server')) {
        console.log(str.trim());
      }
    });

    tunnel.on('close', (code) => {
      if (!publicUrl) {
        reject(new Error('隧道启动失败'));
      }
    });

    // 超时处理
    setTimeout(() => {
      if (!publicUrl) {
        reject(new Error('隧道启动超时'));
      }
    }, 30000);
  });
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('🎨 你画我猜 - Cloudflare 公网版');
  console.log('========================================\n');

  try {
    // 检查并下载 cloudflared
    await setup();

    // 启动游戏服务器
    const server = await startGameServer();

    // 启动隧道
    const { tunnel, publicUrl } = await startTunnel();

    console.log('按 Ctrl+C 停止服务器\n');

    // 清理函数
    function cleanup() {
      console.log('\n正在关闭服务器...');
      tunnel.kill();
      server.kill();
      process.exit(0);
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

  } catch (err) {
    console.error('启动失败:', err.message);
    console.log('\n备选方案:');
    console.log('1. 使用局域网模式: npm start');
    console.log('2. 使用 localtunnel: npm run public');
    process.exit(1);
  }
}

main();
