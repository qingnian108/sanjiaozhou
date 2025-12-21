const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou')
  .then(async () => {
    // 查找云机
    const machine = await mongoose.connection.db.collection('datas').findOne({ 
      _id: new mongoose.Types.ObjectId('6944c58dda5a70acd1ca37b0')
    });
    console.log('云机信息:', JSON.stringify(machine, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
