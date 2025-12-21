// 查询订单详情的脚本
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou')
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => { console.error('MongoDB 连接失败:', err); process.exit(1); });

const DataSchema = new mongoose.Schema({
  collection: String,
  tenantId: String,
  data: mongoose.Schema.Types.Mixed
}, { timestamps: true });
const Data = mongoose.model('Data', DataSchema);

async function checkOrders() {
  try {
    // 查找今天（2025-12-20）金额为 10000 万的订单
    const orders = await Data.find({ 
      collection: 'orders',
      'data.amount': 10000,
      'data.date': '2025-12-20'
    });
    
    console.log('\n========== 找到的订单 ==========');
    for (const order of orders) {
      console.log('\n订单ID:', order._id);
      console.log('租户ID:', order.tenantId);
      console.log('订单数据:', JSON.stringify(order.data, null, 2));
    }
    
    // 如果没找到，查找所有今天的订单
    if (orders.length === 0) {
      console.log('\n没有找到金额为10000万的订单，查找今天所有订单...');
      const allTodayOrders = await Data.find({ 
        collection: 'orders',
        'data.date': '2025-12-20'
      });
      console.log('今天的订单数:', allTodayOrders.length);
      for (const order of allTodayOrders) {
        console.log('\n订单ID:', order._id);
        console.log('金额:', order.data.amount, '万');
        console.log('状态:', order.data.status);
        console.log('损耗:', order.data.loss);
        console.log('总消耗:', order.data.totalConsumed);
      }
    }
    
  } catch (err) {
    console.error('查询失败:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrders();
