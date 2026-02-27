const ngrok = require('@ngrok/ngrok');
const { spawn } = require('child_process');

async function start() {
  console.log('正在启动你画我猜服务器...');

  // 启动本地服务器
  const server = spawn('node', ['server.js'], {
    stdio: 'pipe'
  });

  server.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  server.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // 启动 ngrok 隧道
    const listener = await ngrok.forward({
      addr: 3000,
      authtoken_from_env: true,
    });

    const publicUrl = listener.url();

    console.log('\n========================================');
    console.log('🎉 公网访问地址已生成！');
    console.log('========================================');
    console.log(`\n🔗 公网网址: ${publicUrl}`);
    console.log(`\n📱 分享给朋友: ${publicUrl}`);
    console.log('\n⚠️  注意: 免费版每次重启会更换网址');
    console.log('========================================\n');

    // 将公网地址写入文件供前端使用
    require('fs').writeFileSync(
      './public/ngrok-url.json',
      JSON.stringify({ url: publicUrl })
    );

  } catch (err) {
    console.error('启动 ngrok 失败:', err.message);
    console.log('\n可能原因:');
    console.log('1. 首次使用需要设置 authtoken');
    console.log('2. 免费版有连接数限制');
    console.log('\n解决方法:');
    console.log('1. 访问 https://dashboard.ngrok.com/signup 注册账号');
    console.log('2. 获取 authtoken: https://dashboard.ngrok.com/get-started/your-authtoken');
    console.log('3. 运行: npx ngrok config add-authtoken YOUR_TOKEN');
    console.log('\n或者使用本地局域网模式: npm start');
    process.exit(1);
  }
}

start();
