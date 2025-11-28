import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { calculateAllStatistics } from '@/lib/utils/statistics';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: '未授权' });
    }

    const { id } = req.query;

    // 验证考试是否属于当前用户
    const exam = await query(
      'SELECT id FROM exams WHERE id = ? AND user_id = ?',
      [id, user.id]
    );

    if (exam.length === 0) {
      return res.status(404).json({ error: '考试不存在或无权限访问' });
    }

    // 获取学生数据
    const students = await query(
      `SELECT s.id, s.student_id, s.name, s.class_name, s.total_score, s.rank
       FROM students s
       WHERE s.exam_id = ?
       ORDER BY s.rank ASC`,
      [id]
    );

    // 获取科目成绩
    const subjectScores = await query(
      `SELECT ss.student_id, ss.subject_name, ss.score
       FROM subject_scores ss
       INNER JOIN students s ON ss.student_id = s.id
       WHERE s.exam_id = ?`,
      [id]
    );

    // 组织数据
    const studentsData = students.map(student => {
      const scores = {};
      subjectScores
        .filter(ss => ss.student_id === student.id)
        .forEach(ss => {
          scores[ss.subject_name] = ss.score;
        });

      return {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        class: student.class_name,
        totalScore: parseFloat(student.total_score) || 0,
        rank: student.rank,
        scores,
      };
    });

    // 获取科目列表
    const subjects = await query(
      `SELECT DISTINCT subject_name
       FROM subject_scores ss
       INNER JOIN students s ON ss.student_id = s.id
       WHERE s.exam_id = ?
       ORDER BY subject_name`,
      [id]
    );

    const subjectList = subjects.map(s => s.subject_name);

    // 获取科目配置（暂时使用默认值，后续可以从数据库读取）
    const subjectConfigs = {};
    subjectList.forEach(subject => {
      subjectConfigs[subject] = {
        full: 100,
        pass: 60,
        excel: 80,
        good: 70,
      };
    });

    // 计算统计数据
    const statistics = calculateAllStatistics(studentsData, subjectList, subjectConfigs);

    return res.status(200).json({
      statistics,
      subjectList,
      subjectConfigs,
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    return res.status(500).json({ error: '服务器错误' });
  }
}

