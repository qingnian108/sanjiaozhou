const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');

async function q() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查最近的采购记录
  const purchases = await db.collection('datas').find({ 
    tenantId: '6943b29b54fd48df6451fc7f', 
    collection: 'purchases' 
  }).sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log('最近10条采购记录:');
  purchases.forEach(p => {
    console.log(p.data.date, (p.data.amount/10000) + '万', '¥' + p.data.cost, p.data.type || '', p.data.note || '');
  });
  
  await client.close();
}
q();
