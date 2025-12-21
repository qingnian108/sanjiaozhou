const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou')
  .then(async () => {
    // 查找用户
    const user = await mongoose.connection.db.collection('users').findOne({ username: '19069571107' });
    console.log('用户信息:', JSON.stringify(user, null, 2));
    
    if (user) {
      const tenantId = user.tenantId;
      console.log('\ntenantId:', tenantId);
      
      // 查找该租户的窗口
      const windows = await mongoose.connection.db.collection('datas').find({ 
        collection: 'cloudWindows', 
        tenantId: tenantId 
      }).toArray();
      console.log('\n窗口数量:', windows.length);
      console.log('窗口详情:', JSON.stringify(windows, null, 2));
      
      // 查找该租户的云机
      const machines = await mongoose.connection.db.collection('datas').find({ 
        collection: 'cloudMachines', 
        tenantId: tenantId 
      }).toArray();
      console.log('\n云机数量:', machines.length);
      console.log('云机详情:', JSON.stringify(machines, null, 2));
      
      // 查找该租户的采购记录
      const purchases = await mongoose.connection.db.collection('datas').find({ 
        collection: 'purchases', 
        tenantId: tenantId 
      }).toArray();
      console.log('\n采购记录数量:', purchases.length);
      console.log('采购记录:', JSON.stringify(purchases, null, 2));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
