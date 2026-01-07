import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  // 你的数据钥匙
  const DB_KEY = "user_secure_notes_v2"; 

  // --- ❤️ 自动保活逻辑 (Vercel 会每天调这个接口) ---
  if (url.searchParams.get('heartbeat') === '1') {
    try {
      // 只要读取一次，Upstash 就认为你是活跃的，不会删除数据
      await redis.exists(DB_KEY); 
      console.log('Heartbeat check success');
      return new Response('Alive', { status: 200 });
    } catch(e) {
      return new Response('Error', { status: 500 });
    }
  }

  // --- 以下是正常笔记功能的逻辑 ---

  // 1. 密码拦截
  const authHeader = req.headers.get('Authorization');
  const correctPassword = process.env.NOTES_PASSWORD; 

  if (correctPassword && authHeader !== correctPassword) {
    return new Response(JSON.stringify({ error: '401' }), { status: 401 });
  }

  // 2. 保存数据 (POST)
  if (req.method === 'POST') {
    try {
      const data = await req.json();
      await redis.set(DB_KEY, JSON.stringify(data));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      return new Response('Save Error', { status: 500 });
    }
  }

  // 3. 读取数据 (GET)
  try {
    const data = await redis.get(DB_KEY);
    return new Response(JSON.stringify(data || {}), { status: 200, headers: {'Content-Type': 'application/json'} });
  } catch (err) {
    return new Response(JSON.stringify({}), { status: 200 });
  }
}
