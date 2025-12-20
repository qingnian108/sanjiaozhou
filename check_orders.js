const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('sanjiaozhou');
  const datas = await db.collection('datas').find({}).toArray();
  console.log(JSON.stringify(datas, null, 2));
  await client.close();
}

main();
