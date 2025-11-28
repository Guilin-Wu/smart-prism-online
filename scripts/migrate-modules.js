/**
 * 模块迁移辅助脚本
 * 用于从 script.js 提取函数到对应的模块文件
 * 
 * 使用方法：
 * node scripts/migrate-modules.js <module-name>
 * 
 * 例如：
 * node scripts/migrate-modules.js dashboard
 */

const fs = require('fs');
const path = require('path');

// 模块映射：script.js 中的函数名 -> 目标文件
const MODULE_MAP = {
  'dashboard': {
    function: 'renderDashboard',
    target: 'js/modules/dashboard.js',
    dependencies: ['renderHistogram', 'renderAverageRadar', 'renderSubjectBoxPlot', 'renderCorrelationScatterPlot', 'renderStackedBar', 'renderClassComparisonChart', 'renderContributionChart', 'renderScoreCurve', 'calculateClassComparison']
  },
  'student': {
    function: 'renderStudent',
    target: 'js/modules/student.js',
    dependencies: ['renderStudentRadar', 'addSubjectRanksToData']
  },
  'paper': {
    function: 'renderPaper',
    target: 'js/modules/paper.js',
    dependencies: ['renderHistogram', 'renderSubjectComparisonBarChart', 'renderDifficultyScatter']
  },
  'single-subject': {
    function: 'renderSingleSubject',
    target: 'js/modules/single-subject.js',
    dependencies: ['renderHistogram', 'renderSingleSubjectPie', 'renderSingleSubjectClassBoxplot', 'renderSingleSubjectQuadrant', 'calculateClassComparison', 'renderClassComparisonChart']
  },
  'trend': {
    function: 'renderTrend',
    target: 'js/modules/trend.js',
    dependencies: ['renderClassValueAddedChart', 'renderRankChangeBarChart']
  },
  'groups': {
    function: 'renderGroups',
    target: 'js/modules/groups.js',
    dependencies: ['renderGroupClassPie', 'renderGroupRadarChart']
  },
  'correlation': {
    function: 'renderCorrelation',
    target: 'js/modules/correlation.js',
    dependencies: ['renderCorrelationHeatmapV2', 'renderCorrelationNetwork', 'renderSubjectCentrality', 'calculateCorrelation']
  },
  'weakness': {
    function: 'renderWeakness',
    target: 'js/modules/weakness.js',
    dependencies: ['renderWeaknessScatter', 'calculateWeaknessData']
  },
  'boundary': {
    function: 'renderBoundary',
    target: 'js/modules/boundary.js',
    dependencies: ['renderBoundaryBottleneckChart', 'renderBoundaryGapChart']
  },
  'holistic': {
    function: 'renderHolisticBalance',
    target: 'js/modules/holistic.js',
    dependencies: ['renderHolisticShortestPlankChart', 'renderHolisticScatterChart']
  },
  'trend-distribution': {
    function: 'renderTrendDistribution',
    target: 'js/modules/trend-distribution.js',
    dependencies: []
  }
};

function extractFunction(scriptContent, functionName) {
  // 简单的函数提取逻辑（基于函数定义）
  const functionRegex = new RegExp(
    `function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)(?=^function\\s+|^\\/\\*|^\\/\\/|$)`,
    'm'
  );
  
  const match = scriptContent.match(functionRegex);
  if (match) {
    return `function ${functionName}${match[0].substring(functionName.length + 8)}`;
  }
  
  return null;
}

function main() {
  const moduleName = process.argv[2];
  
  if (!moduleName) {
    console.log('使用方法: node scripts/migrate-modules.js <module-name>');
    console.log('可用模块:', Object.keys(MODULE_MAP).join(', '));
    return;
  }
  
  const moduleInfo = MODULE_MAP[moduleName];
  if (!moduleInfo) {
    console.error(`未知模块: ${moduleName}`);
    return;
  }
  
  console.log(`正在提取模块: ${moduleName}`);
  console.log(`目标文件: ${moduleInfo.target}`);
  console.log(`函数名: ${moduleInfo.function}`);
  
  // 读取 script.js
  const scriptPath = path.join(__dirname, '..', 'script.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // 提取函数
  const functionCode = extractFunction(scriptContent, moduleInfo.function);
  
  if (!functionCode) {
    console.error(`未找到函数: ${moduleInfo.function}`);
    return;
  }
  
  console.log(`\n提取的函数代码 (前 200 字符):`);
  console.log(functionCode.substring(0, 200) + '...');
  console.log(`\n函数总长度: ${functionCode.length} 字符`);
  
  // 这里可以进一步处理，比如：
  // 1. 替换全局变量引用为 State
  // 2. 添加必要的 import
  // 3. 写入目标文件
  
  console.log('\n提示: 请手动检查并完善提取的代码');
}

if (require.main === module) {
  main();
}

module.exports = { extractFunction, MODULE_MAP };

