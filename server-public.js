const localtunnel = require('localtunnel');
const { spawn } = require('child_process');

// 使用随机端口避免冲突
const PORT = 3000 + Math.floor(Math.random() * 1000);

async function start() {
  console.log('正在启动你画我猜服务器...\n');

  // 设置环境变量端口
  process.env.PORT = PORT;

  // 启动本地服务器
  const server = spawn('node', ['server.js'], {
    stdio: 'pipe',
    env: process.env
  });

  server.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });

  server.stderr.on('data', (data) => {
    console.error(data.toString().trim());
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    console.log('\n正在创建公网隧道...');

    // 启动 localtunnel 隧道
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: 'drawgame-' + Math.random().toString(36).substring(2, 6)
    });

    const publicUrl = tunnel.url;

    console.log('\n========================================');
    console.log('🎉 公网访问地址已生成！');
    console.log('========================================');
    console.log(`\n🔗 公网网址: ${publicUrl}`);
    console.log(`\n📱 分享给朋友: ${publicUrl}`);
    console.log('\n⚠️  注意: 免费版网址是临时的，重启会更换');
    console.log('========================================\n');

    // 将公网地址写入文件供前端使用
    require('fs').writeFileSync(
      './public/ngrok-url.json',
      JSON.stringify({ url: publicUrl })
    );

    // 监听隧道关闭
    tunnel.on('close', () => {
      console.log('隧道已关闭');
      process.exit(0);
    });

    tunnel.on('error', (err) => {
      console.error('隧道错误:', err.message);
    });

    // 按 Ctrl+C 退出
    process.on('SIGINT', () => {
      console.log('\n正在关闭服务器...');
      tunnel.close();
      server.kill();
      process.exit(0);
    });

  } catch (err) {
    console.error('\n启动失败:', err.message);
    console.log('\n可能原因:');
    console.log('1. 网络连接问题');
    console.log('2. 防火墙阻止');
    console.log('\n解决方法:');
    console.log('1. 检查网络连接');
    console.log('2. 临时关闭防火墙');
    console.log('3. 使用局域网模式: npm start');
    server.kill();
    process.exit(1);
  }
}

start();
