const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');

async function q() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查最近的窗口
  const windows = await db.collection('datas').find({ 
    tenantId: '6943b29b54fd48df6451fc7f', 
    collection: 'cloudWindows' 
  }).sort({ createdAt: -1 }).limit(5).toArray();
  
  console.log('最近5个窗口:');
  windows.forEach(w => {
    console.log('ID:', w._id);
    console.log('  windowNumber:', w.data?.windowNumber);
    console.log('  goldBalance:', w.data?.goldBalance);
    console.log('  createdAt:', w.createdAt);
    console.log('');
  });
  
  await client.close();
}
q();
