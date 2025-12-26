const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function fix() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  
  const tenantId = '6945f7c8cf0a8387f1edd6a8';
  
  // 获取所有窗口
  const windows = await db.collection('datas').find({ 
    tenantId, 
    collection: 'cloudWindows' 
  }).toArray();
  
  // 获取所有采购记录
  const purchases = await db.collection('datas').find({ 
    tenantId, 
    collection: 'purchases' 
  }).toArray();
  
  console.log('=== 当前状态:');
  console.log('窗口数量:', windows.length);
  console.log('采购记录数量:', purchases.length);
  
  // 计算窗口总余额
  const totalWindowGold = windows.reduce((sum, w) => sum + (w.data?.goldBalance || 0), 0);
  console.log('窗口总余额:', totalWindowGold / 10000, '万');
  
  // 计算采购记录总额（只算正常采购和转入）
  const purchaseTotal = purchases.reduce((sum, p) => {
    const amount = p.data?.amount || 0;
    return sum + amount;
  }, 0);
  console.log('采购记录总额:', purchaseTotal / 10000, '万');
  
  // 计算平均成本
  const validPurchases = purchases.filter(p => {
    const type = p.data?.type;
    return !type || type === 'transfer_in';
  });
  const totalAmount = validPurchases.reduce((sum, p) => sum + (p.data?.amount || 0), 0);
  const totalCost = validPurchases.reduce((sum, p) => sum + (p.data?.cost || 0), 0);
  const avgCost = totalAmount > 0 ? totalCost / (totalAmount / 10000000) : 29;
  console.log('平均成本:', avgCost.toFixed(2), '元/千万');
  
  // 找出没有对应采购记录的窗口
  // 通过创建时间匹配：如果窗口创建时间附近没有采购记录，就需要补
  const missingWindows = [];
  
  for (const w of windows) {
    const windowCreatedAt = w.createdAt ? new Date(w.createdAt) : null;
    const goldBalance = w.data?.goldBalance || 0;
    
    if (!windowCreatedAt || goldBalance <= 0) continue;
    
    // 检查是否有对应的采购记录（同一天，金额相近）
    const windowDate = windowCreatedAt.toISOString().split('T')[0];
    const hasPurchase = purchases.some(p => {
      const pDate = p.data?.date;
      const pAmount = p.data?.amount || 0;
      // 同一天，金额差距在10%以内
      return pDate === windowDate && Math.abs(pAmount - goldBalance) < goldBalance * 0.1;
    });
    
    if (!hasPurchase) {
      missingWindows.push({
        windowNumber: w.data?.windowNumber,
        goldBalance,
        createdAt: windowCreatedAt,
        date: windowDate
      });
    }
  }
  
  console.log('\n=== 缺失采购记录的窗口:', missingWindows.length, '个');
  
  if (missingWindows.length === 0) {
    console.log('没有需要补充的采购记录');
    await client.close();
    return;
  }
  
  // 按日期分组
  const byDate = {};
  missingWindows.forEach(w => {
    if (!byDate[w.date]) byDate[w.date] = [];
    byDate[w.date].push(w);
  });
  
  console.log('\n按日期分组:');
  for (const [date, list] of Object.entries(byDate)) {
    const total = list.reduce((sum, w) => sum + w.goldBalance, 0);
    console.log(`  ${date}: ${list.length} 个窗口, 总额 ${total/10000}万`);
  }
  
  // 创建补充的采购记录
  console.log('\n=== 开始补充采购记录...');
  
  for (const [date, list] of Object.entries(byDate)) {
    const totalGold = list.reduce((sum, w) => sum + w.goldBalance, 0);
    const cost = (totalGold / 10000000) * avgCost;
    
    const purchaseDoc = {
      collection: 'purchases',
      tenantId,
      data: {
        date,
        amount: totalGold,
        cost: Math.round(cost * 100) / 100,
        note: `补录：${list.length}个窗口`
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('datas').insertOne(purchaseDoc);
    console.log(`  已补充 ${date}: ${totalGold/10000}万, ¥${cost.toFixed(2)}`);
  }
  
  console.log('\n=== 完成！');
  
  // 验证
  const newPurchases = await db.collection('datas').find({ 
    tenantId, 
    collection: 'purchases' 
  }).toArray();
  console.log('新采购记录数量:', newPurchases.length);
  
  await client.close();
}

fix().catch(console.error);
