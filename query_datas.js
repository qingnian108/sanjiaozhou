const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询 datas 集合
  const allData = await db.collection('datas').find({ tenantId }).toArray();
  console.log('=== datas 集合中该租户的数据:', allData.length, '条');
  
  // 按 collection 字段分组
  const byCollection = {};
  allData.forEach(d => {
    const col = d.collection || 'unknown';
    if (!byCollection[col]) byCollection[col] = [];
    byCollection[col].push(d);
  });
  
  console.log('\n按 collection 分组:');
  for (const [col, list] of Object.entries(byCollection)) {
    console.log(`\n${col}: ${list.length} 条`);
    
    if (col === 'purchases') {
      list.forEach(p => {
        console.log(`  ${p.date} - ${(p.amount || 0)/10000}万 - ¥${p.cost || 0} - ${p.note || ''}`);
      });
    }
    
    if (col === 'cloudWindows') {
      const total = list.reduce((sum, w) => sum + (w.goldBalance || 0), 0);
      console.log(`  总余额: ${total/10000}万`);
    }
  }
  
  await client.close();
}

query().catch(console.error);
