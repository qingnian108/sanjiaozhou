// 修复云机转让问题 - 为接收方创建云机记录
// 运行: mongosh sanjiaozhou fix_machine_transfer.js

const targetTenantId = '6943b29b54fd48df6451fc7f';  // 13051818686
const missingMachineId = '6947a6909c461875a622e5da';

// 从转让记录中获取原云机信息
const transfer = db.machinetransfers.findOne({
  toTenantId: targetTenantId,
  machineId: missingMachineId,
  status: 'accepted'
});

if (!transfer) {
  print('未找到转让记录');
  quit();
}

print('找到转让记录:');
print('  From: ' + transfer.fromTenantName);
print('  Machine Info: ' + JSON.stringify(transfer.machineInfo));

// 为接收方创建新的云机记录
const newMachine = {
  collection: 'cloudMachines',
  tenantId: targetTenantId,
  data: {
    phone: transfer.machineInfo?.phone || '转让云机',
    platform: transfer.machineInfo?.platform || '好友转让',
    loginType: transfer.machineInfo?.loginType || 'code',
    loginPassword: transfer.machineInfo?.loginPassword || ''
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

const result = db.datas.insertOne(newMachine);
const newMachineId = result.insertedId.toString();
print('\n已创建新云机记录: ' + newMachineId);
print('  Phone: ' + newMachine.data.phone);
print('  Platform: ' + newMachine.data.platform);

// 更新所有关联窗口的 machineId
const updateResult = db.datas.updateMany(
  {
    collection: 'cloudWindows',
    tenantId: targetTenantId,
    'data.machineId': missingMachineId
  },
  {
    $set: { 'data.machineId': newMachineId }
  }
);

print('\n已更新 ' + updateResult.modifiedCount + ' 个窗口的 machineId');

// 验证
print('\n=== 验证修复结果 ===');
print('该租户的云机:');
db.datas.find({collection: 'cloudMachines', tenantId: targetTenantId}).forEach(doc => {
  print('  ' + doc._id + ' - ' + doc.data?.phone + ' (' + doc.data?.platform + ')');
});

print('\n该租户的窗口 (按云机分组):');
const windows = db.datas.find({collection: 'cloudWindows', tenantId: targetTenantId}).toArray();
const byMachine = {};
windows.forEach(w => {
  const mid = w.data?.machineId || 'unknown';
  if (!byMachine[mid]) byMachine[mid] = [];
  byMachine[mid].push(w.data?.windowNumber);
});
Object.keys(byMachine).forEach(mid => {
  const machine = db.datas.findOne({_id: ObjectId(mid)});
  print('  云机 ' + mid + ' (' + (machine?.data?.phone || '未知') + '): ' + byMachine[mid].length + ' 个窗口');
});
