import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children, user }) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentModule, setCurrentModule] = useState('dashboard');

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (err) {
      console.error('退出登录失败:', err);
    }
  };

  const modules = [
    { id: 'dashboard', name: '📈 整体成绩分析', path: '/dashboard' },
    { id: 'student', name: '👩‍🎓 学生个体报告', path: '/student' },
    { id: 'paper', name: '📝 试卷科目分析', path: '/paper' },
    { id: 'single-subject', name: '🎯 单科成绩分析', path: '/single-subject' },
    { id: 'boundary', name: '📊 临界生分析', path: '/boundary' },
    { id: 'holistic', name: '⚖️ 全科均衡分析', path: '/holistic' },
    { id: 'trend-distribution', name: '🌊 成绩分布变动', path: '/trend-distribution' },
    { id: 'groups', name: '🎯 学生分层筛选', path: '/groups' },
    { id: 'correlation', name: '🌡️ 学科关联矩阵', path: '/correlation' },
    { id: 'weakness', name: '📉 偏科诊断分析', path: '/weakness' },
    { id: 'trend', name: '🚀 成绩趋势对比', path: '/trend' },
    { id: 'item-analysis', name: '🔬 学科小题分析', path: '/item-analysis' },
    { id: 'ai-advisor', name: '🤖 AI 智能分析', path: '/ai-advisor' },
    { id: 'goal-setting', name: '🎯 目标与规划', path: '/goal-setting' },
    { id: 'exam-arrangement', name: '🧘 考场编排', path: '/exam-arrangement' },
    { id: 'study-groups', name: '🧩 智能互助分组', path: '/study-groups' },
    { id: 'comment-gen', name: '✍️ 评语生成助手', path: '/comment-gen' },
    { id: 'weakness-workbook', name: '📝 错题攻坚本', path: '/weakness-workbook' },
    { id: 'honor', name: '🏆 荣誉中心', path: '/honor' },
    { id: 'multi-exam', name: '📈 数据管理中心', path: '/multi-exam' },
  ];

  return (
    <div className="app-container">
      <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>🪞 智慧棱镜系统</h2>
          <p>SMART PRISM</p>
        </div>

        <div className="user-info">
          <p>{user?.name || user?.email}</p>
          <button onClick={handleLogout} className="logout-button">
            退出登录
          </button>
        </div>

        <ul className="nav-menu">
          <li>
            <Link href="/" className="nav-link">
              🏠 首页
            </Link>
          </li>
          <li>
            <Link href="/upload" className="nav-link">
              📊 上传数据
            </Link>
          </li>
          <hr />
          {modules.map((module) => (
            <li key={module.id}>
              <Link
                href={module.path}
                className={`nav-link ${router.pathname === module.path ? 'active' : ''}`}
              >
                {module.name}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </nav>

      <main className="main-content">
        {children}
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .sidebar {
          width: 250px;
          background: #2c3e50;
          color: white;
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: width 0.3s;
        }

        .sidebar.collapsed {
          width: 60px;
        }

        .sidebar.collapsed .sidebar-header h2,
        .sidebar.collapsed .sidebar-header p,
        .sidebar.collapsed .user-info,
        .sidebar.collapsed .nav-menu li span,
        .sidebar.collapsed .nav-menu li a {
          display: none;
        }

        .sidebar-header {
          margin-bottom: 20px;
        }

        .sidebar-header h2 {
          margin: 0 0 5px 0;
          font-size: 18px;
        }

        .sidebar-header p {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }

        .user-info {
          padding: 15px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .user-info p {
          margin: 0 0 10px 0;
          font-size: 14px;
        }

        .logout-button {
          width: 100%;
          padding: 8px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 12px;
        }

        .logout-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .nav-menu {
          list-style: none;
          padding: 0;
          margin: 0;
          flex: 1;
          overflow-y: auto;
        }

        .nav-menu hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          margin: 10px 0;
        }

        .nav-menu li {
          margin-bottom: 5px;
        }

        .nav-link {
          display: block;
          padding: 12px;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          transition: background 0.2s;
          font-size: 14px;
        }

        .nav-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-link.active {
          background: rgba(102, 126, 234, 0.8);
        }

        .sidebar-toggle {
          position: absolute;
          top: 20px;
          right: -15px;
          width: 30px;
          height: 30px;
          background: #2c3e50;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-content {
          flex: 1;
          padding: 40px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

