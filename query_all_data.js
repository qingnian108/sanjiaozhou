const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  // 查询所有采购记录
  const purchases = await db.collection('purchases').find({}).toArray();
  console.log('=== 所有采购记录数量:', purchases.length);
  
  // 按tenantId分组
  const byTenant = {};
  purchases.forEach(p => {
    const tid = p.tenantId || 'no-tenant';
    if (!byTenant[tid]) byTenant[tid] = [];
    byTenant[tid].push(p);
  });
  
  console.log('\n按租户分组:');
  for (const [tid, list] of Object.entries(byTenant)) {
    console.log(`\n租户 ${tid}: ${list.length} 条记录`);
    list.slice(0, 5).forEach(p => {
      console.log(`  ${p.date} - ${p.amount/10000}万 - ¥${p.cost} - ${p.note || ''}`);
    });
    if (list.length > 5) console.log(`  ... 还有 ${list.length - 5} 条`);
  }
  
  // 查询所有窗口
  const windows = await db.collection('cloudWindows').find({}).toArray();
  console.log('\n\n=== 所有窗口数量:', windows.length);
  
  const windowsByTenant = {};
  windows.forEach(w => {
    const tid = w.tenantId || 'no-tenant';
    if (!windowsByTenant[tid]) windowsByTenant[tid] = [];
    windowsByTenant[tid].push(w);
  });
  
  console.log('\n窗口按租户分组:');
  for (const [tid, list] of Object.entries(windowsByTenant)) {
    const total = list.reduce((sum, w) => sum + w.goldBalance, 0);
    console.log(`租户 ${tid}: ${list.length} 个窗口, 总余额 ${total/10000}万`);
  }
  
  await client.close();
}

query().catch(console.error);
