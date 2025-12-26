const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function query() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  // 查询窗口
  const windows = await db.collection('cloudWindows').find({ tenantId }).toArray();
  console.log('=== 窗口数量:', windows.length);
  
  if (windows.length > 0) {
    console.log('窗口总余额:', windows.reduce((sum, w) => sum + w.goldBalance, 0) / 10000, '万');
    console.log('\n最近10个窗口:');
    windows.slice(-10).forEach(w => {
      console.log(`  #${w.windowNumber} - ${w.goldBalance/10000}万 - machineId: ${w.machineId}`);
    });
  }
  
  // 查询采购记录
  const purchases = await db.collection('purchases').find({ tenantId }).toArray();
  console.log('\n=== 采购记录数量:', purchases.length);
  
  if (purchases.length > 0) {
    purchases.forEach(p => {
      console.log(`  ${p.date} - ${p.amount/10000}万 - ¥${p.cost} - ${p.note || ''}`);
    });
    
    const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
    const totalCost = purchases.reduce((sum, p) => sum + p.cost, 0);
    console.log('\n采购总额:', totalAmount/10000, '万');
    console.log('采购总成本: ¥', totalCost);
  }
  
  // 查询云机
  const machines = await db.collection('cloudMachines').find({ tenantId }).toArray();
  console.log('\n=== 云机数量:', machines.length);
  if (machines.length > 0) {
    machines.forEach(m => {
      console.log(`  ${m.phone} - ${m.platform}`);
    });
  }
  
  // 查询订单
  const orders = await db.collection('orders').find({ tenantId }).toArray();
  console.log('\n=== 订单数量:', orders.length);
  
  await client.close();
}

query().catch(console.error);
