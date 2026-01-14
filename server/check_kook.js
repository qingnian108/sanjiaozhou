const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sanjiaozhou').then(async () => {
  const Data = mongoose.model('Data', new mongoose.Schema({}, {strict: false}), 'datas');
  const docs = await Data.find({collection: 'kookChannels'});
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
