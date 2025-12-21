const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ username: String, tenantId: String, role: String }));
  
  const admins = await User.find({ role: 'admin' }).limit(5);
  console.log('=== 管理员列表 ===');
  admins.forEach(a => {
    console.log(a.username, '->', a.tenantId);
  });
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
});
