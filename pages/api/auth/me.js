import { getCurrentUser } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ error: '未授权' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

