require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ========== 微信支付配置 ==========
// 读取私钥文件
let privateKey = '';
try {
  const keyPath = path.join(__dirname, 'apiclient_key.pem');
  if (fs.existsSync(keyPath)) {
    privateKey = fs.readFileSync(keyPath, 'utf8');
  }
} catch (err) {
  console.error('读取私钥文件失败:', err.message);
}

const WECHAT_PAY_CONFIG = {
  mchid: process.env.WECHAT_MCHID || '',           // 商户号
  appid: process.env.WECHAT_APPID || '',           // 应用ID
  apiV3Key: process.env.WECHAT_API_V3_KEY || '',   // APIv3密钥
  serialNo: process.env.WECHAT_CERT_SERIAL || '',  // 证书序列号
  privateKey: privateKey,                           // 私钥内容
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://jdj.9vvn.com/api/wechat/notify'
};

// 连接 MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou')
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => console.error('MongoDB 连接失败:', err));

// 用户模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super', 'admin', 'staff', 'dispatcher'], default: 'admin' },
  name: String,
  tenantId: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 租户账户模型 - 预付费模式
const TenantAccountSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },           // 账户余额
  basePrice: { type: Number, default: 50 },        // 基础月费
  pricePerWindow: { type: Number, default: 10 },   // 窗口单价/月
  accountExpireDate: String,                        // 账户有效期（基础月费）
  status: { type: String, enum: ['trial', 'active', 'expired', 'suspended'], default: 'trial' },
  trialEndDate: String,                            // 试用截止日期
  commissionRate: { type: Number, default: 0.1 },  // 返佣比例，默认10%
  inviterId: String,                               // 邀请人租户ID
  inviteCode: { type: String, unique: true, sparse: true }, // 随机邀请码
  createdAt: { type: Date, default: Date.now }
});
const TenantAccount = mongoose.model('TenantAccount', TenantAccountSchema);

// 生成随机邀请码（6位字母数字）
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 生成唯一邀请码
async function generateUniqueInviteCode() {
  let code;
  let exists = true;
  while (exists) {
    code = generateInviteCode();
    exists = await TenantAccount.findOne({ inviteCode: code });
  }
  return code;
}

// 窗口订阅模型 - 每个窗口单独计费
const WindowSubscriptionSchema = new mongoose.Schema({
  tenantId: String,
  windowCount: { type: Number, default: 0 },       // 已购买的窗口数量
  expireDate: String,                               // 窗口有效期
  createdAt: { type: Date, default: Date.now }
});
const WindowSubscription = mongoose.model('WindowSubscription', WindowSubscriptionSchema);

// 购买记录模型
const PurchaseRecordSchema = new mongoose.Schema({
  tenantId: String,
  type: { type: String, enum: ['base', 'window'] }, // base=基础月费, window=窗口
  amount: Number,                                    // 金额
  quantity: { type: Number, default: 1 },           // 数量（窗口购买时用）
  months: { type: Number, default: 1 },             // 购买月数
  expireDate: String,                               // 到期日期
  createdAt: { type: Date, default: Date.now }
});
const PurchaseRecord = mongoose.model('PurchaseRecord', PurchaseRecordSchema);

// 月度账单模型
const MonthlyBillSchema = new mongoose.Schema({
  tenantId: String,
  tenantName: String,
  month: String,
  peakWindowCount: Number,
  freeWindows: Number,
  extraWindows: Number,
  basePrice: Number,
  extraPrice: Number,
  totalAmount: Number,
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});
const MonthlyBill = mongoose.model('MonthlyBill', MonthlyBillSchema);

// 每日窗口快照模型
const DailySnapshotSchema = new mongoose.Schema({
  tenantId: String,
  date: String,
  windowCount: Number,
  createdAt: { type: Date, default: Date.now }
});
const DailySnapshot = mongoose.model('DailySnapshot', DailySnapshotSchema);

