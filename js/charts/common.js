/* eslint-disable no-undef */
'use strict';

/**
 * 通用图表函数
 * 包含最常用的图表渲染函数
 */

import { State } from '../config/state.js';

// 获取或创建 ECharts 实例
function getChartInstance(elementId) {
    if (!window.echartsInstances) {
        window.echartsInstances = State.echartsInstances;
    }
    
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;

    if (window.echartsInstances[elementId]) {
        window.echartsInstances[elementId].dispose();
    }
    
    const myChart = echarts.init(chartDom);
    window.echartsInstances[elementId] = myChart;
    State.echartsInstances[elementId] = myChart;
    
    return myChart;
}

/**
 * 渲染直方图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} students - 学生数据
 * @param {string} scoreKey - 分数键名（'totalScore' 或科目名）
 * @param {number} fullScore - 满分
 * @param {string} title - 图表标题
 * @param {number} binSize - 分段大小
 * @param {boolean} isClassCompare - 是否班级对比模式
 */
export function renderHistogram(elementId, students, scoreKey, fullScore, title, binSize, isClassCompare = false) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 基础数据清洗
    if (!students || students.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">无数据可供显示。</p>`;
        return;
    }

    const effectiveBinSize = binSize > 0 ? binSize : Math.max(10, Math.ceil(fullScore / 10));
    
    // 确定全局 X 轴范围
    const allScores = students.map(s => (scoreKey === 'totalScore') ? s.totalScore : s.scores[scoreKey])
                              .filter(s => typeof s === 'number' && !isNaN(s));
    
    if (allScores.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">无有效分数数据。</p>`;
        return;
    }

    const minScore = Math.min(...allScores);
    const maxScore = Math.max(...allScores);
    const startBin = Math.floor(minScore / effectiveBinSize) * effectiveBinSize;
    const endBinLimit = Math.min(Math.ceil((maxScore + 0.01) / effectiveBinSize) * effectiveBinSize, fullScore);

    const labels = [];
    for (let i = startBin; i < endBinLimit; i += effectiveBinSize) {
        const end = Math.min(i + effectiveBinSize, fullScore);
        labels.push(`${i}-${end}`);
    }

    let series = [];
    let legendData = [];
    let tooltipFormatter;

    // 班级对比模式
    if (isClassCompare) {
        const classSet = new Set(students.map(s => s.class));
        const classes = Array.from(classSet).sort();
        const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

        classes.forEach((cls, idx) => {
            const classStudents = students.filter(s => s.class === cls);
            const bins = new Array(labels.length).fill(0);

            classStudents.forEach(s => {
                const score = (scoreKey === 'totalScore') ? s.totalScore : s.scores[scoreKey];
                if (typeof score !== 'number' || isNaN(score) || score < startBin) return;
                let binIndex = Math.floor((score - startBin) / effectiveBinSize);
                if (binIndex >= labels.length) binIndex = labels.length - 1;
                bins[binIndex]++;
            });

            series.push({
                name: cls,
                type: 'line',
                smooth: 0.3,
                symbol: 'circle',
                symbolSize: 6,
                data: bins,
                itemStyle: { color: colors[idx % colors.length] },
                lineStyle: { width: 2 }
            });
            legendData.push(cls);
        });

        tooltipFormatter = (params) => {
            let html = `<strong>${params[0].name} 分数段</strong><br/>`;
            const sorted = [...params].sort((a, b) => b.value - a.value);
            sorted.forEach(p => {
                if (p.value > 0) {
                    const marker = p.marker || `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${p.color};"></span>`;
                    html += `${marker} ${p.seriesName}: <strong>${p.value}</strong>人<br/>`;
                }
            });
            return html;
        };
    } else {
        // 单一群体模式
        const bins = new Array(labels.length).fill(0);
        const binNames = new Array(labels.length).fill(null).map(() => []);

        students.forEach(s => {
            const score = (scoreKey === 'totalScore') ? s.totalScore : s.scores[scoreKey];
            if (typeof score !== 'number' || isNaN(score) || score < startBin) return;
            let binIndex = Math.floor((score - startBin) / effectiveBinSize);
            if (binIndex >= labels.length) binIndex = labels.length - 1;
            bins[binIndex]++;
            binNames[binIndex].push(s.name);
        });

        let maxVal = Math.max(...bins);
        let minVal = Infinity;
        bins.forEach(v => { if(v > 0 && v < minVal) minVal = v; });
        if (minVal === Infinity) minVal = 0;

        const seriesData = bins.map((count, i) => {
            let color = '#007bff';
            if (count === maxVal && maxVal !== 0) color = '#28a745';
            else if (count === minVal && minVal !== maxVal) color = '#dc3545';
            
            return {
                value: count,
                names: binNames[i],
                itemStyle: { color: color }
            };
        });

        series.push({
            name: '人数',
            type: 'bar',
            data: seriesData,
            barWidth: '60%',
            label: { show: true, position: 'top' }
        });

        tooltipFormatter = (params) => {
            const p = params[0];
            const data = p.data;
            let namesHtml = "";
            if (data.names && data.names.length > 0) {
                namesHtml = `<hr style="margin:5px 0; border-color:#eee"/>` + 
                            data.names.slice(0, 10).join('<br/>');
                if (data.names.length > 10) namesHtml += `<br/>...等 ${data.names.length} 人`;
            }
            return `<strong>${p.name}</strong><br/>人数: <strong>${p.value}</strong>${namesHtml}`;
        };
    }

    const option = {
        title: { text: title, left: 'center', textStyle: { fontSize: 16, fontWeight: 'normal' } },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: tooltipFormatter,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderColor: '#ccc',
            textStyle: { color: '#333' }
        },
        legend: {
            show: isClassCompare,
            data: legendData,
            top: 30,
            type: 'scroll'
        },
        grid: { left: '3%', right: '4%', bottom: '20%', top: isClassCompare ? '15%' : '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            name: '分数段',
            axisLabel: { interval: 'auto', rotate: 30 }
        },
        yAxis: { type: 'value', name: '人数' },
        series: series,
        toolbox: {
            show: true,
            feature: { saveAsImage: { show: true, title: '保存' } }
        }
    };

    myChart.setOption(option, true);

    // 点击事件（下钻功能）
    myChart.off('click');
    myChart.on('click', function (params) {
        const label = params.name; 
        if (!label || !label.includes('-')) return;

        const [minStr, maxStr] = label.split('-');
        const minVal = parseFloat(minStr);
        const maxVal = parseFloat(maxStr);

        let targetStudents = students;
        if (isClassCompare && params.seriesName) {
            targetStudents = students.filter(s => s.class === params.seriesName);
        }

        const drilled = targetStudents.filter(s => {
            const val = (scoreKey === 'totalScore') ? s.totalScore : s.scores[scoreKey];
            if (typeof val !== 'number') return false;
            return val >= minVal && val < (maxVal + 0.01); 
        });

        const subTitle = isClassCompare ? `${params.seriesName} - ` : "";
        if (typeof window.showDrillDownModal === 'function') {
            window.showDrillDownModal(`${subTitle}${scoreKey} 分数段 [${label}] 名单`, drilled, scoreKey);
        }
    });
}

