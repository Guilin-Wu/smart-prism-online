import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useApp } from '@/contexts/AppContext';
import dynamic from 'next/dynamic';

// 动态导入 ECharts（仅在客户端加载）
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function DashboardPage({ user }) {
  const router = useRouter();
  const { examId } = router.query;
  const {
    studentsData,
    statistics,
    dynamicSubjectList,
    subjectConfigs,
    currentClassFilter,
    setStatistics,
    setDynamicSubjectList,
    setSubjectConfigs,
    loadExamData,
    getFilteredData,
  } = useApp();

  const [chartOptions, setChartOptions] = useState({});
  const [loading, setLoading] = useState(true);

  // 加载考试数据和统计数据
  useEffect(() => {
    if (examId) {
      loadExamDataAndStatistics(examId);
    }
  }, [examId]);

  // 当数据变化时重新渲染图表
  useEffect(() => {
    if (studentsData.length > 0 && dynamicSubjectList.length > 0) {
      renderCharts();
    }
  }, [studentsData, currentClassFilter, dynamicSubjectList]);

  const loadExamDataAndStatistics = async (examId) => {
    setLoading(true);
    try {
      // 加载考试数据
      await loadExamData(examId);
      
      // 加载统计数据
      const res = await fetch(`/api/exams/${examId}/statistics`);
      if (res.ok) {
        const data = await res.json();
        setStatistics(data.statistics || {});
        setDynamicSubjectList(data.subjectList || []);
        setSubjectConfigs(data.subjectConfigs || {});
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderCharts = () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0 || dynamicSubjectList.length === 0) return;
    
    // 箱形图数据
    const boxplotData = dynamicSubjectList.map(subject => {
      const scores = filteredData
        .map(s => s.scores?.[subject])
        .filter(score => typeof score === 'number' && !isNaN(score))
        .sort((a, b) => a - b);
      
      if (scores.length === 0) return null;
      
      const q1 = scores[Math.floor(scores.length * 0.25)];
      const median = scores[Math.floor(scores.length * 0.5)];
      const q3 = scores[Math.floor(scores.length * 0.75)];
      const min = scores[0];
      const max = scores[scores.length - 1];
      
      return [min, q1, median, q3, max];
    }).filter(Boolean);

    // 雷达图数据（平均分）
    const radarData = dynamicSubjectList.map(subject => {
      const stat = statistics[subject];
      return stat ? stat.average : 0;
    });

    setChartOptions({
      boxplot: {
        title: { text: '全科分数分布箱形图', left: 'center' },
        tooltip: { trigger: 'item' },
        xAxis: {
          type: 'category',
          data: dynamicSubjectList,
          boundaryGap: true,
          nameGap: 30,
          splitArea: { show: false },
          splitLine: { show: false },
        },
        yAxis: { type: 'value', name: '分数' },
        series: [{
          name: '分数分布',
          type: 'boxplot',
          data: boxplotData,
          itemStyle: { color: '#667eea' },
        }],
      },
      radar: {
        title: { text: '各科平均分雷达图', left: 'center' },
        tooltip: {},
        radar: {
          indicator: dynamicSubjectList.map(subject => ({
            name: subject,
            max: subjectConfigs[subject]?.full || 100,
          })),
        },
        series: [{
          type: 'radar',
          data: [{
            value: radarData,
            name: '平均分',
            itemStyle: { color: '#667eea' },
          }],
        }],
      },
    });
  };

  const filteredData = getFilteredData();
  const totalStats = statistics.totalScore || {};
  const totalStudentCount = filteredData.length;
  const participantCount = totalStats.count || totalStudentCount;

  if (loading) {
    return (
      <Layout user={user}>
        <div>加载中...</div>
      </Layout>
    );
  }

  if (!examId || studentsData.length === 0) {
    return (
      <Layout user={user}>
        <div className="welcome-screen">
          <h2>欢迎使用智慧棱镜系统</h2>
          <p>请先上传考试数据或选择一个考试进行分析。</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>整体成绩分析 - 智慧棱镜系统</title>
      </Head>
      <Layout user={user}>
        <div className="dashboard-container">
          <h1>整体成绩分析</h1>
          {currentClassFilter !== 'ALL' && (
            <p className="filter-indicator">当前筛选: {currentClassFilter}</p>
          )}

          {/* KPI 卡片 */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <h3>总人数</h3>
              <div className="value">{totalStudentCount}</div>
            </div>
            <div className="kpi-card">
              <h3>考试人数</h3>
              <div className="value">{participantCount}</div>
            </div>
            <div className="kpi-card">
              <h3>原始总分均分</h3>
              <div className="value">{totalStats.average?.toFixed(2) || 0}</div>
            </div>
            <div className="kpi-card">
              <h3>原始总分最高</h3>
              <div className="value">{totalStats.max || 0}</div>
            </div>
            <div className="kpi-card">
              <h3>原始总分最低</h3>
              <div className="value">{totalStats.min || 0}</div>
            </div>
            <div className="kpi-card">
              <h3>总分中位数</h3>
              <div className="value">{totalStats.median?.toFixed(2) || 0}</div>
            </div>
          </div>

          {/* 统计表 */}
          <div className="stats-table-container">
            <h3>全科统计表</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>科目</th>
                    <th>考试人数</th>
                    <th>平均分</th>
                    <th>最高分</th>
                    <th>中位数</th>
                    <th>标准差</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="total-row">
                    <td><strong>总分</strong></td>
                    <td>{totalStats.count || 0}</td>
                    <td>{totalStats.average?.toFixed(2) || 0}</td>
                    <td>{totalStats.max || 0}</td>
                    <td>{totalStats.median?.toFixed(2) || 0}</td>
                    <td>{totalStats.stdDev?.toFixed(2) || 0}</td>
                  </tr>
                  {dynamicSubjectList.map(subject => {
                    const subjectStats = statistics[subject] || {};
                    return (
                      <tr key={subject}>
                        <td><strong>{subject}</strong></td>
                        <td>{subjectStats.count || 0}</td>
                        <td>{subjectStats.average?.toFixed(2) || 0}</td>
                        <td>{subjectStats.max || 0}</td>
                        <td>{subjectStats.median?.toFixed(2) || 0}</td>
                        <td>{subjectStats.stdDev?.toFixed(2) || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 图表 */}
          <div className="charts-grid">
            <div className="chart-card">
              <h4>全科分数分布箱形图</h4>
              {chartOptions.boxplot && (
                <ReactECharts
                  option={chartOptions.boxplot}
                  style={{ height: '400px' }}
                />
              )}
            </div>
            <div className="chart-card">
              <h4>各科平均分雷达图</h4>
              {chartOptions.radar && (
                <ReactECharts
                  option={chartOptions.radar}
                  style={{ height: '400px' }}
                />
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
          }

          .welcome-screen {
            text-align: center;
            padding: 60px 20px;
          }

          .welcome-screen h2 {
            color: #333;
            margin-bottom: 20px;
          }

          .filter-indicator {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
          }

          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .kpi-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .kpi-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #666;
            font-weight: normal;
          }

          .kpi-card .value {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
          }

          .stats-table-container {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
          }

          .stats-table-container h3 {
            margin: 0 0 20px 0;
            color: #333;
          }

          .table-wrapper {
            overflow-x: auto;
            max-height: 500px;
            overflow-y: auto;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }

          th {
            background: #f5f5f5;
            font-weight: 600;
            position: sticky;
            top: 0;
          }

          .total-row {
            background: #f9f9f9;
            font-weight: 600;
          }

          .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
          }

          .chart-card {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .chart-card h4 {
            margin: 0 0 20px 0;
            color: #333;
          }
        `}</style>
      </Layout>
    </>
  );
}