// 充值订单模型
const RechargeOrderSchema = new mongoose.Schema({
  tenantId: String,
  tenantName: String,
  amount: Number,
  outTradeNo: { type: String, unique: true },
  codeUrl: String,
  status: { type: String, enum: ['pending', 'paid', 'expired', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  paidAt: Date,
  wxTransactionId: String
});
const RechargeOrder = mongoose.model('RechargeOrder', RechargeOrderSchema);

// 充值记录模型
const RechargeRecordSchema = new mongoose.Schema({
  tenantId: String,
  tenantName: String,
  orderId: String,
  amount: Number,
  balanceBefore: Number,
  balanceAfter: Number,
  method: { type: String, enum: ['wechat', 'manual'], default: 'wechat' },
  createdAt: { type: Date, default: Date.now },
  note: String
});
const RechargeRecord = mongoose.model('RechargeRecord', RechargeRecordSchema);

// 邀请关系模型
const ReferralSchema = new mongoose.Schema({
  inviterId: { type: String, required: true },     // 邀请人租户ID
  inviteeId: { type: String, required: true },     // 被邀请人租户ID
  inviteCode: String,                               // 使用的邀请码
  createdAt: { type: Date, default: Date.now }
});
ReferralSchema.index({ inviteeId: 1 }, { unique: true }); // 每个被邀请人只能有一个邀请人
const Referral = mongoose.model('Referral', ReferralSchema);

// 返佣记录模型
const CommissionSchema = new mongoose.Schema({
  inviterId: { type: String, required: true },     // 邀请人租户ID
  inviteeId: { type: String, required: true },     // 被邀请人租户ID
  rechargeOrderId: String,                          // 关联的充值订单ID
  rechargeAmount: Number,                           // 充值金额
  commissionRate: Number,                           // 返佣比例
  commissionAmount: Number,                         // 返佣金额
  createdAt: { type: Date, default: Date.now }
});
const Commission = mongoose.model('Commission', CommissionSchema);

// 通用数据模型
const DataSchema = new mongoose.Schema({
  collection: String,
  tenantId: String,
  data: mongoose.Schema.Types.Mixed
}, { timestamps: true });
const Data = mongoose.model('Data', DataSchema);

// 注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.json({ success: false, error: '用户已存在' });
    
    // 验证邀请码（如果提供）- 通过 inviteCode 字段查找
    let inviterId = null;
    if (inviteCode) {
      const inviterAccount = await TenantAccount.findOne({ inviteCode: inviteCode.toUpperCase() });
      if (inviterAccount) {
        inviterId = inviterAccount.tenantId;
      }
    }
    
    const hash = await bcrypt.hash(password, 10);
    const tenantId = new mongoose.Types.ObjectId().toString();
    const user = new User({
      username,
      password: hash,
      role: 'admin',
      name: username,
      tenantId
    });
    await user.save();
    
    // 生成唯一邀请码
    const newInviteCode = await generateUniqueInviteCode();
    
    // 创建租户账户，设置7天试用期
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    const account = new TenantAccount({
      tenantId,
      balance: 0,
      basePrice: 50,
      freeWindows: 5,
      pricePerWindow: 10,
      trialEndDate: trialEndDate.toISOString().split('T')[0],
      status: 'trial',
      commissionRate: 0.1,
      inviterId: inviterId,
      inviteCode: newInviteCode
    });
    await account.save();
    
    // 如果有邀请人，创建邀请关系
    if (inviterId) {
      const referral = new Referral({
        inviterId,
        inviteeId: tenantId,
        inviteCode
      });
      await referral.save();
    }
    
    res.json({ success: true, user: { id: user._id, username, role: 'admin', name: username, tenantId: user.tenantId } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, error: '用户不存在' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, error: '密码错误' });
    
    res.json({ success: true, user: { id: user._id, username, role: user.role, name: user.name, tenantId: user.tenantId } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 修改密码
app.post('/api/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.json({ success: false, error: '用户不存在' });
    
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.json({ success: false, error: '原密码错误' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 添加员工
app.post('/api/staff', async (req, res) => {
  try {
    const { username, password, name, tenantId } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.json({ success: false, error: '用户名已存在' });
    
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hash, role: 'staff', name, tenantId });
    await user.save();
    res.json({ success: true, staff: { id: user._id, username, name, tenantId } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 添加客服
app.post('/api/dispatcher', async (req, res) => {
  try {
    const { username, password, name, tenantId } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.json({ success: false, error: '用户名已存在' });
    
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hash, role: 'dispatcher', name, tenantId });
    await user.save();
    res.json({ success: true, dispatcher: { id: user._id, username, name, tenantId, role: 'dispatcher' } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取客服列表
app.get('/api/dispatchers/:tenantId', async (req, res) => {
  try {
    const dispatchers = await User.find({ tenantId: req.params.tenantId, role: 'dispatcher' });
    res.json({ success: true, data: dispatchers.map(d => ({ id: d._id, username: d.username, name: d.name, role: d.role, tenantId: d.tenantId })) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 删除客服
app.delete('/api/dispatcher/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 删除员工
app.delete('/api/staff/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取员工列表
app.get('/api/staff/:tenantId', async (req, res) => {
  try {
    const staff = await User.find({ tenantId: req.params.tenantId, role: 'staff' });
    res.json({ success: true, data: staff.map(s => ({ id: s._id, username: s.username, name: s.name, role: s.role, tenantId: s.tenantId })) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 通用 CRUD - 获取数据
app.get('/api/data/:collection/:tenantId', async (req, res) => {
  try {
    const { collection, tenantId } = req.params;
    
    // 特殊处理云机：需要获取该租户拥有的云机 + 该租户窗口关联的云机
    if (collection === 'cloudMachines') {
      // 先获取该租户的所有窗口
      const windows = await Data.find({ collection: 'cloudWindows', tenantId });
      const windowMachineIds = windows.map(w => w.data?.machineId).filter(Boolean);
      
      // 获取该租户拥有的云机 + 窗口关联的云机
      const docs = await Data.find({
        collection: 'cloudMachines',
        $or: [
          { tenantId },
          { _id: { $in: windowMachineIds.map(id => {
            try { return new mongoose.Types.ObjectId(id); } catch(e) { return null; }
          }).filter(Boolean) } }
        ]
      });
      
      return res.json({ success: true, data: docs.map(d => ({ id: d._id, ...d.data })) });
    }
    
    const docs = await Data.find({ collection, tenantId });
    res.json({ success: true, data: docs.map(d => ({ id: d._id, ...d.data })) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 通用 CRUD - 添加数据
app.post('/api/data/:collection', async (req, res) => {
  try {
    const { tenantId, ...data } = req.body;
    const doc = new Data({ collection: req.params.collection, tenantId, data });
    await doc.save();
    res.json({ success: true, id: doc._id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 通用 CRUD - 更新数据
app.put('/api/data/:collection/:id', async (req, res) => {
  try {
    const { tenantId, ...data } = req.body;
    await Data.findByIdAndUpdate(req.params.id, { data });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 通用 CRUD - 删除数据
app.delete('/api/data/:collection/:id', async (req, res) => {
  try {
    await Data.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取设置
app.get('/api/settings/:tenantId', async (req, res) => {
  try {
    const doc = await Data.findOne({ collection: 'settings', tenantId: req.params.tenantId });
    if (doc) {
      res.json({ success: true, data: doc.data });
    } else {
      res.json({ success: true, data: { employeeCostRate: 12, orderUnitPrice: 60, defaultFeePercent: 5, initialCapital: 10000 } });
    }
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 保存设置
app.post('/api/settings/:tenantId', async (req, res) => {
  try {
    await Data.findOneAndUpdate(
      { collection: 'settings', tenantId: req.params.tenantId },
      { data: req.body },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 邀请返佣系统 API ==========

// 用户名脱敏函数
function maskUsername(username) {
  if (!username || username.length <= 4) return username;
  const start = username.slice(0, 3);
  const end = username.slice(-2);
  return `${start}****${end}`;
}

// 验证邀请码
app.get('/api/referral/validate/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    // 通过 inviteCode 字段查找账户
    const inviterAccount = await TenantAccount.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!inviterAccount) {
      return res.json({ success: true, valid: false });
    }
    // 获取邀请人用户信息
    const inviter = await User.findOne({ tenantId: inviterAccount.tenantId, role: 'admin' });
    res.json({ 
      success: true, 
      valid: true, 
      inviterName: inviter ? maskUsername(inviter.name || inviter.username) : '未知',
      inviterId: inviterAccount.tenantId
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取邀请信息
app.get('/api/referral/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // 获取账户信息
    let account = await TenantAccount.findOne({ tenantId });
    if (!account) return res.json({ success: false, error: '账户不存在' });
    
    // 如果没有邀请码，生成一个
    if (!account.inviteCode) {
      account.inviteCode = await generateUniqueInviteCode();
      await account.save();
    }
    
    const commissionRate = account.commissionRate || 0.1;
    
    // 统计邀请人数
    const inviteeCount = await Referral.countDocuments({ inviterId: tenantId });
    
    // 统计累计返佣
    const commissions = await Commission.find({ inviterId: tenantId });
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    
    res.json({
      success: true,
      data: {
        inviteCode: account.inviteCode,
        inviteLink: `https://jdj.9vvn.com?ref=${account.inviteCode}`,
        commissionRate,
        stats: {
          inviteeCount,
          totalCommission
        }
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取被邀请人列表
app.get('/api/referral/:tenantId/invitees', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const referrals = await Referral.find({ inviterId: tenantId }).sort({ createdAt: -1 });
    
    // 获取被邀请人信息
    const invitees = [];
    for (const ref of referrals) {
      const user = await User.findOne({ tenantId: ref.inviteeId, role: 'admin' });
      if (user) {
        invitees.push({
          username: maskUsername(user.username),
          createdAt: ref.createdAt
        });
      }
    }
    
    res.json({ success: true, data: invitees });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取返佣记录
app.get('/api/referral/:tenantId/commissions', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const commissions = await Commission.find({ inviterId: tenantId }).sort({ createdAt: -1 });
    
    // 获取被邀请人信息
    const records = [];
    for (const comm of commissions) {
      const user = await User.findOne({ tenantId: comm.inviteeId, role: 'admin' });
      records.push({
        inviteeUsername: maskUsername(user?.username || '未知'),
        rechargeAmount: comm.rechargeAmount,
        commissionRate: comm.commissionRate,
        commissionAmount: comm.commissionAmount,
        createdAt: comm.createdAt
      });
    }
    
    res.json({ success: true, data: records });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 好友系统 ==========

// 好友关系模型
const FriendSchema = new mongoose.Schema({
  fromId: String,      // 发起者 tenantId
  fromName: String,    // 发起者名称
  toId: String,        // 接收者 tenantId
  toName: String,      // 接收者名称
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Friend = mongoose.model('Friend', FriendSchema);

// 窗口转让模型
const TransferSchema = new mongoose.Schema({
  fromTenantId: String,   // 转出方
  fromTenantName: String,
  toTenantId: String,     // 接收方
  toTenantName: String,
  windowId: String,       // 窗口ID
  windowInfo: Object,     // 窗口信息快照
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const Transfer = mongoose.model('Transfer', TransferSchema);

// 搜索用户（通过用户名搜索老板）
app.get('/api/search-user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username, role: 'admin' });
    if (!user) return res.json({ success: false, error: '用户不存在' });
    res.json({ success: true, user: { id: user._id, username: user.username, name: user.name, tenantId: user.tenantId } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 发送好友请求
app.post('/api/friend/request', async (req, res) => {
  try {
    const { fromId, fromName, toId, toName } = req.body;
    if (fromId === toId) return res.json({ success: false, error: '不能添加自己' });
    
    // 检查是否已经是好友或已发送请求
    const existing = await Friend.findOne({
      $or: [
        { fromId, toId, status: { $in: ['pending', 'accepted'] } },
        { fromId: toId, toId: fromId, status: { $in: ['pending', 'accepted'] } }
      ]
    });
    if (existing) {
      if (existing.status === 'accepted') return res.json({ success: false, error: '已经是好友了' });
      return res.json({ success: false, error: '已发送过请求' });
    }
    
    const friend = new Friend({ fromId, fromName, toId, toName });
    await friend.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取好友请求列表（收到的）
app.get('/api/friend/requests/:tenantId', async (req, res) => {
  try {
    const requests = await Friend.find({ toId: req.params.tenantId, status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 处理好友请求
app.post('/api/friend/respond', async (req, res) => {
  try {
    const { requestId, accept } = req.body;
    await Friend.findByIdAndUpdate(requestId, { status: accept ? 'accepted' : 'rejected' });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取好友列表
app.get('/api/friends/:tenantId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId;
    const friends = await Friend.find({
      $or: [{ fromId: tenantId }, { toId: tenantId }],
      status: 'accepted'
    });
    
    const friendList = friends.map(f => {
      if (f.fromId === tenantId) {
        return { id: f._id, tenantId: f.toId, name: f.toName };
      } else {
        return { id: f._id, tenantId: f.fromId, name: f.fromName };
      }
    });
    res.json({ success: true, data: friendList });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 删除好友
app.delete('/api/friend/:id', async (req, res) => {
  try {
    await Friend.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 窗口转让 ==========

// 发起窗口转让
app.post('/api/transfer/request', async (req, res) => {
  try {
    const { fromTenantId, fromTenantName, toTenantId, toTenantName, windowId, windowInfo } = req.body;
    
    // 检查是否是好友
    const isFriend = await Friend.findOne({
      $or: [
        { fromId: fromTenantId, toId: toTenantId, status: 'accepted' },
        { fromId: toTenantId, toId: fromTenantId, status: 'accepted' }
      ]
    });
    if (!isFriend) return res.json({ success: false, error: '只能转让给好友' });
    
    const transfer = new Transfer({ fromTenantId, fromTenantName, toTenantId, toTenantName, windowId, windowInfo });
    await transfer.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取转让请求（收到的）
app.get('/api/transfer/requests/:tenantId', async (req, res) => {
  try {
    const requests = await Transfer.find({ toTenantId: req.params.tenantId, status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取我发起的转让
app.get('/api/transfer/sent/:tenantId', async (req, res) => {
  try {
    const requests = await Transfer.find({ fromTenantId: req.params.tenantId, status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 处理转让请求
app.post('/api/transfer/respond', async (req, res) => {
  try {
    const { transferId, accept } = req.body;
    const transfer = await Transfer.findById(transferId);
    if (!transfer) return res.json({ success: false, error: '转让请求不存在' });
    
    if (accept) {
      // 查找原窗口
      let windowDoc = await Data.findById(transfer.windowId);
      if (!windowDoc) {
        windowDoc = await Data.findOne({ collection: 'cloudWindows', 'data.id': transfer.windowId });
      }
      
      if (windowDoc) {
        // 查找原云机信息
        const originalMachine = await Data.findById(windowDoc.data?.machineId);
        
        // 为接收方创建新的云机（复制原云机信息）
        const newMachine = new Data({
          collection: 'cloudMachines',
          tenantId: transfer.toTenantId,
          data: {
            phone: originalMachine?.data?.phone || '转让窗口',
            platform: originalMachine?.data?.platform || '好友转让',
            loginType: originalMachine?.data?.loginType || 'code',
            loginPassword: originalMachine?.data?.loginPassword
          }
        });
        await newMachine.save();
        
        // 更新窗口：tenantId 改为接收方，machineId 改为新云机
        windowDoc.tenantId = transfer.toTenantId;
        if (windowDoc.data) {
          windowDoc.data.userId = null;  // 清除分配的员工
          windowDoc.data.machineId = newMachine._id.toString();  // 关联到新云机
        }
        await windowDoc.save();
      }
    }
    
    transfer.status = accept ? 'accepted' : 'rejected';
    await transfer.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 取消转让请求
app.delete('/api/transfer/:id', async (req, res) => {
  try {
    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 云机转让 ==========

// 云机转让模型
const MachineTransferSchema = new mongoose.Schema({
  fromTenantId: String,
  fromTenantName: String,
  toTenantId: String,
  toTenantName: String,
  machineId: String,
  machineInfo: Object,  // 云机信息快照
  windowIds: [String],  // 包含的窗口ID列表
  windowsInfo: [Object], // 窗口信息快照
  price: Number,        // 转让价格
  totalGold: Number,    // 总哈夫币
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const MachineTransfer = mongoose.model('MachineTransfer', MachineTransferSchema);

// 发起云机转让
app.post('/api/machine-transfer/request', async (req, res) => {
  try {
    const { fromTenantId, fromTenantName, toTenantId, toTenantName, machineId, machineInfo, windowIds, windowsInfo, price, totalGold } = req.body;
    
    // 检查是否是好友
    const isFriend = await Friend.findOne({
      $or: [
        { fromId: fromTenantId, toId: toTenantId, status: 'accepted' },
        { fromId: toTenantId, toId: fromTenantId, status: 'accepted' }
      ]
    });
    if (!isFriend) return res.json({ success: false, error: '只能转让给好友' });
    
    const transfer = new MachineTransfer({ 
      fromTenantId, fromTenantName, toTenantId, toTenantName, 
      machineId, machineInfo, windowIds, windowsInfo, price, totalGold 
    });
    await transfer.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取云机转让请求（收到的）
app.get('/api/machine-transfer/requests/:tenantId', async (req, res) => {
  try {
    const requests = await MachineTransfer.find({ toTenantId: req.params.tenantId, status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取我发起的云机转让
app.get('/api/machine-transfer/sent/:tenantId', async (req, res) => {
  try {
    const requests = await MachineTransfer.find({ fromTenantId: req.params.tenantId, status: 'pending' });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 处理云机转让请求
app.post('/api/machine-transfer/respond', async (req, res) => {
  try {
    const { transferId, accept } = req.body;
    const transfer = await MachineTransfer.findById(transferId);
    if (!transfer) return res.json({ success: false, error: '转让请求不存在' });
    
    if (accept) {
      const today = new Date().toISOString().split('T')[0];
      
      // 计算转出方的平均币价
      const fromPurchases = await Data.find({ 
        collection: 'purchases', 
        tenantId: transfer.fromTenantId 
      });
      let totalPurchaseAmount = 0;
      let totalPurchaseCost = 0;
      fromPurchases.forEach(p => {
        totalPurchaseAmount += p.data.amount || 0;
        totalPurchaseCost += p.data.cost || 0;
      });
      const avgCostPerGold = totalPurchaseAmount > 0 ? totalPurchaseCost / totalPurchaseAmount : 0;
      
      // 计算这批哈夫币的成本
      const transferCost = transfer.totalGold * avgCostPerGold;
      
      // 按原云机分组窗口，为每个原云机创建一个新云机
      const windowsByMachine = {};
      for (const windowInfo of (transfer.windowsInfo || [])) {
        const machineId = windowInfo.machineId || transfer.machineId;
        if (!windowsByMachine[machineId]) {
          windowsByMachine[machineId] = {
            machineInfo: windowInfo.machineInfo || transfer.machineInfo,
            windows: []
          };
        }
        windowsByMachine[machineId].windows.push(windowInfo);
      }
      
      // 如果 windowsInfo 没有 machineId，使用旧逻辑（所有窗口归到一个云机）
      if (Object.keys(windowsByMachine).length === 0) {
        windowsByMachine[transfer.machineId] = {
          machineInfo: transfer.machineInfo,
          windows: transfer.windowsInfo || []
        };
      }
      
      // 为每个原云机创建新云机，并更新窗口
      const machineIdMap = {}; // 原云机ID -> 新云机ID
      for (const [originalMachineId, machineData] of Object.entries(windowsByMachine)) {
        const info = machineData.machineInfo || transfer.machineInfo || {};
        const newMachine = new Data({
          collection: 'cloudMachines',
          tenantId: transfer.toTenantId,
          data: {
            phone: info.phone || '转让云机',
            platform: info.platform || '好友转让',
            loginType: info.loginType || 'code',
            loginPassword: info.loginPassword || ''
          }
        });
        await newMachine.save();
        machineIdMap[originalMachineId] = newMachine._id.toString();
        console.log('Created new machine for receiver:', newMachine._id.toString(), 'from original:', originalMachineId);
      }
      
      // 更新窗口的 tenantId 和 machineId
      for (let i = 0; i < transfer.windowIds.length; i++) {
        const windowId = transfer.windowIds[i];
        const windowInfo = transfer.windowsInfo?.[i] || {};
        const originalMachineId = windowInfo.machineId || transfer.machineId;
        const newMachineId = machineIdMap[originalMachineId] || Object.values(machineIdMap)[0];
        
        let windowDoc = await Data.findById(windowId);
        if (!windowDoc) {
          windowDoc = await Data.findOne({ collection: 'cloudWindows', 'data.id': windowId });
        }
        
        if (windowDoc) {
          windowDoc.tenantId = transfer.toTenantId;
          if (windowDoc.data) {
            windowDoc.data.userId = null;
            windowDoc.data.machineId = newMachineId;
          }
          await windowDoc.save();
          console.log('Window transferred:', windowId, 'to machine:', newMachineId);
        } else {
          console.log('Window not found:', windowId);
        }
      }
      
      // 为转出方创建"转让收入"记录（负的采购 = 卖出）
      const sellRecord = new Data({
        collection: 'purchases',
        tenantId: transfer.fromTenantId,
        data: {
          date: today,
          amount: -transfer.totalGold,  // 负数表示卖出
          cost: -transfer.price,        // 负数表示收入
          type: 'transfer_out',
          note: `转让${transfer.windowIds.length}个窗口给 ${transfer.toTenantName}`
        }
      });
      await sellRecord.save();
      
      // 为新老板创建采购记录
      const purchaseData = new Data({
        collection: 'purchases',
        tenantId: transfer.toTenantId,
        data: {
          date: today,
          amount: transfer.totalGold,
          cost: transfer.price,
          type: 'transfer_in',
          note: `从 ${transfer.fromTenantName} 接收${transfer.windowIds.length}个窗口`
        }
      });
      await purchaseData.save();
    }
    
    transfer.status = accept ? 'accepted' : 'rejected';
    await transfer.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 取消云机转让请求
app.delete('/api/machine-transfer/:id', async (req, res) => {
  try {
    await MachineTransfer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 收费系统 API ==========

// 获取租户账户信息
app.get('/api/account/:tenantId', async (req, res) => {
  try {
    let account = await TenantAccount.findOne({ tenantId: req.params.tenantId });
    if (!account) {
      // 为老用户创建账户（兼容）
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      account = new TenantAccount({
        tenantId: req.params.tenantId,
        balance: 0,
        trialEndDate: trialEndDate.toISOString().split('T')[0],
        status: 'trial'
      });
      await account.save();
    }
    
    // 获取窗口订阅信息
    let windowSub = await WindowSubscription.findOne({ tenantId: req.params.tenantId });
    if (!windowSub) {
      windowSub = { windowCount: 0, expireDate: null };
    }
    
    // 检查并更新状态
    const today = new Date().toISOString().split('T')[0];
    if (account.status === 'trial' && account.trialEndDate && account.trialEndDate < today) {
      account.status = 'expired';
      await account.save();
    } else if (account.status === 'active' && account.accountExpireDate && account.accountExpireDate < today) {
      account.status = 'expired';
      await account.save();
    }
    
    res.json({ 
      success: true, 
      data: {
        ...account.toObject(),
        windowCount: windowSub.windowCount,
        windowExpireDate: windowSub.expireDate
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 购买基础月费
app.post('/api/account/:tenantId/buy-base', async (req, res) => {
  try {
    const { months = 1 } = req.body;
    const account = await TenantAccount.findOne({ tenantId: req.params.tenantId });
    if (!account) return res.json({ success: false, error: '账户不存在' });
    
    const totalCost = account.basePrice * months;
    if (account.balance < totalCost) {
      return res.json({ success: false, error: `余额不足，需要 ¥${totalCost}，当前余额 ¥${account.balance}` });
    }
    
    // 扣款
    account.balance -= totalCost;
    
    // 计算新的到期日期
    let startDate = new Date();
    if (account.accountExpireDate && account.accountExpireDate > startDate.toISOString().split('T')[0]) {
      startDate = new Date(account.accountExpireDate);
    }
    startDate.setMonth(startDate.getMonth() + months);
    account.accountExpireDate = startDate.toISOString().split('T')[0];
    account.status = 'active';
    await account.save();
    
    // 记录购买
    await new PurchaseRecord({
      tenantId: req.params.tenantId,
      type: 'base',
      amount: totalCost,
      months,
      expireDate: account.accountExpireDate
    }).save();
    
    res.json({ success: true, data: account, message: `已购买${months}个月基础服务，有效期至 ${account.accountExpireDate}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 购买窗口
app.post('/api/account/:tenantId/buy-windows', async (req, res) => {
  try {
    const { count = 1, months = 1 } = req.body;
    const account = await TenantAccount.findOne({ tenantId: req.params.tenantId });
    if (!account) return res.json({ success: false, error: '账户不存在' });
    
    const totalCost = account.pricePerWindow * count * months;
    if (account.balance < totalCost) {
      return res.json({ success: false, error: `余额不足，需要 ¥${totalCost}，当前余额 ¥${account.balance}` });
    }
    
    // 扣款
    account.balance -= totalCost;
    await account.save();
    
    // 更新窗口订阅
    let windowSub = await WindowSubscription.findOne({ tenantId: req.params.tenantId });
    if (!windowSub) {
      windowSub = new WindowSubscription({ tenantId: req.params.tenantId, windowCount: 0 });
    }
    
    // 计算新的到期日期
    let startDate = new Date();
    if (windowSub.expireDate && windowSub.expireDate > startDate.toISOString().split('T')[0]) {
      startDate = new Date(windowSub.expireDate);
    }
    startDate.setMonth(startDate.getMonth() + months);
    
    windowSub.windowCount += count;
    windowSub.expireDate = startDate.toISOString().split('T')[0];
    await windowSub.save();
    
    // 记录购买
    await new PurchaseRecord({
      tenantId: req.params.tenantId,
      type: 'window',
      amount: totalCost,
      quantity: count,
      months,
      expireDate: windowSub.expireDate
    }).save();
    
    res.json({ success: true, data: { account, windowSub }, message: `已购买${count}个窗口${months}个月，有效期至 ${windowSub.expireDate}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取购买记录
app.get('/api/account/:tenantId/purchases', async (req, res) => {
  try {
    const records = await PurchaseRecord.find({ tenantId: req.params.tenantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取账单列表
app.get('/api/bills/:tenantId', async (req, res) => {
  try {
    const bills = await MonthlyBill.find({ tenantId: req.params.tenantId }).sort({ month: -1 });
    res.json({ success: true, data: bills });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取充值记录
app.get('/api/recharges/:tenantId', async (req, res) => {
  try {
    const records = await RechargeRecord.find({ tenantId: req.params.tenantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 微信支付 API ==========

// 生成商户订单号
function generateOutTradeNo() {
  return 'SJZ' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 微信支付签名
function generateWechatSign(method, url, timestamp, nonceStr, body) {
  const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  return sign.sign(WECHAT_PAY_CONFIG.privateKey, 'base64');
}

// 创建充值订单
app.post('/api/recharge/create', async (req, res) => {
  try {
    const { tenantId, tenantName, amount } = req.body;
    
    if (!WECHAT_PAY_CONFIG.mchid || !WECHAT_PAY_CONFIG.privateKey) {
      return res.json({ success: false, error: '微信支付未配置，请联系管理员' });
    }
    
    const outTradeNo = generateOutTradeNo();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    
    // 构建请求体
    const requestBody = {
      appid: WECHAT_PAY_CONFIG.appid,
      mchid: WECHAT_PAY_CONFIG.mchid,
      description: '三角洲撞车系统-账户充值',
      out_trade_no: outTradeNo,
      notify_url: WECHAT_PAY_CONFIG.notifyUrl,
      amount: {
        total: Math.round(amount * 100), // 转换为分
        currency: 'CNY'
      }
    };
    
    const bodyStr = JSON.stringify(requestBody);
    const url = '/v3/pay/transactions/native';
    const signature = generateWechatSign('POST', url, timestamp, nonceStr, bodyStr);
    
    // 调用微信支付API
    const https = require('https');
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SanJiaoZhou/1.0',
        'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_CONFIG.mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_CONFIG.serialNo}",signature="${signature}"`
      }
    };
    
    const wxReq = https.request(options, (wxRes) => {
      let data = '';
      wxRes.on('data', chunk => data += chunk);
      wxRes.on('end', async () => {
        try {
          const result = JSON.parse(data);
          if (result.code_url) {
            // 保存订单
            const order = new RechargeOrder({
              tenantId,
              tenantName,
              amount,
              outTradeNo,
              codeUrl: result.code_url,
              status: 'pending'
            });
            await order.save();
            res.json({ success: true, data: { orderId: order._id, outTradeNo, codeUrl: result.code_url, amount } });
          } else {
            console.error('微信支付错误:', result);
            res.json({ success: false, error: result.message || '创建支付订单失败' });
          }
        } catch (e) {
          res.json({ success: false, error: '解析微信响应失败' });
        }
      });
    });
    
    wxReq.on('error', (e) => {
      console.error('微信支付请求错误:', e);
      res.json({ success: false, error: '请求微信支付失败' });
    });
    
    wxReq.write(bodyStr);
    wxReq.end();
    
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 微信支付回调
app.post('/api/recharge/notify', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // 解密回调数据
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { resource } = body;
    
    if (!resource) {
      return res.status(400).json({ code: 'FAIL', message: '无效的回调数据' });
    }
    
    // 解密
    const { ciphertext, nonce, associated_data } = resource;
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(WECHAT_PAY_CONFIG.apiV3Key), Buffer.from(nonce));
    decipher.setAuthTag(Buffer.from(ciphertext.slice(-16), 'base64'));
    decipher.setAAD(Buffer.from(associated_data));
    
    let decrypted = decipher.update(ciphertext.slice(0, -16), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    const paymentResult = JSON.parse(decrypted);
    const { out_trade_no, transaction_id, trade_state } = paymentResult;
    
    if (trade_state === 'SUCCESS') {
      // 查找订单
      const order = await RechargeOrder.findOne({ outTradeNo: out_trade_no });
      if (order && order.status === 'pending') {
        // 更新订单状态
        order.status = 'paid';
        order.paidAt = new Date();
        order.wxTransactionId = transaction_id;
        await order.save();
        
        // 更新账户余额
        const account = await TenantAccount.findOne({ tenantId: order.tenantId });
        if (account) {
          const balanceBefore = account.balance;
          account.balance += order.amount;
          if (account.status === 'suspended') {
            account.status = 'active';
          }
          await account.save();
          
          // 创建充值记录
          const record = new RechargeRecord({
            tenantId: order.tenantId,
            tenantName: order.tenantName,
            orderId: order._id,
            amount: order.amount,
            balanceBefore,
            balanceAfter: account.balance,
            method: 'wechat'
          });
          await record.save();
          
          // 处理返佣：检查是否有邀请人
          if (account.inviterId) {
            try {
              const inviterAccount = await TenantAccount.findOne({ tenantId: account.inviterId });
              if (inviterAccount && inviterAccount.status !== 'suspended') {
                // 计算返佣金额
                const commissionRate = inviterAccount.commissionRate || 0.1;
                const commissionAmount = order.amount * commissionRate;
                
                // 增加邀请人余额
                inviterAccount.balance += commissionAmount;
                await inviterAccount.save();
                
                // 创建返佣记录
                const commission = new Commission({
                  inviterId: account.inviterId,
                  inviteeId: order.tenantId,
                  rechargeOrderId: order._id.toString(),
                  rechargeAmount: order.amount,
                  commissionRate,
                  commissionAmount
                });
                await commission.save();
                
                console.log(`返佣成功: 邀请人${account.inviterId}获得${commissionAmount}元`);
              }
            } catch (commErr) {
              console.error('处理返佣错误:', commErr);
              // 返佣失败不影响充值流程
            }
          }
        }
      }
    }
    
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (err) {
    console.error('处理微信回调错误:', err);
    res.status(500).json({ code: 'FAIL', message: err.message });
  }
});

// 查询充值订单状态
app.get('/api/recharge/query/:orderId', async (req, res) => {
  try {
    const order = await RechargeOrder.findById(req.params.orderId);
    if (!order) return res.json({ success: false, error: '订单不存在' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 超级管理员 API ==========

// 超管登录
app.post('/api/super/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, role: 'super' });
    if (!user) return res.json({ success: false, error: '超级管理员不存在' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ success: false, error: '密码错误' });
    
    res.json({ success: true, user: { id: user._id, username, role: 'super', name: user.name } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取所有租户
app.get('/api/super/tenants', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' });
    const accounts = await TenantAccount.find();
    const accountMap = {};
    accounts.forEach(a => (accountMap[a.tenantId] = a));

    // 获取每个租户的窗口数和利润数据
    const windowCounts = {};
    const profitData = {};
    const today = new Date().toISOString().split('T')[0];

    for (const admin of admins) {
      const windows = await Data.find({
        collection: 'cloudWindows',
        tenantId: admin.tenantId,
      });
      windowCounts[admin.tenantId] = windows.length;

      // 获取设置
      const settingsDoc = await Data.findOne({
        collection: 'settings',
        tenantId: admin.tenantId,
      });
      const settings = settingsDoc?.data || {
        orderUnitPrice: 60,
        employeeCostRate: 12,
      };

      // 获取订单数据
      const orders = await Data.find({
        collection: 'orders',
        tenantId: admin.tenantId,
      });

      // 获取采购数据
      const purchases = await Data.find({
        collection: 'purchases',
        tenantId: admin.tenantId,
      });

      // 完全按照 Dashboard.tsx 的逻辑计算
      // avgCost = totalCost / (totalAmount / 10000000) = 元/千万
      const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.data?.amount || 0), 0);
      const totalPurchaseCost = purchases.reduce((sum, p) => sum + (p.data?.cost || 0), 0);
      const avgCost = totalPurchaseAmount > 0 ? totalPurchaseCost / (totalPurchaseAmount / 10000000) : 0;

      // 计算利润 - 完全按照 Dashboard.tsx 的 totalProfit 计算
      const calculateProfit = (orderList) => {
        let totalRevenue = 0;
        let profit = 0;

        orderList.forEach((o) => {
          const orderData = o.data || {};
          const amount = orderData.amount || 0; // 万
          const loss = orderData.loss || 0; // 实际数量
          const lossInWan = loss / 10000; // 转成万
          const unitPrice = orderData.unitPrice !== undefined ? orderData.unitPrice : (settings.orderUnitPrice || 10);

          // 收入 = 订单金额(万) / 1000 * 单价
          const revenue = (amount / 1000) * unitPrice;
          totalRevenue += revenue;

          // 成本 = (订单金额 + 损耗万) / 1000 * avgCost(元/千万)
          const cogs = ((amount + lossInWan) / 1000) * avgCost;
          
          // 员工成本 = 订单金额(万) / 1000 * 员工成本率
          const laborCost = (amount / 1000) * (settings.employeeCostRate || 1);

          profit += revenue - cogs - laborCost;
        });

        return { revenue: totalRevenue, profit };
      };

      // 只计算已完成订单
      const completedOrders = orders.filter(o => o.data?.status === 'completed');
      const totalStats = calculateProfit(completedOrders);

      // 今日已完成订单
      const todayCompletedOrders = completedOrders.filter(o => o.data?.date === today);
      const todayStats = calculateProfit(todayCompletedOrders);

      profitData[admin.tenantId] = {
        totalRevenue: totalStats.revenue,
        totalProfit: totalStats.profit,
        todayRevenue: todayStats.revenue,
        todayProfit: todayStats.profit,
      };
    }

    const tenants = admins.map((a) => ({
      id: a._id,
      username: a.username,
      name: a.name,
      tenantId: a.tenantId,
      createdAt: a.createdAt,
      account: accountMap[a.tenantId] || null,
      windowCount: windowCounts[a.tenantId] || 0,
      profit: profitData[a.tenantId] || {
        totalRevenue: 0,
        totalProfit: 0,
        todayRevenue: 0,
        todayProfit: 0,
      },
    }));

    res.json({ success: true, data: tenants });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 手动充值
app.post('/api/super/tenant/:tenantId/charge', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const { tenantId } = req.params;
    
    let account = await TenantAccount.findOne({ tenantId });
    if (!account) {
      account = new TenantAccount({ tenantId, balance: 0, status: 'trial' });
    }
    
    const balanceBefore = account.balance;
    account.balance += amount;
    if (account.status === 'suspended' && account.balance > 0) {
      account.status = 'active';
    }
    await account.save();
    
    // 获取租户名称
    const user = await User.findOne({ tenantId, role: 'admin' });
    
    // 创建充值记录
    const record = new RechargeRecord({
      tenantId,
      tenantName: user?.name || '未知',
      orderId: 'MANUAL-' + Date.now(),
      amount,
      balanceBefore,
      balanceAfter: account.balance,
      method: 'manual',
      note
    });
    await record.save();
    
    // 处理返佣：检查是否有邀请人（手动充值也触发返佣）
    if (account.inviterId && amount > 0) {
      try {
        const inviterAccount = await TenantAccount.findOne({ tenantId: account.inviterId });
        if (inviterAccount && inviterAccount.status !== 'suspended') {
          const commissionRate = inviterAccount.commissionRate || 0.1;
          const commissionAmount = amount * commissionRate;
          
          inviterAccount.balance += commissionAmount;
          await inviterAccount.save();
          
          const commission = new Commission({
            inviterId: account.inviterId,
            inviteeId: tenantId,
            rechargeOrderId: record.orderId,
            rechargeAmount: amount,
            commissionRate,
            commissionAmount
          });
          await commission.save();
        }
      } catch (commErr) {
        console.error('处理返佣错误:', commErr);
      }
    }
    
    res.json({ success: true, data: account });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 暂停账户
app.post('/api/super/tenant/:tenantId/suspend', async (req, res) => {
  try {
    const account = await TenantAccount.findOne({ tenantId: req.params.tenantId });
    if (!account) return res.json({ success: false, error: '账户不存在' });
    
    account.status = 'suspended';
    await account.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 恢复账户
app.post('/api/super/tenant/:tenantId/activate', async (req, res) => {
  try {
    const account = await TenantAccount.findOne({ tenantId: req.params.tenantId });
    if (!account) return res.json({ success: false, error: '账户不存在' });
    
    account.status = 'active';
    await account.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 修改租户费率设置
app.post('/api/super/tenant/:tenantId/settings', async (req, res) => {
  try {
    const { basePrice, freeWindows, pricePerWindow, trialEndDate, status, commissionRate } = req.body;
    const account = await TenantAccount.findOne({ tenantId: req.params.tenantId });
    if (!account) return res.json({ success: false, error: '账户不存在' });
    
    if (basePrice !== undefined) account.basePrice = basePrice;
    if (freeWindows !== undefined) account.freeWindows = freeWindows;
    if (pricePerWindow !== undefined) account.pricePerWindow = pricePerWindow;
    if (trialEndDate !== undefined) account.trialEndDate = trialEndDate;
    if (status !== undefined) account.status = status;
    if (commissionRate !== undefined) account.commissionRate = commissionRate;
    await account.save();
    
    res.json({ success: true, data: account });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取租户邀请统计
app.get('/api/super/tenant/:tenantId/referral-stats', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const inviteeCount = await Referral.countDocuments({ inviterId: tenantId });
    const commissions = await Commission.find({ inviterId: tenantId });
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    
    res.json({
      success: true,
      data: { inviteeCount, totalCommission }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取全平台返佣统计
app.get('/api/super/commission-stats', async (req, res) => {
  try {
    const allCommissions = await Commission.find();
    const totalCommission = allCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalReferrals = await Referral.countDocuments();
    
    res.json({
      success: true,
      data: { totalCommission, totalReferrals }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 获取所有账单
app.get('/api/super/bills', async (req, res) => {
  try {
    const bills = await MonthlyBill.find().sort({ month: -1, createdAt: -1 });
    res.json({ success: true, data: bills });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 标记账单已付款
app.post('/api/super/bill/:billId/pay', async (req, res) => {
  try {
    const bill = await MonthlyBill.findById(req.params.billId);
    if (!bill) return res.json({ success: false, error: '账单不存在' });
    
    bill.status = 'paid';
    bill.paidAt = new Date();
    await bill.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 超管统计数据
app.get('/api/super/stats', async (req, res) => {
  try {
    const totalTenants = await User.countDocuments({ role: 'admin' });
    const activeTenants = await TenantAccount.countDocuments({ status: { $in: ['trial', 'active'] } });
    const totalWindows = await Data.countDocuments({ collection: 'cloudWindows' });
    
    const recharges = await RechargeRecord.find();
    const totalRevenue = recharges.reduce((sum, r) => sum + r.amount, 0);
    
    const bills = await MonthlyBill.find({ status: 'paid' });
    const totalBilled = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    
    res.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalWindows,
        totalRevenue,
        totalBilled
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ========== 定时任务 API ==========

// 每日窗口快照
app.post('/api/cron/daily-snapshot', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      const windows = await Data.find({ collection: 'cloudWindows', tenantId: admin.tenantId });
      
      // 检查今天是否已有快照
      const existing = await DailySnapshot.findOne({ tenantId: admin.tenantId, date: today });
      if (existing) {
        existing.windowCount = windows.length;
        await existing.save();
      } else {
        const snapshot = new DailySnapshot({
          tenantId: admin.tenantId,
          date: today,
          windowCount: windows.length
        });
        await snapshot.save();
      }
    }
    
    res.json({ success: true, message: `已为 ${admins.length} 个租户创建快照` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 生成月度账单
app.post('/api/cron/monthly-bill', async (req, res) => {
  try {
    const { month } = req.body; // 格式: "2025-01"，不传则为上个月
    
    let targetMonth = month;
    if (!targetMonth) {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      targetMonth = now.toISOString().slice(0, 7);
    }
    
    const admins = await User.find({ role: 'admin' });
    let billCount = 0;
    
    for (const admin of admins) {
      // 检查是否已有该月账单
      const existingBill = await MonthlyBill.findOne({ tenantId: admin.tenantId, month: targetMonth });
      if (existingBill) continue;
      
      // 获取账户设置
      let account = await TenantAccount.findOne({ tenantId: admin.tenantId });
      if (!account) continue;
      
      // 获取该月的窗口快照，计算峰值
      const snapshots = await DailySnapshot.find({
        tenantId: admin.tenantId,
        date: { $regex: `^${targetMonth}` }
      });
      
      const peakWindowCount = snapshots.length > 0 
        ? Math.max(...snapshots.map(s => s.windowCount))
        : 0;
      
      // 计算费用
      const extraWindows = Math.max(0, peakWindowCount - account.freeWindows);
      const extraPrice = extraWindows * account.pricePerWindow;
      const totalAmount = account.basePrice + extraPrice;
      
      // 创建账单
      const bill = new MonthlyBill({
        tenantId: admin.tenantId,
        tenantName: admin.name,
        month: targetMonth,
        peakWindowCount,
        freeWindows: account.freeWindows,
        extraWindows,
        basePrice: account.basePrice,
        extraPrice,
        totalAmount,
        status: 'pending'
      });
      await bill.save();
      
      // 尝试从余额扣款
      if (account.balance >= totalAmount) {
        account.balance -= totalAmount;
        bill.status = 'paid';
        bill.paidAt = new Date();
        await bill.save();
      } else {
        // 余额不足，标记为逾期
        bill.status = 'overdue';
        await bill.save();
        
        // 如果不是试用期，暂停账户
        if (account.status !== 'trial') {
          account.status = 'suspended';
        }
      }
      await account.save();
      
      billCount++;
    }
    
    res.json({ success: true, message: `已生成 ${billCount} 个账单` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 检查试用期
app.post('/api/cron/check-trial', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const expiredAccounts = await TenantAccount.find({
      status: 'trial',
      trialEndDate: { $lt: today }
    });
    
    let count = 0;
    for (const account of expiredAccounts) {
      if (account.balance > 0) {
        account.status = 'active';
      } else {
        account.status = 'suspended';
      }
      await account.save();
      count++;
    }
    
    res.json({ success: true, message: `已处理 ${count} 个过期试用账户` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 初始化超级管理员（只能调用一次）
app.post('/api/init-super-admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existing = await User.findOne({ role: 'super' });
    if (existing) return res.json({ success: false, error: '超级管理员已存在' });
    
    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hash,
      role: 'super',
      name: '超级管理员'
    });
    await user.save();
    
    res.json({ success: true, message: '超级管理员创建成功' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
