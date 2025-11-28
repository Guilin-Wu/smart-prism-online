import jwt from 'jsonwebtoken';
import { User } from './models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// 生成 JWT Token
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRE,
    }
  );
}

// 验证 JWT Token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 从请求中获取用户信息
export async function getCurrentUser(req) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ||
                  req.cookies?.token ||
                  req.headers.cookie?.split('token=')[1]?.split(';')[0];
    
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    const user = await User.findById(decoded.id);
    return user;
  } catch (error) {
    return null;
  }
}

// 中间件：验证用户身份
export async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  
  req.user = user;
  next();
}

