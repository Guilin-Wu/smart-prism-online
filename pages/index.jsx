import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout';

export default function HomePage({ user }) {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error('加载考试列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (err) {
      console.error('退出登录失败:', err);
    }
  };

  return (
    <>
      <Head>
        <title>智慧棱镜系统</title>
      </Head>
      <Layout user={user}>
        <div className="home-container">
          <div className="content-header">
            <h1>我的考试</h1>
            <Link href="/upload" className="upload-button">
              + 上传新数据
            </Link>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : exams.length === 0 ? (
            <div className="empty-state">
              <p>还没有考试数据</p>
              <Link href="/upload" className="upload-button">
                上传第一个考试数据
              </Link>
            </div>
          ) : (
            <div className="exams-grid">
              {exams.map((exam) => (
                <div key={exam.id} className="exam-card">
                  <h3>{exam.name}</h3>
                  {exam.exam_date && (
                    <p className="exam-date">
                      {new Date(exam.exam_date).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                  <div className="exam-actions">
                    <Link href={`/dashboard?examId=${exam.id}`}>
                      查看分析
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>

      <style jsx>{`
        .home-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .content-header h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
        }

        .upload-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .upload-button:hover {
          opacity: 0.9;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 8px;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 20px;
        }

        .exams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .exam-card {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .exam-card h3 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .exam-date {
          color: #666;
          font-size: 14px;
          margin: 0 0 15px 0;
        }

        .exam-actions a {
          display: inline-block;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
        }

        .exam-actions a:hover {
          background: #5568d3;
        }
      `}</style>
    </>
  );
}

