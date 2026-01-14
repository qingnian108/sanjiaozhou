/**
 * KOOK 机器人服务
 * 功能：监听语音频道加入事件，检查用户是否已打卡，未打卡则踢出
 */

const WebSocket = require('ws');
const https = require('https');
const zlib = require('zlib');

// KOOK API 配置
const KOOK_TOKEN = process.env.KOOK_TOKEN || '1/NDM3NTI=/KYW536xGIG0A0zlwKOIMbw==';
const KOOK_API_BASE = 'https://www.kookapp.cn/api/v3';

// 数据库连接（复用主服务的连接）
let Data = null;
let mongoose = null;

// 初始化数据库模型
function initDB(mongooseInstance, DataModel) {
  mongoose = mongooseInstance;
  Data = DataModel;
  console.log('[KOOK Bot] 数据库模型已初始化');
}

// KOOK API 请求封装
function kookRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(KOOK_API_BASE + endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bot ${KOOK_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 获取 Gateway URL
async function getGateway() {
  const result = await kookRequest('GET', '/gateway/index?compress=0');
  if (result.code === 0) {
    return result.data.url;
  }
  throw new Error('获取 Gateway 失败: ' + JSON.stringify(result));
}

// 将用户移出语音频道（通过移动到空频道实现，或直接踢出服务器再邀请回来）
// KOOK 没有直接的"踢出语音频道"接口，改回踢出服务器
async function kickFromVoiceChannel(guildId, channelId, userId) {
  console.log(`[KOOK Bot] 将用户 ${userId} 移出语音频道 ${channelId}`);
  try {
    // KOOK 没有单独踢出语音频道的接口，只能踢出服务器
    // 使用 /guild/kickout 踢出服务器
    const result = await kookRequest('POST', '/guild/kickout', {
      guild_id: guildId,
      target_id: userId
    });
    console.log('[KOOK Bot] 踢出结果:', result);
    return result.code === 0;
  } catch (err) {
    console.error('[KOOK Bot] 踢出失败:', err);
    return false;
  }
}

// 发送私信
async function sendPrivateMessage(userId, content) {
  try {
    // 先创建私聊会话
    const chatResult = await kookRequest('POST', '/user-chat/create', {
      target_id: userId
    });
    
    if (chatResult.code !== 0) {
      console.error('[KOOK Bot] 创建私聊失败:', chatResult);
      return false;
    }
    
    const chatCode = chatResult.data.code;
    
    // 发送消息
    const msgResult = await kookRequest('POST', '/user-chat/create-msg', {
      target_id: chatCode,
      content: content
    });
    
    return msgResult.code === 0;
  } catch (err) {
    console.error('[KOOK Bot] 发送私信失败:', err);
    return false;
  }
}

// 检查用户是否已打卡
async function checkUserClocked(kookUserId) {
  if (!Data) {
    console.error('[KOOK Bot] 数据库未初始化');
    return { clocked: false, staffInfo: null };
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. 通过 kookUserId 查找绑定的员工
    const kookChannel = await Data.findOne({
      collection: 'kookChannels',
      'data.kookUserId': kookUserId
    });
    
    if (!kookChannel) {
      console.log(`[KOOK Bot] 用户 ${kookUserId} 未绑定系统账号`);
      return { clocked: false, staffInfo: null, reason: 'not_bindded' };
    }
    
    const staffId = kookChannel.data.userId;
    const tenantId = kookChannel.tenantId;
    
    // 2. 查找今日打卡记录
    const clockRecords = await Data.find({
      collection: 'clockRecords',
      tenantId: tenantId,
      'data.staffId': staffId,
      'data.date': today
    }).sort({ 'data.timestamp': -1 });
    
    if (clockRecords.length === 0) {
      return { clocked: false, staffInfo: kookChannel.data, reason: 'no_clock' };
    }
    
    // 检查最后一条记录是否是上班打卡
    const lastRecord = clockRecords[0];
    const isWorking = lastRecord.data.type === 'in';
    
    return { 
      clocked: isWorking, 
      staffInfo: kookChannel.data,
      reason: isWorking ? null : 'clocked_out'
    };
  } catch (err) {
    console.error('[KOOK Bot] 检查打卡状态失败:', err);
    return { clocked: false, staffInfo: null, reason: 'error' };
  }
}

// 处理用户加入语音频道事件
async function handleVoiceJoin(event) {
  const userId = event.user_id || event.author_id;
  const guildId = event.guild_id;
  const channelId = event.channel_id;
  
  console.log(`[KOOK Bot] 用户 ${userId} 加入语音频道 ${channelId}`);
  
  // 检查打卡状态
  const { clocked, reason } = await checkUserClocked(userId);
  
  if (!clocked) {
    console.log(`[KOOK Bot] 用户 ${userId} 未打卡，准备移出语音频道`);
    
    // 踢出服务器（KOOK 没有单独踢出语音频道的接口）
    await kickFromVoiceChannel(guildId, channelId, userId);
    
    // 发送私信提醒
    let message = '⚠️ 您已被移出语音频道\n\n';
    if (reason === 'not_bindded') {
      message += '原因：您的 KOOK 账号未绑定系统账号\n请向管理员获取绑定码，在频道发送「绑定 绑定码」完成绑定';
    } else if (reason === 'no_clock') {
      message += '原因：您今天还未打卡上班\n请先在系统中打卡上班后再进入频道';
    } else if (reason === 'clocked_out') {
      message += '原因：您已打卡下班\n如需继续工作，请先打卡上班';
    } else {
      message += '原因：系统检查失败，请联系管理员';
    }
    
    await sendPrivateMessage(userId, message);
  } else {
    console.log(`[KOOK Bot] 用户 ${userId} 已打卡，允许进入`);
  }
}

// WebSocket 连接
let ws = null;
let heartbeatInterval = null;
let lastSn = 0;

function startBot() {
  console.log('[KOOK Bot] 启动机器人...');
  
  getGateway().then(gatewayUrl => {
    console.log('[KOOK Bot] Gateway URL:', gatewayUrl);
    
    ws = new WebSocket(gatewayUrl);
    
    ws.on('open', () => {
      console.log('[KOOK Bot] WebSocket 连接成功');
    });
    
    ws.on('message', (data) => {
      try {
        // 解析消息
        let message;
        if (Buffer.isBuffer(data)) {
          // 尝试解压
          try {
            const decompressed = zlib.inflateSync(data);
            message = JSON.parse(decompressed.toString());
          } catch (e) {
            message = JSON.parse(data.toString());
          }
        } else {
          message = JSON.parse(data);
        }
        
        // 更新序列号
        if (message.sn) {
          lastSn = message.sn;
        }
        
        // 处理不同类型的消息
        switch (message.s) {
          case 0: // EVENT
            handleEvent(message.d);
            break;
          case 1: // HELLO
            console.log('[KOOK Bot] 收到 HELLO，开始心跳');
            startHeartbeat();
            break;
          case 3: // PONG
            // 心跳响应，忽略
            break;
          case 5: // RECONNECT
            console.log('[KOOK Bot] 收到重连请求');
            reconnect();
            break;
          case 6: // RESUME ACK
            console.log('[KOOK Bot] 恢复连接成功');
            break;
        }
      } catch (err) {
        console.error('[KOOK Bot] 解析消息失败:', err);
      }
    });
    
    ws.on('close', () => {
      console.log('[KOOK Bot] WebSocket 连接关闭，5秒后重连');
      stopHeartbeat();
      setTimeout(startBot, 5000);
    });
    
    ws.on('error', (err) => {
      console.error('[KOOK Bot] WebSocket 错误:', err);
    });
  }).catch(err => {
    console.error('[KOOK Bot] 获取 Gateway 失败:', err);
    setTimeout(startBot, 10000);
  });
}

function handleEvent(event) {
  // 打印所有收到的事件（调试用）
  console.log('[KOOK Bot] 收到事件 type:', event.type, 'channel_type:', event.channel_type);
  
  // 语音频道相关事件
  // type: 255 是系统消息
  // channel_type: 'GROUP' 是频道消息
  
  if (event.type === 255 && event.extra) {
    const eventType = event.extra.type;
    console.log('[KOOK Bot] 系统事件类型:', eventType);
    console.log('[KOOK Bot] extra 数据:', JSON.stringify(event.extra));
    
    // joined_channel: 用户加入语音频道
    if (eventType === 'joined_channel') {
      // KOOK 的 joined_channel 事件，用户ID在 extra.body.user_id
      const userId = event.extra.body?.user_id || event.extra.user_id;
      const guildId = event.extra.body?.guild_id || event.extra.guild_id || event.target_id;
      const channelId = event.extra.body?.channel_id || event.extra.channel_id;
      
      console.log('[KOOK Bot] 解析到用户ID:', userId, '服务器ID:', guildId, '频道ID:', channelId);
      
      if (userId) {
        handleVoiceJoin({
          user_id: userId,
          guild_id: guildId,
          channel_id: channelId
        });
      }
    }
  }
  
  // 文字消息处理（type: 1 是文字消息, type: 9 是 KMarkdown）
  if ((event.type === 1 || event.type === 9) && event.content) {
    console.log('[KOOK Bot] 收到文字消息:', event.content, '来自用户:', event.author_id);
    handleTextMessage(event);
  }
}

// 处理文字消息（绑定指令）
async function handleTextMessage(event) {
  const content = event.content.trim().toUpperCase(); // 转大写方便匹配绑定码
  const userId = event.author_id;
  const username = event.extra?.author?.username || '未知用户';
  
  // 提取绑定码（6位字母数字）
  let bindCode = null;
  
  // 格式1: 绑定 XXXXXX 或 绑定XXXXXX
  if (content.startsWith('绑定')) {
    bindCode = content.replace(/^绑定\s*/, '').trim();
  }
  // 格式2: 直接发送6位绑定码
  else if (/^[A-Z0-9]{6}$/.test(content)) {
    bindCode = content;
  }
  
  // 如果识别到绑定码，进行绑定
  if (bindCode) {
    // 验证绑定码格式
    if (!/^[A-Z0-9]{6}$/.test(bindCode)) {
      await sendChannelMessage(event.target_id, `(met)${userId}(met) 绑定码格式不正确，请输入6位绑定码\n例如：\`绑定 ABC123\``);
      return;
    }
    
    console.log(`[KOOK Bot] 用户 ${username}(${userId}) 请求绑定，绑定码: ${bindCode}`);
    
    // 调用绑定函数
    const result = await bindByCode(bindCode, userId, username);
    
    if (result.success) {
      await sendChannelMessage(event.target_id, `(met)${userId}(met) ✅ 绑定成功！\n您的 KOOK 账号已绑定\n现在打卡上班后即可进入语音频道`);
    } else {
      await sendChannelMessage(event.target_id, `(met)${userId}(met) ❌ 绑定失败\n${result.message}`);
    }
    return;
  }
  
  // 查询绑定状态
  if (content === '查询' || content === '状态') {
    const status = await checkUserClocked(userId);
    
    if (status.reason === 'not_bindded') {
      await sendChannelMessage(event.target_id, `(met)${userId}(met) 您的 KOOK 账号尚未绑定\n请向管理员获取绑定码，然后发送 \`绑定 绑定码\``);
    } else if (status.clocked) {
      await sendChannelMessage(event.target_id, `(met)${userId}(met) ✅ 您已打卡上班，可以进入语音频道`);
    } else {
      await sendChannelMessage(event.target_id, `(met)${userId}(met) ⚠️ 您尚未打卡上班\n请先在员工系统中打卡后再进入语音频道`);
    }
  }
}

// 通过绑定码绑定 KOOK 用户
async function bindByCode(bindCode, kookUserId, kookUsername) {
  if (!Data) return { success: false, message: '系统错误' };
  
  try {
    // 通过绑定码查找 kookChannel
    const channel = await Data.findOne({
      collection: 'kookChannels',
      'data.bindCode': bindCode
    });
    
    if (!channel) {
      return { success: false, message: '绑定码无效或已过期\n请联系管理员获取新的绑定码' };
    }
    
    // 检查是否已被其他用户绑定
    if (channel.data.kookUserId && channel.data.kookUserId !== kookUserId) {
      return { success: false, message: '该绑定码已被其他用户使用' };
    }
    
    // 使用 updateOne 更新绑定信息（确保数据被保存）
    const result = await Data.updateOne(
      { _id: channel._id },
      { 
        $set: { 
          'data.kookUserId': kookUserId,
          'data.kookUsername': kookUsername
        }
      }
    );
    
    console.log(`[KOOK Bot] 更新结果:`, result);
    console.log(`[KOOK Bot] 已绑定 KOOK 用户 ${kookUsername} (${kookUserId})，绑定码: ${bindCode}`);
    return { success: true };
  } catch (err) {
    console.error('[KOOK Bot] 绑定失败:', err);
    return { success: false, message: '系统错误，请稍后重试' };
  }
}

// 发送频道消息
async function sendChannelMessage(channelId, content) {
  try {
    const result = await kookRequest('POST', '/message/create', {
      target_id: channelId,
      content: content
    });
    return result.code === 0;
  } catch (err) {
    console.error('[KOOK Bot] 发送频道消息失败:', err);
    return false;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ s: 2, sn: lastSn }));
    }
  }, 30000); // 30秒心跳
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function reconnect() {
  if (ws) {
    ws.close();
  }
}

// 更新 KOOK 用户ID（当用户在频道发消息时自动绑定）
async function updateKookUserId(phone, kookUserId, kookUsername) {
  if (!Data) return false;
  
  try {
    // 通过手机号查找 kookChannel
    const channel = await Data.findOne({
      collection: 'kookChannels',
      'data.phone': phone
    });
    
    if (channel) {
      channel.data.kookUserId = kookUserId;
      channel.data.kookUsername = kookUsername;
      await channel.save();
      console.log(`[KOOK Bot] 已绑定 KOOK 用户 ${kookUsername} (${kookUserId}) 到手机号 ${phone}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[KOOK Bot] 更新 KOOK 用户ID失败:', err);
    return false;
  }
}

module.exports = {
  initDB,
  startBot,
  checkUserClocked,
  updateKookUserId
};
