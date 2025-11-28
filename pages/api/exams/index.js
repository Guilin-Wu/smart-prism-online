import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function handler(req, res) {
  await requireAuth(req, res, async () => {
    if (req.method === 'GET') {
      try {
        const exams = await query(
          'SELECT id, name, exam_date, description, created_at, updated_at FROM exams WHERE user_id = ? ORDER BY created_at DESC',
          [req.user.id]
        );
        
        return res.status(200).json({ exams });
      } catch (error) {
        console.error('获取考试列表错误:', error);
        return res.status(500).json({ error: '服务器错误' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { name, exam_date, description } = req.body;
        
        const result = await query(
          'INSERT INTO exams (user_id, name, exam_date, description) VALUES (?, ?, ?, ?)',
          [req.user.id, name, exam_date || null, description || null]
        );
        
        return res.status(201).json({ 
          message: '创建成功',
          examId: result.insertId 
        });
      } catch (error) {
        console.error('创建考试错误:', error);
        return res.status(500).json({ error: '服务器错误' });
      }
    }

    return res.status(405).json({ error: '方法不允许' });
  });
}

