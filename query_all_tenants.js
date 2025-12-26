const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查询所有租户
  const tenants = await db.collection('tenants').find({}).toArray();
  console.log('=== 所有租户:');
  tenants.forEach(t => {
    console.log(`ID: ${t._id} - ${t.name} - ${t.username}`);
  });
  
  // 查询所有用户
  console.log('\n=== 所有用户:');
  const users = await db.collection('users').find({}).toArray();
  users.forEach(u => {
    console.log(`ID: ${u._id} - ${u.username} - tenantId: ${u.tenantId}`);
  });
  
  await client.close();
}

query().catch(console.error);
