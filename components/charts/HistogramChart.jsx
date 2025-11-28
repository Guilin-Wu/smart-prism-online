import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function HistogramChart({ 
  scores, 
  binSize = 10,
  title = '分数分布直方图',
  subjectName = '',
}) {
  if (!scores || scores.length === 0) {
    return <div>暂无数据</div>;
  }

  // 计算直方图数据
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const bins = [];
  const binCount = Math.ceil((max - min) / binSize);

  for (let i = 0; i < binCount; i++) {
    bins.push(0);
  }

  scores.forEach(score => {
    const binIndex = Math.floor((score - min) / binSize);
    const index = Math.min(binIndex, binCount - 1);
    bins[index]++;
  });

  const binLabels = bins.map((_, i) => {
    const start = min + i * binSize;
    const end = start + binSize;
    return `${start.toFixed(0)}-${end.toFixed(0)}`;
  });

  const option = {
    title: {
      text: title,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'category',
      data: binLabels,
      name: subjectName || '分数区间',
    },
    yAxis: {
      type: 'value',
      name: '人数',
    },
    series: [{
      name: '人数',
      type: 'bar',
      data: bins,
      itemStyle: {
        color: '#667eea',
      },
    }],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} />;
}

