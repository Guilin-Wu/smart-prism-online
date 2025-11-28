import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function RadarChart({ 
  data, 
  subjects, 
  subjectConfigs = {},
  title = '雷达图',
  seriesName = '数据',
}) {
  if (!data || !subjects || subjects.length === 0) {
    return <div>暂无数据</div>;
  }

  const option = {
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {},
    radar: {
      indicator: subjects.map(subject => ({
        name: subject,
        max: subjectConfigs[subject]?.full || 100,
      })),
    },
    series: [{
      type: 'radar',
      data: [{
        value: data,
        name: seriesName,
        itemStyle: {
          color: '#667eea',
        },
        areaStyle: {
          color: 'rgba(102, 126, 234, 0.2)',
        },
      }],
    }],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} />;
}

