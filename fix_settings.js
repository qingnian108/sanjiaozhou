// 修复设置记录 - 在服务器上运行
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://qingnian108:yang108879@cluster0.siywi.mongodb.net/sanjiaozhou?retryWrites=true&w=majority&appName=Cluster0';

const DataSchema = new mongoose.Schema({
  collection: String,
  tenantId: String,
  data: mongoose.Schema.Types.Mixed
}, { strict: false });

const Data = mongoose.model('Data', DataSchema);

async function run() {
  await mongoose.connect(uri);
  console.log('连接成功');

  // 查找所有设置记录
  const allSettings = await Data.find({ collection: 'settings' });
  console.log('找到设置记录:', allSettings.length);
  allSettings.forEach(s => {
    console.log(`  租户 ${s.tenantId}:`, JSON.stringify(s.data));
  });

  // 查找可能损坏的记录（没有 collection 字段但有 data 字段）
  const brokenSettings = await Data.find({ 
    collection: { $exists: false },
    data: { $exists: true }
  });
  console.log('\n可能损坏的记录:', brokenSettings.length);
  brokenSettings.forEach(s => {
    console.log('  ', JSON.stringify(s.toObject()));
  });

  await mongoose.disconnect();
}

run().catch(console.error);
