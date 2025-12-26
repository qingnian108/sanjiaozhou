const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function main() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const orderId = '694d01e711e8b38e260c9db1';
  
  // 查找订单
  const order = await db.collection('datas').findOne({
    _id: new ObjectId(orderId)
  });
  
  if (!order) {
    console.log('订单不存在');
    return;
  }
  
  console.log('修改前:', order.data.status);
  
  // 更新状态为 completed
  await db.collection('datas').updateOne(
    { _id: new ObjectId(orderId) },
    { 
      $set: { 
        'data.status': 'completed',
        'data.completedAt': new Date().toISOString(),
        updatedAt: new Date()
      }
    }
  );
  
  // 验证
  const updated = await db.collection('datas').findOne({
    _id: new ObjectId(orderId)
  });
  
  console.log('修改后:', updated.data.status);
  console.log('完成时间:', updated.data.completedAt);
  console.log('修改成功！');
  
  await client.close();
}

main().catch(console.error);
