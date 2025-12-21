const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou')
  .then(async () => {
    const tenantId = '6945f7c8cf0a8387f1edd6a8'; // 19069571107 的 tenantId
    const orphanWindowId = '6944c591da5a70acd1ca37bf';
    
    // 创建一个新云机
    const newMachine = {
      collection: 'cloudMachines',
      tenantId: tenantId,
      data: {
        phone: '转让窗口',
        platform: '好友转让',
        loginType: 'code'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await mongoose.connection.db.collection('datas').insertOne(newMachine);
    const newMachineId = result.insertedId.toString();
    console.log('新云机ID:', newMachineId);
    
    // 更新孤儿窗口的 machineId
    await mongoose.connection.db.collection('datas').updateOne(
      { _id: new mongoose.Types.ObjectId(orphanWindowId) },
      { 
        $set: { 
          'data.machineId': newMachineId,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('窗口已更新，关联到新云机');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