/**
 * 渲染雷达图（平均分）
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} stats - 统计数据
 */
export function renderAverageRadar(elementId, stats) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const indicators = State.dynamicSubjectList.map(subject => {
        const full = State.subjectConfigs[subject]?.full || 100;
        return { name: subject, max: full };
    });

    const averageData = State.dynamicSubjectList.map(subject => {
        return stats[subject] ? stats[subject].average : 0;
    });

    const option = {
        title: { text: '各科平均分雷达图', left: 'center' },
        tooltip: { trigger: 'item' },
        radar: {
            indicator: indicators,
            radius: 120,
        },
        series: [{
            name: '班级平均分',
            type: 'radar',
            data: [{ value: averageData, name: '平均分' }]
        }]
    };
    
    myChart.setOption(option);
}

/**
 * 渲染箱形图
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} stats - 统计数据
 * @param {Array} activeData - 当前数据
 */
export function renderSubjectBoxPlot(elementId, stats, activeData) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const subjects = State.dynamicSubjectList;
    const seriesData = subjects.map(subject => {
        const subjectStats = stats[subject];
        if (!subjectStats || !subjectStats.scores || subjectStats.scores.length === 0) {
            return [0, 0, 0, 0, 0];
        }
        
        const scores = subjectStats.scores.slice().sort((a, b) => a - b);
        const q1 = scores[Math.floor(scores.length * 0.25)];
        const median = scores[Math.floor(scores.length * 0.5)];
        const q3 = scores[Math.floor(scores.length * 0.75)];
        const min = scores[0];
        const max = scores[scores.length - 1];
        
        return [min, q1, median, q3, max];
    });

    const option = {
        title: { text: '全科分数分布箱形图', left: 'center' },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const [min, q1, median, q3, max] = params.value;
                return `${params.name}<br/>最小值: ${min}<br/>Q1: ${q1}<br/>中位数: ${median}<br/>Q3: ${q3}<br/>最大值: ${max}`;
            }
        },
        grid: { left: '10%', right: '10%', bottom: '15%' },
        xAxis: {
            type: 'category',
            data: subjects,
            boundaryGap: true,
            nameGap: 30,
            splitArea: { show: false },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: '分数',
            splitArea: { show: true }
        },
        series: [{
            name: '分数分布',
            type: 'boxplot',
            data: seriesData,
            itemStyle: {
                color: '#5470c6',
                borderColor: '#5470c6'
            },
            emphasis: {
                itemStyle: {
                    color: '#91cc75',
                    borderColor: '#91cc75'
                }
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染散点图（相关性分析）
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} activeData - 学生数据
 * @param {string} xSubject - X轴科目
 * @param {string} ySubject - Y轴科目
 */
export function renderCorrelationScatterPlot(elementId, activeData, xSubject, ySubject) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const data = activeData
        .map(s => {
            const x = xSubject === 'totalScore' ? s.totalScore : s.scores[xSubject];
            const y = ySubject === 'totalScore' ? s.totalScore : s.scores[ySubject];
            if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
                return [x, y, s.name];
            }
            return null;
        })
        .filter(d => d !== null);

    if (data.length === 0) {
        document.getElementById(elementId).innerHTML = '<p style="text-align:center;padding-top:50px;color:#999;">无有效数据</p>';
        return;
    }

    // 计算相关系数
    const xValues = data.map(d => d[0]);
    const yValues = data.map(d => d[1]);
    const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    
    const numerator = data.reduce((sum, d) => sum + (d[0] - xMean) * (d[1] - yMean), 0);
    const xStd = Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d[0] - xMean, 2), 0) / data.length);
    const yStd = Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d[1] - yMean, 2), 0) / data.length);
    const correlation = xStd && yStd ? (numerator / data.length) / (xStd * yStd) : 0;

    const option = {
        title: {
            text: `${xSubject} vs ${ySubject} 散点图`,
            subtext: `相关系数: ${correlation.toFixed(3)}`,
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                return `${params.data[2]}<br/>${xSubject}: ${params.value[0]}<br/>${ySubject}: ${params.value[1]}`;
            }
        },
        grid: { left: '10%', right: '10%', bottom: '15%' },
        xAxis: {
            type: 'value',
            name: xSubject,
            scale: true
        },
        yAxis: {
            type: 'value',
            name: ySubject,
            scale: true
        },
        series: [{
            name: '学生',
            type: 'scatter',
            data: data,
            symbolSize: 8,
            itemStyle: {
                color: '#5470c6',
                opacity: 0.6
            }
        }]
    };

    myChart.setOption(option);
}

