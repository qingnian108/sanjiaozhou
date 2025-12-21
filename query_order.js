// 通过 API 查询订单
const API_BASE = 'http://101.43.70.216/api';

async function queryOrders() {
  try {
    // 从截图看到员工名字是"李梓晨"，尝试搜索用户
    // 先尝试获取超管的租户列表
    const tenantsRes = await fetch(`${API_BASE}/super/tenants`);
    const tenantsData = await tenantsRes.json();
    console.log('租户列表:', JSON.stringify(tenantsData, null, 2));
    
    if (tenantsData.success && tenantsData.data) {
      // 遍历每个租户查找订单
      for (const tenant of tenantsData.data) {
        console.log(`\n查询租户 ${tenant.name || tenant.username} (${tenant.tenantId}) 的订单...`);
        const ordersRes = await fetch(`${API_BASE}/data/orders/${tenant.tenantId}`);
        const ordersData = await ordersRes.json();
        
        if (ordersData.success && ordersData.data) {
          // 查找今天金额为10000万的订单
          const targetOrders = ordersData.data.filter(o => 
            o.date === '2025-12-20' && o.amount === 10000
          );
          
          if (targetOrders.length > 0) {
            console.log('\n========== 找到目标订单 ==========');
            for (const order of targetOrders) {
              console.log(JSON.stringify(order, null, 2));
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('请求失败:', err.message);
  }
}

queryOrders();
