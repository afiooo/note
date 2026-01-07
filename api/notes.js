import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const DB_KEY = "user_secure_notes_v2"; // 升级key，避免和旧数据冲突

  // --- 1. 密码拦截 (核心新增) ---
  // 从请求头获取密码
  const authHeader = req.headers.get('Authorization');
  const correctPassword = process.env.NOTES_PASSWORD; 

  // 如果没有设置环境变量密码，则默认不拦截（或者你可以强制要求设置）
  if (correctPassword && authHeader !== correctPassword) {
    return new Response(JSON.stringify({ error: '密码错误或未授权' }), { status: 401 });
  }

  // --- 2. 业务逻辑 ---
  if (req.method === 'POST') {
    try {
      const data = await req.json();
      // 简单存储，合并逻辑交给前端做，后端只负责“保存最新的完整快照”
      await redis.set(DB_KEY, JSON.stringify(data));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      return new Response('Save Error', { status: 500 });
    }
  }

  try {
    const data = await redis.get(DB_KEY);
    return new Response(JSON.stringify(data || {}), { status: 200, headers: {'Content-Type': 'application/json'} });
  } catch (err) {
    return new Response(JSON.stringify({}), { status: 200 });
  }
}
