const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// 连接 MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou')
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => console.error('MongoDB 连接失败:', err));

// 用户模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
  name: String,
  tenantId: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

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
    const { username, password } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.json({ success: false, error: '用户已存在' });
    
    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hash,
      role: 'admin',
      name: username,
      tenantId: new mongoose.Types.ObjectId().toString()
    });
    await user.save();
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
    const docs = await Data.find({ collection: req.params.collection, tenantId: req.params.tenantId });
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
      // 更新窗口的 tenantId
      await Data.findByIdAndUpdate(transfer.windowId, { 
        tenantId: transfer.toTenantId,
        'data.userId': null  // 清除分配的员工
      });
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
      // 计算利润 = 转让价格 - 成本
      const profit = transfer.price - transferCost;
      
      // 更新云机的 tenantId
      await Data.updateOne(
        { _id: new mongoose.Types.ObjectId(transfer.machineId) },
        { tenantId: transfer.toTenantId }
      );
      
      // 更新所有窗口的 tenantId，并清除分配的员工
      for (const windowId of transfer.windowIds) {
        await Data.updateOne(
          { _id: new mongoose.Types.ObjectId(windowId) },
          { 
            tenantId: transfer.toTenantId,
            'data.userId': null
          }
        );
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
          note: `转让云机给 ${transfer.toTenantName}`
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
          note: `从 ${transfer.fromTenantName} 接收云机`
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

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
