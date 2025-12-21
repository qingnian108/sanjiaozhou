const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const Data = mongoose.model('Data', new mongoose.Schema({ collection: String, tenantId: String, data: Object }), 'datas');
  
  // 获取第一个租户的数据
  const tenantId = '6943b29b54fd48df6451fc7f';
  
  const purchases = await Data.find({ collection: 'purchases', tenantId });
  const orders = await Data.find({ collection: 'orders', tenantId });
  const settingsDoc = await Data.findOne({ collection: 'settings', tenantId });
  
  console.log('=== 采购数据 ===');
  console.log('采购记录数:', purchases.length);
  let totalAmount = 0, totalCost = 0;
  purchases.forEach(p => {
    totalAmount += p.data?.amount || 0;
    totalCost += p.data?.cost || 0;
  });
  console.log('总采购量:', totalAmount);
  console.log('总成本:', totalCost);
  // Dashboard 的 avgCost 计算: totalCost / (totalAmount / 10000000)
  const avgCost = totalAmount > 0 ? totalCost / (totalAmount / 10000000) : 0;
  console.log('平均成本(元/千万):', avgCost);
  
  console.log('\n=== 订单数据 ===');
  const completedOrders = orders.filter(o => o.data?.status === 'completed');
  console.log('已完成订单数:', completedOrders.length);
  
  const settings = settingsDoc?.data || { orderUnitPrice: 60, employeeCostRate: 12 };
  console.log('设置:', JSON.stringify(settings));
  
  // 完全按照 Dashboard.tsx 的 totalProfit 计算
  let profit = 0;
  console.log('\n=== 订单明细 ===');
  completedOrders.forEach(o => {
    const amount = o.data?.amount || 0;
    const loss = o.data?.loss || 0;
    const lossInWan = loss / 10000;
    const unitPrice = o.data?.unitPrice !== undefined ? o.data.unitPrice : settings.orderUnitPrice;
    
    // Dashboard 的计算方式（没有手续费）
    const revenue = (amount / 1000) * unitPrice;
    const cogs = ((amount + lossInWan) / 1000) * avgCost;
    const laborCost = (amount / 1000) * settings.employeeCostRate;
    const orderProfit = revenue - cogs - laborCost;
    
    console.log('订单:', amount, '万, 损耗:', lossInWan.toFixed(2), '万, 单价:', unitPrice, ', 收入:', revenue.toFixed(2), ', 成本:', cogs.toFixed(2), ', 员工:', laborCost.toFixed(2), ', 利润:', orderProfit.toFixed(2));
    profit += orderProfit;
  });
  
  console.log('\n=== 总利润（Dashboard方式）===');
  console.log('计算的总利润:', profit.toFixed(2));
  
  // 今日订单
  const today = new Date().toISOString().split('T')[0];
  console.log('\n=== 今日:', today, '===');
  const todayOrders = completedOrders.filter(o => o.data?.date === today);
  console.log('今日已完成订单数:', todayOrders.length);
  
  let todayProfit = 0;
  todayOrders.forEach(o => {
    const amount = o.data?.amount || 0;
    const loss = o.data?.loss || 0;
    const lossInWan = loss / 10000;
    const unitPrice = o.data?.unitPrice !== undefined ? o.data.unitPrice : settings.orderUnitPrice;
    
    const revenue = (amount / 1000) * unitPrice;
    const cogs = ((amount + lossInWan) / 1000) * avgCost;
    const laborCost = (amount / 1000) * settings.employeeCostRate;
    todayProfit += revenue - cogs - laborCost;
  });
  console.log('今日利润:', todayProfit.toFixed(2));
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
});
