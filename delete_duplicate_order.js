const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 删除重复的订单（后创建的那笔）
  const duplicateId = '694d413b954091ab90a2c822';
  
  const result = await db.collection('datas').deleteOne({
    _id: new ObjectId(duplicateId)
  });
  
  console.log('删除结果:', result.deletedCount === 1 ? '成功' : '失败');
  
  // 验证
  const remaining = await db.collection('datas').find({
    collection: 'orders',
    tenantId: '6943b29b54fd48df6451fc7f',
    'data.status': 'paused'
  }).toArray();
  
  console.log('剩余暂停订单数:', remaining.length);
  
  await client.close();
}

main().catch(console.error);
