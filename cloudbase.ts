import cloudbase from '@cloudbase/js-sdk';

// 腾讯云 CloudBase 配置
const ENV_ID = 'cloud1-8gyj5ce4db7ce0ee';

const app = cloudbase.init({
  env: ENV_ID
});

export const auth = app.auth({
  persistence: 'local' // 本地持久化登录状态
});

export const db = app.database();

export default app;
