const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const db = mongoose.connection.db;
  
  // 马鑫磊的信息
  const tenantId = '6943b29b54fd48df6451fc7f';
  const staffId = '6947d8d656a5aa219e45f7ef';
  
  // 在 datas 集合中查找订单
  const allOrders = await db.collection('datas').find({ 
    tenantId,
    collection: 'orders'
  }).toArray();
  
  console.log('该租户订单数:', allOrders.length);
  
  // 找马鑫磊的订单
  const staffOrders = allOrders.filter(o => o.data && o.data.staffId === staffId);
  console.log('马鑫磊订单数:', staffOrders.length);
  staffOrders.forEach(o => {
    console.log(`ID: ${o._id}, 日期: ${o.data.date}, 金额: ${o.data.amount}, 状态: ${o.data.status}`);
  });
  
  // 找日期包含 12-03 的订单
  const targetOrder = staffOrders.find(o => o.data && o.data.date && o.data.date.includes('12-03'));
  if (targetOrder) {
    console.log('找到目标订单:', targetOrder._id);
    await db.collection('datas').updateOne(
      { _id: targetOrder._id },
      { $set: { 'data.date': '2025-12-23' } }
    );
    console.log('已更新日期为 2025-12-23');
  } else {
    console.log('未找到 12-03 的订单');
  }
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
