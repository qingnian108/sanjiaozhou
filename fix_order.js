// 修复订单的损耗计算
const API_BASE = 'http://101.43.70.216/api';

async function fixOrder() {
  const orderId = '69461bfde181a47688f70ded';
  
  // 从查询结果得知：
  // partialResults 消耗: 20000000 + 35000000 = 55000000
  // windowResults 消耗: 38030000 + 31887000 = 69917000
  // 总消耗: 55000000 + 69917000 = 124917000
  // 订单金额: 10000万 = 100000000
  // 损耗: 124917000 - 100000000 = 24917000
  
  const totalConsumed = 124917000;
  const loss = 24917000;
  
  try {
    const response = await fetch(`${API_BASE}/data/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2025-12-20',
        staffId: '6943c04e54fd48df64520ea2',
        amount: 10000,
        loss: loss,
        feePercent: 5,
        unitPrice: 65,
        status: 'completed',
        windowSnapshots: [
          {
            windowId: '6944d981da5a70acd1ca8425',
            machineId: '6944d97eda5a70acd1ca840b',
            windowNumber: '3号wx悬崖上的屎鱼丸',
            machineName: '13051818686 (玩家币)',
            startBalance: 160000000
          },
          {
            windowId: '694643ac663fc58dc4e2519f',
            machineId: '6944d97eda5a70acd1ca840b',
            windowNumber: '2号qq老鼠人哭死',
            machineName: '13051818686 (玩家币)',
            startBalance: 76507000
          }
        ],
        partialResults: [
          {
            windowId: '6944d97fda5a70acd1ca8421',
            windowNumber: '4号qq摸金校尉大钢牙',
            machineName: '13051818686 (玩家币)',
            staffId: '6943c04e54fd48df64520ea2',
            staffName: '李梓晨',
            startBalance: 20000000,
            endBalance: 0,
            consumed: 20000000,
            releasedAt: '2025-12-20T04:56:54.073Z'
          },
          {
            windowId: '6944d97fda5a70acd1ca840f',
            windowNumber: '2号qq云雾终会吹散',
            machineName: '13051818686 (玩家币)',
            staffId: '6943c04e54fd48df64520ea2',
            staffName: '李梓晨',
            startBalance: 35000000,
            endBalance: 0,
            consumed: 35000000,
            releasedAt: '2025-12-20T06:07:03.738Z'
          }
        ],
        windowResults: [
          {
            windowId: '6944d981da5a70acd1ca8425',
            endBalance: 121970000,
            consumed: 38030000
          },
          {
            windowId: '694643ac663fc58dc4e2519f',
            endBalance: 44620000,
            consumed: 31887000
          }
        ],
        totalConsumed: totalConsumed,
        executionHistory: [
          {
            staffId: '6943c04e54fd48df64520ea2',
            staffName: '李梓晨',
            amount: 10000,
            startTime: '2025-12-20',
            endTime: '2025-12-20T09:19:46.993Z'
          }
        ]
      })
    });
    
    const result = await response.json();
    console.log('修复结果:', result);
    
    if (result.success) {
      console.log('\n✅ 订单已修复！');
      console.log(`总消耗: ${totalConsumed} (${totalConsumed/10000} 万)`);
      console.log(`损耗: ${loss} (${loss/10000} 万)`);
      console.log(`损耗比: ${(loss / totalConsumed * 100).toFixed(2)}%`);
    }
  } catch (err) {
    console.error('修复失败:', err.message);
  }
}

fixOrder();
