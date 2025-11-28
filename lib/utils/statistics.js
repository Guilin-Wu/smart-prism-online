/**
 * 计算单个分数数组的统计数据
 */
function calculateStatsForScores(scores, full, pass, excel, good, superExcel, low) {
  if (!scores || scores.length === 0) {
    return {
      count: 0,
      average: 0,
      max: 0,
      min: 0,
      median: 0,
      stdDev: 0,
      passRate: 0,
      excellentRate: 0,
      goodRate: 0,
      failRate: 0,
    };
  }

  const count = scores.length;
  const sum = scores.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  
  // 中位数
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // 标准差
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  // 通过率、优秀率等
  const passCount = scores.filter(s => s >= pass).length;
  const excelCount = scores.filter(s => s >= excel).length;
  const goodCount = scores.filter(s => s >= good && s < excel).length;
  const failCount = scores.filter(s => s < pass).length;

  return {
    count,
    average: parseFloat(average.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    passRate: parseFloat((passCount / count * 100).toFixed(2)),
    excellentRate: parseFloat((excelCount / count * 100).toFixed(2)),
    goodRate: parseFloat((goodCount / count * 100).toFixed(2)),
    failRate: parseFloat((failCount / count * 100).toFixed(2)),
  };
}

/**
 * 计算所有统计数据
 */
export function calculateAllStatistics(studentsData, subjectList, subjectConfigs = {}) {
  if (!studentsData || studentsData.length === 0) return {};

  const stats = {};
  let totalFull = 0, totalPass = 0, totalExcel = 0, totalGood = 0;

  // 计算各科统计
  subjectList.forEach(subjectName => {
    const config = subjectConfigs[subjectName] || {};
    const full = config.full || 100;
    const pass = config.pass || (full * 0.6);
    const excel = config.excel || (full * 0.8);
    const good = config.good || (full * 0.7);

    const subjectScores = studentsData
      .map(s => s.scores?.[subjectName])
      .filter(score => typeof score === 'number' && !isNaN(score))
      .sort((a, b) => a - b);

    stats[subjectName] = calculateStatsForScores(
      subjectScores,
      full,
      pass,
      excel,
      good,
      config.superExcel || (full * 0.9),
      config.low || (full * 0.3)
    );
    stats[subjectName].name = subjectName;

    totalFull += full;
    totalPass += pass;
    totalExcel += excel;
    totalGood += good;
  });

  // 统计总分
  const totalScores = studentsData
    .map(s => s.totalScore)
    .filter(score => typeof score === 'number' && !isNaN(score))
    .sort((a, b) => a - b);

  stats['totalScore'] = calculateStatsForScores(
    totalScores,
    totalFull,
    totalPass,
    totalExcel,
    totalGood
  );
  stats['totalScore'].name = '总分';

  return stats;
}

/**
 * 计算标准分
 */
export function calculateStandardScores(students, stats, subjectList) {
  return students.map(student => {
    const tScores = {};
    const zScores = {};

    subjectList.forEach(subject => {
      const stat = stats[subject];
      const score = student.scores?.[subject];

      if (stat && stat.stdDev > 0 && typeof score === 'number') {
        const z = (score - stat.average) / stat.stdDev;
        const t = 50 + (10 * z);

        zScores[subject] = parseFloat(z.toFixed(2));
        tScores[subject] = parseFloat(t.toFixed(1));
      }
    });

    return {
      ...student,
      tScores,
      zScores,
    };
  });
}