/**
 * 渲染堆叠柱状图（各科等级构成）
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} stats - 统计数据
 * @param {Object} configs - 科目配置
 */
export function renderStackedBar(elementId, stats, configs) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const subjects = State.dynamicSubjectList;
    const categories = ['优秀', '良好', '及格', '不及格'];
    const colors = ['#28a745', '#17a2b8', '#ffc107', '#dc3545'];

    const series = categories.map((cat, idx) => {
        const data = subjects.map(subject => {
            const subjectStats = stats[subject];
            if (!subjectStats) return 0;
            
            switch (cat) {
                case '优秀':
                    return subjectStats.excellentCount || 0;
                case '良好':
                    return subjectStats.goodCount || 0;
                case '及格':
                    return (subjectStats.passCount || 0) - (subjectStats.goodCount || 0);
                case '不及格':
                    return subjectStats.failCount || 0;
                default:
                    return 0;
            }
        });

        return {
            name: cat,
            type: 'bar',
            stack: 'total',
            data: data,
            itemStyle: { color: colors[idx] }
        };
    });

    const option = {
        title: { text: '各科 A/B/C/D 构成', left: 'center' },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        legend: {
            data: categories,
            top: 30
        },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
            type: 'category',
            data: subjects,
            axisLabel: { rotate: 30 }
        },
        yAxis: {
            type: 'value',
            name: '人数'
        },
        series: series
    };

    myChart.setOption(option);
}

/**
 * 渲染科目对比条形图
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} stats - 统计数据
 * @param {string} metric - 指标名称（average, passRate, etc.）
 */
export function renderSubjectComparisonBarChart(elementId, stats, metric) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const data = State.dynamicSubjectList.map(subject => {
        return {
            name: subject,
            value: (stats[subject] && stats[subject][metric] !== undefined) ? stats[subject][metric] : 0
        };
    });

    const labels = data.map(d => d.name);
    const values = data.map(d => d.value);

    let maxValue = -Infinity;
    let minValue = Infinity;
    const validValues = values.filter(v => v > 0);
    if (validValues.length > 0) {
        minValue = Math.min(...validValues);
    } else {
        minValue = 0;
    }
    maxValue = Math.max(...values);

    const seriesData = values.map(value => {
        let color;
        if (value === maxValue && maxValue !== 0) {
            color = '#28a745';
        } else if (value === minValue && minValue !== maxValue) {
            color = '#dc3545';
        } else {
            color = '#007bff';
        }
        return {
            value: value,
            itemStyle: { color: color }
        };
    });

    let titleText = '';
    switch (metric) {
        case 'average': titleText = '各科平均分对比'; break;
        case 'passRate': titleText = '各科及格率对比 (%)'; break;
        case 'excellentRate': titleText = '各科优秀率对比 (%)'; break;
        case 'stdDev': titleText = '各科标准差对比'; break;
        case 'max': titleText = '各科最高分对比'; break;
        default: titleText = '科目对比';
    }

    const option = {
        title: { text: titleText, left: 'center' },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params[0];
                return `${p.name}<br/>${titleText}: <strong>${parseFloat(p.value).toFixed(2)}</strong>`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { rotate: 30 }
        },
        yAxis: {
            type: 'value',
            name: metric === 'passRate' || metric === 'excellentRate' ? '百分比 (%)' : '分数'
        },
        series: [{
            name: titleText,
            type: 'bar',
            data: seriesData,
            label: {
                show: true,
                position: 'top',
                formatter: (params) => parseFloat(params.value).toFixed(2)
            }
        }]
    };

    myChart.setOption(option);
}

