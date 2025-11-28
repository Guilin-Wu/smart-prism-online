import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import XLSX from 'xlsx';
import formidable from 'formidable';
import fs from 'fs';

// 禁用默认的 bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

// 解析 Excel 文件
function parseExcelFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  return data;
}

// 提取科目列表
function extractSubjects(data) {
  const subjects = new Set();
  const excludeKeys = ['学号', '姓名', '班级', '总分', '排名', 'student_id', 'name', 'class', 'total_score', 'rank'];
  
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!excludeKeys.includes(key) && row[key] !== null && row[key] !== undefined) {
        subjects.add(key);
      }
    });
  });
  
  return Array.from(subjects);
}

// 保存考试数据到数据库
async function saveExamData(userId, examName, examDate, rawData) {
  const subjects = extractSubjects(rawData);
  
  // 创建考试记录
  const examResult = await query(
    'INSERT INTO exams (user_id, name, exam_date) VALUES (?, ?, ?)',
    [userId, examName, examDate || null]
  );
  const examId = examResult.insertId;

  // 保存学生数据
  const students = [];
  for (const row of rawData) {
    const studentId = row['学号'] || row['student_id'] || null;
    const name = row['姓名'] || row['name'] || '';
    const className = row['班级'] || row['class'] || null;
    const totalScore = parseFloat(row['总分'] || row['total_score'] || 0);
    const rank = parseInt(row['排名'] || row['rank'] || 0);

    const studentResult = await query(
      'INSERT INTO students (exam_id, student_id, name, class_name, total_score, rank) VALUES (?, ?, ?, ?, ?, ?)',
      [examId, studentId, name, className, totalScore, rank]
    );
    
    const studentDbId = studentResult.insertId;
    students.push({ dbId: studentDbId, data: row });

    // 保存科目成绩
    for (const subject of subjects) {
      const score = parseFloat(row[subject] || 0);
      if (!isNaN(score)) {
        await query(
          'INSERT INTO subject_scores (student_id, subject_name, score) VALUES (?, ?, ?)',
          [studentDbId, subject, score]
        );
      }
    }
  }

  return { examId, students, subjects };
}

export default async function handler(req, res) {
  // 验证用户身份
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 解析表单数据
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const examName = Array.isArray(fields.examName) ? fields.examName[0] : fields.examName;
    const examDate = Array.isArray(fields.examDate) ? fields.examDate[0] : fields.examDate;
    
    if (!file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    // 验证文件类型
    if (!file.originalFilename.endsWith('.xlsx') && !file.originalFilename.endsWith('.xls')) {
      return res.status(400).json({ error: '仅支持 Excel 文件 (.xlsx, .xls)' });
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(file.filepath);

    // 解析 Excel
    const rawData = parseExcelFile(fileBuffer);
    
    // 删除临时文件
    fs.unlinkSync(file.filepath);
    
    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Excel 文件为空或格式不正确' });
    }

    // 保存到数据库
    const result = await saveExamData(
      user.id,
      examName || `考试_${new Date().toISOString().split('T')[0]}`,
      examDate || null,
      rawData
    );

    return res.status(200).json({
      message: '上传成功',
      examId: result.examId,
      studentsCount: result.students.length,
      subjects: result.subjects,
    });
  } catch (error) {
    console.error('上传文件错误:', error);
    return res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}

