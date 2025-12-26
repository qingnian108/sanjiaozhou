const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/sanjiaozhou').then(async () => {
  const user = await mongoose.connection.db.collection('users').findOne({username: 'nolan'});
  console.log('User nolan:', JSON.stringify(user, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
