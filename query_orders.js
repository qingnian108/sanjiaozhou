const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询所有订单
  const orders = await db.collection('datas').find({
    collection: 'orders',
    tenantId: tenantId
  }).sort({ createdAt: -1 }).toArray();
  
  console.log('=== 所有订单 ===');
  console.log('总数:', orders.length);
  
  orders.forEach((order, i) => {
    const d = order.data;
    console.log('\n--- 订单', i + 1, '---');
    console.log('ID:', order._id.toString());
    console.log('状态:', d.status);
    console.log('金额:', d.amount, '万');
    console.log('客户:', d.customerName);
    console.log('员工:', d.staffName);
    console.log('创建时间:', order.createdAt);
    if (d.completedAt) console.log('完成时间:', d.completedAt);
    if (d.restoredAt) console.log('恢复时间:', d.restoredAt);
  });
  
  await client.close();
}

main().catch(console.error);
