import { PurchaseRecord, OrderRecord, Settings, DailyStats, GlobalStats, Staff, StaffStats } from './types';

export const calculateStats = (
  purchases: PurchaseRecord[],
  orders: OrderRecord[],
  settings: Settings
): { dailyStats: DailyStats[]; globalStats: GlobalStats } => {
  
  // 1. Calculate Global Average Cost
  const totalPurchased = purchases.reduce((acc, p) => acc + p.amount, 0);
  const totalCost = purchases.reduce((acc, p) => acc + p.cost, 0);
  const avgCostPerWan = totalPurchased > 0 ? totalCost / totalPurchased : 0;
  const avgCostPer1000 = avgCostPerWan * 1000;

  // 2. Sort Records
  const sortedPurchases = [...purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 3. Group Orders by Date to create DailyStats
  const ordersByDate: Record<string, OrderRecord[]> = {};
  const allDates = new Set<string>();
  
  sortedOrders.forEach(o => {
    if (!ordersByDate[o.date]) ordersByDate[o.date] = [];
    ordersByDate[o.date].push(o);
    allDates.add(o.date);
  });

  // Also include purchase dates in timeline logic if strictly needed, 
  // but for profit charts, we usually only care about activity days.
  // Let's stick to days with Orders for the chart.

  const sortedDates = Array.from(allDates).sort();
  const dailyStats: DailyStats[] = [];
  
  let totalConsumptionSoFar = 0; // Tracks (Order Amount + Loss)

  sortedDates.forEach(date => {
    const daysOrders = ordersByDate[date];
    
    let dailyOrderAmount = 0;
    let dailyLossAmount = 0;
    let dailyRevenue = 0;
    let dailyEmployeeCost = 0;

    daysOrders.forEach(o => {
      dailyOrderAmount += o.amount;
      dailyLossAmount += o.loss;
      
      // Rev = Amount * Price * (1 - fee)
      // Use specific order price if available, otherwise fallback to global setting (for legacy data compatibility)
      const price = o.unitPrice !== undefined ? o.unitPrice : settings.orderUnitPrice;
      const rev = (o.amount / 1000) * price * (1 - o.feePercent / 100);
      dailyRevenue += rev;

      // EmpCost = Amount * Rate
      const emp = (o.amount / 1000) * settings.employeeCostRate;
      dailyEmployeeCost += emp;
    });

    // COGS = (Amount + Loss) * AvgCost
    const totalDailyConsumed = dailyOrderAmount + dailyLossAmount;
    const dailyCogs = (totalDailyConsumed / 1000) * avgCostPer1000;

    const dailyProfit = dailyRevenue - dailyEmployeeCost - dailyCogs;

    // Inventory Calculation
    totalConsumptionSoFar += totalDailyConsumed;
    const purchasesUpToNow = sortedPurchases
      .filter(p => p.date <= date)
      .reduce((sum, p) => sum + p.amount, 0);
    const inventoryAfter = purchasesUpToNow - totalConsumptionSoFar;

    dailyStats.push({
      id: date,
      date,
      orderAmount: dailyOrderAmount,
      lossAmount: dailyLossAmount,
      revenue: dailyRevenue,
      employeeCost: dailyEmployeeCost,
      cogs: dailyCogs,
      profit: dailyProfit,
      inventoryAfter,
      orderCount: daysOrders.length
    });
  });

  // 4. Global Totals
  const totalConsumed = dailyStats.reduce((sum, d) => sum + d.orderAmount + d.lossAmount, 0);
  const currentInventoryFinal = totalPurchased - totalConsumed;
  const inventoryValue = (currentInventoryFinal / 1000) * avgCostPer1000;
  const totalProfit = dailyStats.reduce((sum, d) => sum + d.profit, 0);
  
  const currentCash = settings.initialCapital + totalProfit - inventoryValue;
  const totalAssets = currentCash + inventoryValue;

  const globalStats: GlobalStats = {
    totalPurchased,
    totalCost,
    avgCostPer1000,
    currentInventory: currentInventoryFinal,
    inventoryValue,
    totalProfit,
    currentCash,
    totalAssets
  };

  return { dailyStats, globalStats };
};

export const calculateStaffStats = (orders: OrderRecord[], staffList: Staff[], settings: Settings): StaffStats[] => {
  return staffList.map(staff => {
    let totalAmount = 0;
    let totalLoss = 0;
    let orderCount = 0;

    orders.forEach(order => {
      // 检查执行历史中是否有该员工的记录
      if (order.executionHistory && order.executionHistory.length > 0) {
        // 有执行历史，按历史记录计算
        const staffExecutions = order.executionHistory.filter(e => e.staffId === staff.id);
        if (staffExecutions.length > 0) {
          orderCount++;
          const staffAmount = staffExecutions.reduce((sum, e) => sum + e.amount, 0);
          totalAmount += staffAmount;
          // 损耗按比例分配
          const ratio = staffAmount / order.amount;
          totalLoss += order.loss * ratio;
        }
      } else if (order.staffId === staff.id) {
        // 没有执行历史，使用原逻辑
        orderCount++;
        totalAmount += order.amount;
        totalLoss += order.loss;
      }
    });

    const totalLaborCostEarned = (totalAmount / 1000) * settings.employeeCostRate;

    return {
      staff,
      totalOrders: orderCount,
      totalAmount,
      totalLoss,
      totalLaborCostEarned
    };
  });
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
};

export const formatNumber = (val: number) => {
  return new Intl.NumberFormat('en-US').format(val);
};

// 中文数字格式化：每4位分隔（万、亿）
export const formatChineseNumber = (num: number): string => {
  const str = Math.floor(num).toString();
  const result: string[] = [];
  let count = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    if (count > 0 && count % 4 === 0) {
      result.unshift(',');
    }
    result.unshift(str[i]);
    count++;
  }
  return result.join('');
};

// 哈夫币转万：显示时除以10000，带"万"单位
export const formatWan = (num: number): string => {
  const wan = num / 10000;
  // 如果是整数就不显示小数，否则保留2位
  const formatted = wan % 1 === 0 ? wan.toString() : wan.toFixed(2);
  return `${formatChineseNumber(parseFloat(formatted))} 万`;
};

// 哈夫币转万（只返回数字，不带单位）
export const toWan = (num: number): string => {
  const wan = num / 10000;
  const formatted = wan % 1 === 0 ? wan.toString() : wan.toFixed(2);
  return formatChineseNumber(parseFloat(formatted));
};
