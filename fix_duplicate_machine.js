const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const db = mongoose.connection.db;
  
  // 被转让方租户ID
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查找该租户的云机
  const machines = await db.collection('datas').find({ 
    collection: 'cloudMachines',
    tenantId
  }).toArray();
  
  console.log('该租户拥有的云机数:', machines.length);
  machines.forEach(m => {
    console.log(`ID: ${m._id}, 手机: ${m.data.phone}, 平台: ${m.data.platform}`);
  });
  
  // 查找该租户的窗口
  const windows = await db.collection('datas').find({ 
    collection: 'cloudWindows',
    tenantId
  }).toArray();
  
  console.log('\n该租户的窗口数:', windows.length);
  
  // 统计窗口关联的云机
  const machineIds = [...new Set(windows.map(w => w.data.machineId))];
  console.log('窗口关联的云机ID:', machineIds);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
