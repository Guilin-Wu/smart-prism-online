import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function BoxPlotChart({ data, subjects, title = '分数分布箱形图' }) {
  if (!data || !subjects || subjects.length === 0) {
    return <div>暂无数据</div>;
  }

  const option = {
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const [min, q1, median, q3, max] = params.value;
        return `
          ${params.name}<br/>
          最小值: ${min}<br/>
          下四分位数: ${q1}<br/>
          中位数: ${median}<br/>
          上四分位数: ${q3}<br/>
          最大值: ${max}
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: subjects,
      boundaryGap: true,
      nameGap: 30,
      splitArea: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '分数',
    },
    series: [{
      name: '分数分布',
      type: 'boxplot',
      data: data,
      itemStyle: {
        color: '#667eea',
        borderColor: '#5568d3',
      },
    }],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} />;
}

