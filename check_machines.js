const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const Data = mongoose.model('Data', new mongoose.Schema({ collection: String, tenantId: String, data: Object }), 'datas');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 获取云机
  const machines = await Data.find({ collection: 'cloudMachines', tenantId });
  console.log('=== 云机数据 ===');
  console.log('云机数量:', machines.length);
  machines.forEach(m => {
    console.log('云机:', m._id, m.data?.phone, m.data?.platform);
  });
  
  // 获取窗口
  const windows = await Data.find({ collection: 'cloudWindows', tenantId });
  console.log('\n=== 窗口数据 ===');
  console.log('窗口数量:', windows.length);
  windows.forEach(w => {
    console.log('窗口:', w._id, w.data?.windowNumber, '云机ID:', w.data?.machineId, '余额:', w.data?.goldBalance);
  });
  
  // 检查转让记录
  const MachineTransfer = mongoose.model('MachineTransfer', new mongoose.Schema({
    fromTenantId: String,
    toTenantId: String,
    status: String,
    machineId: String,
    windowIds: [String],
    createdAt: Date
  }), 'machinetransfers');
  
  const transfers = await MachineTransfer.find({
    $or: [
      { fromTenantId: tenantId },
      { toTenantId: tenantId }
    ]
  }).sort({ createdAt: -1 }).limit(10);
  
  console.log('\n=== 转让记录 ===');
  transfers.forEach(t => {
    console.log('转让:', t._id, 'from:', t.fromTenantId, 'to:', t.toTenantId, 'status:', t.status, 'machineId:', t.machineId, 'windowIds:', t.windowIds);
  });
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
});
