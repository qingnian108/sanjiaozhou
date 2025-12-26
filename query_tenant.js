const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询窗口
  const windows = await db.collection('cloudWindows').find({ tenantId }).toArray();
  console.log('=== 窗口数量:', windows.length);
  console.log('窗口总余额:', windows.reduce((sum, w) => sum + w.goldBalance, 0) / 10000, '万');
  
  // 查询采购记录
  const purchases = await db.collection('purchases').find({ tenantId }).toArray();
  console.log('\n=== 采购记录数量:', purchases.length);
  purchases.forEach(p => {
    console.log(`  ${p.date} - ${p.amount/10000}万 - ¥${p.cost} - ${p.note || ''}`);
  });
  
  // 计算采购总额
  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.cost, 0);
  console.log('\n采购总额:', totalPurchaseAmount / 10000, '万');
  console.log('采购总成本: ¥', totalPurchaseCost);
  
  // 查询云机
  const machines = await db.collection('cloudMachines').find({ tenantId }).toArray();
  console.log('\n=== 云机数量:', machines.length);
  
  // 最近添加的窗口
  console.log('\n=== 最近的窗口 (按创建时间):');
  const recentWindows = windows.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  }).slice(0, 10);
  
  recentWindows.forEach(w => {
    console.log(`  #${w.windowNumber} - ${w.goldBalance/10000}万 - 创建: ${w.createdAt || '无时间'}`);
  });
  
  await client.close();
}

query().catch(console.error);
