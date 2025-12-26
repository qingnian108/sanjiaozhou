const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查找所有暂停的订单
  const pausedOrders = await db.collection('datas').find({
    collection: 'orders',
    'data.status': 'paused'
  }).toArray();
  
  console.log('暂停的订单数量:', pausedOrders.length);
  
  for (const order of pausedOrders) {
    console.log('\n订单 ID:', order._id.toString());
    console.log('员工 ID:', order.data.staffId);
    console.log('金额:', order.data.amount, '万');
    console.log('状态:', order.data.status);
    console.log('日期:', order.data.date);
    console.log('有 windowSnapshots:', !!order.data.windowSnapshots);
    console.log('parentOrderId:', order.data.parentOrderId);
    console.log('originalOrderId:', order.data.originalOrderId);
  }
  
  // 查找所有进行中的订单
  const pendingOrders = await db.collection('datas').find({
    collection: 'orders',
    'data.status': 'pending'
  }).toArray();
  
  console.log('\n\n进行中的订单数量:', pendingOrders.length);
  
  for (const order of pendingOrders) {
    console.log('\n订单 ID:', order._id.toString());
    console.log('员工 ID:', order.data.staffId);
    console.log('金额:', order.data.amount, '万');
    console.log('状态:', order.data.status);
    console.log('日期:', order.data.date);
    console.log('有 windowSnapshots:', !!order.data.windowSnapshots);
  }
  
  await client.close();
}

main().catch(console.error);
