const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询暂停中的订单
  const orders = await db.collection('datas').find({
    collection: 'orders',
    tenantId: tenantId,
    'data.status': 'paused'
  }).sort({ createdAt: -1 }).toArray();
  
  console.log('=== 暂停中的订单 ===');
  console.log('总数:', orders.length);
  
  orders.forEach((order, i) => {
    const d = order.data;
    console.log('\n--- 订单', i + 1, '---');
    console.log('ID:', order._id.toString());
    console.log('金额:', d.amount, '万');
    console.log('员工:', d.staffName);
    console.log('收入:', d.income);
    console.log('创建时间:', order.createdAt);
  });
  
  await client.close();
}

main().catch(console.error);
