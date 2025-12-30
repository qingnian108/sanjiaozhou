const { MongoClient } = require('mongodb');
// 使用非 SRV 格式的连接字符串
const uri = 'mongodb://qingnian108:yang108879@cluster0-shard-00-00.siywi.mongodb.net:27017,cluster0-shard-00-01.siywi.mongodb.net:27017,cluster0-shard-00-02.siywi.mongodb.net:27017/sanjiaozhou?ssl=true&replicaSet=atlas-10xyqz-shard-0&authSource=admin&retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log('连接成功');
    const db = client.db('sanjiaozhou');
    const settings = await db.collection('data').find({ collection: 'settings' }).toArray();
    console.log('所有租户的设置:');
    settings.forEach(s => {
      console.log(`\n租户 ${s.tenantId}:`);
      console.log(JSON.stringify(s.data, null, 2));
    });
  } catch (err) {
    console.error('错误:', err.message);
  } finally {
    await client.close();
  }
}
run();
