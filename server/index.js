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
    res.json({ success: true, data: staff.map(s => ({ id: s._id, username: s.username, name: s.name, tenantId: s.tenantId })) });
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

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
