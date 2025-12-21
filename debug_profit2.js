const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const Data = mongoose.model('Data', new mongoose.Schema({ collection: String, tenantId: String, data: Object }), 'datas');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 获取完整的设置
  const settingsDoc = await Data.findOne({ collection: 'settings', tenantId });
  console.log('=== 完整设置 ===');
  console.log(JSON.stringify(settingsDoc?.data, null, 2));
  
  // 获取最近的一个订单
  const orders = await Data.find({ collection: 'orders', tenantId });
  const completedOrders = orders.filter(o => o.data?.status === 'completed');
  
  console.log('\n=== 最近一个已完成订单 ===');
  const lastOrder = completedOrders[completedOrders.length - 1];
  console.log(JSON.stringify(lastOrder?.data, null, 2));
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
});
