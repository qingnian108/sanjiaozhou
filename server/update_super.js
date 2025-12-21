const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou');

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  name: String,
  tenantId: String
});

const User = mongoose.model('User', UserSchema);

async function updateSuper() {
  const hash = await bcrypt.hash('yang108879+', 10);
  const result = await User.updateOne(
    { role: 'super' },
    { $set: { username: 'nolan', password: hash } }
  );
  console.log('Updated:', result);
  process.exit(0);
}

updateSuper();
