export interface PurchaseRecord {
  id: string;
  date: string;
  amount: number; // in 'wan' (10k)
  cost: number; // total CNY
}

export interface Staff {
  id: string;
  name: string;
  joinedDate: string;
  username?: string; // 登录用户名
  password?: string; // 密码
  role: 'admin' | 'staff'; // 角色
}

export interface OrderRecord {
  id: string;
  date: string;
  staffId: string;
  amount: number; // Order amount (Wan) - Generates Revenue
  loss: number;   // Extra shrinkage/loss (Wan) - Adds to COGS but no Revenue
  feePercent: number;
  unitPrice: number; // CNY per 1000 wan (Specific to this order)
  status: 'pending' | 'completed'; // 订单状态：进行中 | 已完成
  windowSnapshots?: WindowSnapshot[]; // 订单开始时的窗口快照
  windowResults?: WindowResult[]; // 订单结束时的窗口结果
  totalConsumed?: number; // 总消耗
}

// 订单开始时的窗口快照
export interface WindowSnapshot {
  windowId: string;
  machineId: string;
  windowNumber: string;
  machineName: string; // 云机名称（手机号+平台）
  startBalance: number; // 开始时哈佛币
}

// 订单结束时的窗口结果
export interface WindowResult {
  windowId: string;
  endBalance: number; // 结束时哈佛币
  consumed: number; // 消耗 = startBalance - endBalance
}

export interface Settings {
  employeeCostRate: number; // CNY per 1000 wan (Labor cost)
  orderUnitPrice: number; // CNY per 1000 wan (Default value for new orders)
  defaultFeePercent: number;
  initialCapital: number;
}

// Aggregated stats for a specific day
export interface DailyStats {
  id: string; // use date as id
  date: string;
  orderAmount: number; // Total order volume
  lossAmount: number; // Total waste
  revenue: number;
  employeeCost: number;
  cogs: number; // Cost of Goods Sold (Order + Loss) * AvgCost
  profit: number;
  inventoryAfter: number;
  orderCount: number; // How many orders that day
}

export interface GlobalStats {
  totalPurchased: number;
  totalCost: number;
  avgCostPer1000: number;
  currentInventory: number;
  inventoryValue: number;
  totalProfit: number;
  currentCash: number;
  totalAssets: number;
}

// Helper type for Staff Report
export interface StaffStats {
  staff: Staff;
  totalOrders: number;
  totalAmount: number;
  totalLoss: number;
  totalLaborCostEarned: number;
}

// Kook频道
export interface KookChannel {
  id: string;
  phone: string;
  userId: string; // 使用人 (staffId)
  nickname: string;
}

// 云机
export interface CloudMachine {
  id: string;
  phone: string;
  platform: string; // 平台（自定义）
}

// 云机窗口
export interface CloudWindow {
  id: string;
  machineId: string; // 所属云机
  windowNumber: string; // 窗口号
  goldBalance: number; // 窗口哈佛币余额
  userId: string | null; // 使用人 (staffId)，null 表示空闲
}
