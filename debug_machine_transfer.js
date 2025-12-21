// 调试云机转让问题
// 运行: mongosh sanjiaozhou debug_machine_transfer.js

const targetTenantId = '6943b29b54fd48df6451fc7f';  // 13051818686

print('=== 1. 检查该租户的云机 ===');
db.datas.find({collection: 'cloudMachines', tenantId: targetTenantId}).forEach(doc => {
  print('Machine ID: ' + doc._id);
  print('Phone: ' + doc.data?.phone);
  print('Platform: ' + doc.data?.platform);
  print('---');
});

print('\n=== 2. 检查该租户的窗口 ===');
db.datas.find({collection: 'cloudWindows', tenantId: targetTenantId}).forEach(doc => {
  print('Window ID: ' + doc._id);
  print('Window Number: ' + doc.data?.windowNumber);
  print('Machine ID: ' + doc.data?.machineId);
  print('Gold: ' + doc.data?.gold);
  print('---');
});

print('\n=== 3. 检查窗口关联的云机是否存在 ===');
const windows = db.datas.find({collection: 'cloudWindows', tenantId: targetTenantId}).toArray();
const machineIds = [...new Set(windows.map(w => w.data?.machineId).filter(Boolean))];
print('窗口关联的云机ID列表: ' + JSON.stringify(machineIds));

machineIds.forEach(mid => {
  const machine = db.datas.findOne({_id: ObjectId(mid)});
  if (machine) {
    print('\n云机 ' + mid + ' 存在:');
    print('  所属租户: ' + machine.tenantId);
    print('  手机号: ' + machine.data?.phone);
    print('  平台: ' + machine.data?.platform);
  } else {
    print('\n云机 ' + mid + ' 不存在!');
  }
});

print('\n=== 4. 检查云机转让记录 ===');
db.machinetransfers.find({toTenantId: targetTenantId}).forEach(doc => {
  print('Transfer ID: ' + doc._id);
  print('From: ' + doc.fromTenantId + ' (' + doc.fromTenantName + ')');
  print('To: ' + doc.toTenantId + ' (' + doc.toTenantName + ')');
  print('Machine ID: ' + doc.machineId);
  print('Status: ' + doc.status);
  print('Window IDs: ' + JSON.stringify(doc.windowIds));
  print('Created: ' + doc.createdAt);
  print('---');
});

print('\n=== 5. 检查原云机是否还存在 ===');
db.machinetransfers.find({toTenantId: targetTenantId, status: 'accepted'}).forEach(doc => {
  const originalMachine = db.datas.findOne({_id: ObjectId(doc.machineId)});
  if (originalMachine) {
    print('原云机 ' + doc.machineId + ' 存在:');
    print('  所属租户: ' + originalMachine.tenantId);
    print('  手机号: ' + originalMachine.data?.phone);
  } else {
    print('原云机 ' + doc.machineId + ' 已被删除!');
  }
});
