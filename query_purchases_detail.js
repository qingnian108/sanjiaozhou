const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询采购记录的完整数据
  const purchases = await db.collection('datas').find({ 
    tenantId, 
    collection: 'purchases' 
  }).toArray();
  
  console.log('=== 采购记录详情:');
  purchases.forEach((p, i) => {
    console.log(`\n--- 记录 ${i + 1} ---`);
    console.log(JSON.stringify(p, null, 2));
  });
  
  // 查询窗口数据
  console.log('\n\n=== 窗口数据:');
  const windows = await db.collection('datas').find({ 
    tenantId, 
    collection: 'cloudWindows' 
  }).toArray();
  
  windows.slice(0, 5).forEach((w, i) => {
    console.log(`\n--- 窗口 ${i + 1} ---`);
    console.log(JSON.stringify(w, null, 2));
  });
  
  await client.close();
}

query().catch(console.error);
