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
  tenantId: string; // 租户ID（管理员的ID）
}

export interface OrderRecord {
  id: string;
  date: string;
  staffId: string;
  amount: number; // Order amount (Wan) - Generates Revenue
  loss: number;   // Extra shrinkage/loss (Wan) - Adds to COGS but no Revenue
  feePercent: number;
  unitPrice: number; // CNY per 1000 wan (Specific to this order)
  status: 'pending' | 'paused' | 'completed'; // 订单状态：进行中 | 暂停 | 已完成
  windowSnapshots?: WindowSnapshot[]; // 订单开始时的窗口快照
  windowResults?: WindowResult[]; // 订单结束时的窗口结果
  totalConsumed?: number; // 总消耗
  completedAmount?: number; // 已完成金额（暂停时记录）
  executionHistory?: OrderExecution[]; // 执行历史（多人协作时）
}

// 订单执行记录（支持多人协作）
export interface OrderExecution {
  staffId: string;
  staffName: string;
  amount: number; // 该员工完成的金额
  startTime: string;
  endTime?: string;
}

// 订单开始时的窗口快照
export interface WindowSnapshot {
  windowId: string;
  machineId: string;
  windowNumber: string;
  machineName: string; // 云机名称（手机号+平台）
  startBalance: number; // 开始时哈夫币
}

// 订单结束时的窗口结果
export interface WindowResult {
  windowId: string;
  endBalance: number; // 结束时哈夫币
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
  goldBalance: number; // 窗口哈夫币余额
  userId: string | null; // 使用人 (staffId)，null 表示空闲
}


// 窗口申请
export interface WindowRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: 'apply' | 'release'; // 申请类型：申请新窗口 | 释放窗口
  windowId?: string; // 释放时指定窗口ID
  status: 'pending' | 'approved' | 'rejected'; // 状态
  createdAt: string;
  processedAt?: string;
  processedBy?: string; // 处理人（管理员ID）
  note?: string; // 备注
}

// 窗口充值记录
export interface WindowRecharge {
  id: string;
  windowId: string;
  amount: number; // 充值金额
  balanceBefore: number; // 充值前余额
  balanceAfter: number; // 充值后余额
  createdAt: string;
  createdBy: string; // 操作人
}
