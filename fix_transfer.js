// 计算转出方的平均币价
const fromTenantId = '6943b29b54fd48df6451fc7f';  // 13051818686
const toTenantId = '694548fa8c420efd9708819e';    // 18701174847

let totalAmount = 0;
let totalCost = 0;
db.datas.find({collection: 'purchases', tenantId: fromTenantId}).forEach(doc => {
  if (doc.data.amount > 0) {
    totalAmount += doc.data.amount;
    totalCost += doc.data.cost;
  }
});

const avgCostPerGold = totalAmount > 0 ? totalCost / totalAmount : 0;
print('转出方平均币价: ' + avgCostPerGold + ' 元/个');
print('换算: ' + (avgCostPerGold * 10000000).toFixed(2) + ' 元/千万');

// 窗口3的余额是3000万 = 30000000
const windowGold = 30000000;
const transferPrice = windowGold * avgCostPerGold;
print('窗口3余额: ' + windowGold + ' (' + (windowGold/10000000) + '千万)');
print('按平均币价计算的转让价格: ' + transferPrice.toFixed(2) + ' 元');

// 为转出方创建转让收入记录
const sellRecord = {
  collection: 'purchases',
  tenantId: fromTenantId,
  data: {
    date: '2025-12-19',
    amount: -windowGold,
    cost: -transferPrice,
    type: 'transfer_out',
    note: '转让窗口给 18701174847'
  }
};
db.datas.insertOne(sellRecord);
print('\n已为转出方创建转让收入记录');

// 为被转让方创建采购记录
const buyRecord = {
  collection: 'purchases',
  tenantId: toTenantId,
  data: {
    date: '2025-12-19',
    amount: windowGold,
    cost: transferPrice,
    type: 'transfer_in',
    note: '从 13051818686 接收窗口'
  }
};
db.datas.insertOne(buyRecord);
print('已为被转让方创建采购记录');

// 验证
print('\n=== 验证被转让方的采购记录 ===');
db.datas.find({collection: 'purchases', tenantId: toTenantId}).forEach(doc => {
  print(JSON.stringify(doc.data));
});
