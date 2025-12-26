const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查找租户
  const tenant = await db.collection('tenants').findOne({ phone: '13051818686' });
  if (!tenant) {
    console.log('租户不存在');
    return;
  }
  console.log('租户ID:', tenant._id.toString());
  
  // 查询所有订单
  const orders = await db.collection(`orders_${tenant._id}`).find({}).sort({ createdAt: -1 }).toArray();
  
  console.log('\n=== 所有订单 ===');
  orders.forEach((order, i) => {
    console.log(`\n--- 订单 ${i + 1} ---`);
    console.log('ID:', order._id.toString());
    console.log('状态:', order.status);
    console.log('金额:', order.amount, '万');
    console.log('客户:', order.customerName);
    console.log('创建时间:', order.createdAt);
    console.log('完成时间:', order.completedAt || '未完成');
    if (order.restoredAt) {
      console.log('恢复时间:', order.restoredAt);
    }
  });
  
  await client.close();
}

main().catch(console.error);
