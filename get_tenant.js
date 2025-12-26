const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');

async function q() {
  await client.connect();
  const db = client.db('sanjiaozhou');
  const user = await db.collection('users').findOne({ username: '19069571107' });
  console.log('tenantId:', user ? user.tenantId : 'not found');
  await client.close();
}
q();
