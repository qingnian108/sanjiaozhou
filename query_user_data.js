const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查询用户
  const user = await db.collection('users').findOne({ username: '13051818686' });
  console.log('=== 用户信息:');
  console.log(user);
  
  if (user && user.tenantId) {
    const tenantId = user.tenantId;
    console.log('\n租户ID:', tenantId);
    
    // 查询该租户的所有数据
    const collections = ['cloudWindows', 'cloudMachines', 'purchases', 'orders', 'staff', 'settings'];
    
    for (const col of collections) {
      const data = await db.collection(col).find({ tenantId }).toArray();
      console.log(`\n=== ${col}: ${data.length} 条`);
      
      if (col === 'purchases' && data.length > 0) {
        data.forEach(p => {
          console.log(`  ${p.date} - ${(p.amount || 0)/10000}万 - ¥${p.cost || 0} - ${p.note || ''}`);
        });
      }
      
      if (col === 'cloudWindows' && data.length > 0) {
        const total = data.reduce((sum, w) => sum + (w.goldBalance || 0), 0);
        console.log(`  总余额: ${total/10000}万`);
        console.log(`  最近5个窗口:`);
        data.slice(-5).forEach(w => {
          console.log(`    #${w.windowNumber} - ${(w.goldBalance || 0)/10000}万`);
        });
      }
      
      if (col === 'cloudMachines' && data.length > 0) {
        data.forEach(m => {
          console.log(`  ${m.phone} - ${m.platform}`);
        });
      }
    }
  }
  
  await client.close();
}

query().catch(console.error);
