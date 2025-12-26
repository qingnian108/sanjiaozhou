const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询租户信息
  const tenant = await db.collection('tenants').findOne({ _id: new ObjectId(tenantId) });
  console.log('=== 租户信息:');
  console.log(tenant);
  
  // 查询所有集合中该租户的数据
  console.log('\n=== 各集合数据统计:');
  
  const collections = ['cloudWindows', 'cloudMachines', 'purchases', 'orders', 'staff'];
  for (const col of collections) {
    const count = await db.collection(col).countDocuments({ tenantId });
    console.log(`${col}: ${count}`);
  }
  
  // 也查一下是否有其他格式的tenantId
  console.log('\n=== 检查是否有ObjectId格式的tenantId:');
  const windowsWithObjId = await db.collection('cloudWindows').find({ 
    tenantId: new ObjectId(tenantId) 
  }).toArray();
  console.log('ObjectId格式窗口数:', windowsWithObjId.length);
  
  await client.close();
}

query().catch(console.error);
