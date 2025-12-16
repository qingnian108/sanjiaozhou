import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'cloud1-8gyj5ce4db7ce0ee';

const app = cloudbase.init({
  env: ENV_ID
});

export const auth = app.auth({
  persistence: 'local'
});

export const db = app.database();

// 匿名登录函数
export const signInAnonymously = async () => {
  // 尝试不同的 API 方式
  if (typeof (auth as any).signInAnonymously === 'function') {
    return (auth as any).signInAnonymously();
  }
  if (typeof (auth as any).anonymousAuthProvider === 'function') {
    return (auth as any).anonymousAuthProvider().signIn();
  }
  // 如果都不行，尝试直接获取匿名登录
  const provider = (auth as any).anonymousAuthProvider?.() || (auth as any).getAnonymousAuthProvider?.();
  if (provider && typeof provider.signIn === 'function') {
    return provider.signIn();
  }
  throw new Error('无法进行匿名登录，请检查 CloudBase SDK 版本');
};

export default app;
