/* eslint-disable no-undef */
'use strict';

/**
 * Trend-Distribution 模块专用图表函数
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
 * 渲染重叠直方图（支持原始分和T分模式）
 */
export function renderOverlappingHistogram(elementId, currentData, compareData, subjectName, customBinSize, mode = 'raw') {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 1. 内部辅助：从数据对象中提取分数数组
    const getScores = (list) => {
        return list.map(s => {
            if (mode === 'tscore') return s.tScores ? s.tScores[subjectName] : null;
            return (subjectName === 'totalScore') ? s.totalScore : s.scores[subjectName];
        });
    };

    const currentScores = getScores(currentData);
    const compareScores = getScores(compareData);

    const cleanCurrent = currentScores.filter(s => typeof s === 'number' && !isNaN(s));
    const cleanCompare = compareScores.filter(s => typeof s === 'number' && !isNaN(s));

    if (cleanCurrent.length === 0 && cleanCompare.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">无数据可供显示。</p>`;
        return;
    }

    // 2. 计算统计指标
    const calcStats = (scores) => {
        if (scores.length === 0) return { avg: 0, full: 100 };
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = sum / scores.length;
        let fullScore = 100;
        if (subjectName === 'totalScore') {
            fullScore = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.full || 0), 0);
        } else {
            fullScore = State.subjectConfigs[subjectName]?.full || 100;
        }
        return {
            avg: parseFloat(avg.toFixed(1)),
            full: fullScore
        };
    };
    const currStats = calcStats(cleanCurrent);
    const compStats = calcStats(cleanCompare);

    // 3. 确定分箱逻辑 (Binning)
    const allScores = [...cleanCurrent, ...cleanCompare];
    const min = Math.min(...allScores);
    const max = Math.max(...allScores);

    let binSize;
    if (customBinSize && customBinSize > 0) {
        binSize = customBinSize;
    } else {
        if (mode === 'tscore') binSize = 5; // T分默认5分一段
        else {
            const fullScore = currStats.full;
            binSize = Math.max(5, Math.round(fullScore / 20));
        }
    }

    const startBin = Math.floor(min / binSize) * binSize;
    const endBinLimit = Math.ceil((max + 0.001) / binSize) * binSize;

    const labels = [];
    const binsCurrent = {};
    const binsCompare = {};

    for (let i = startBin; i < endBinLimit; i += binSize) {
        const rangeStart = parseFloat(i.toFixed(2));
        const rangeEnd = parseFloat((i + binSize).toFixed(2));
        const label = `${rangeStart}-${rangeEnd}`;
        labels.push(label);
        binsCurrent[label] = 0;
        binsCompare[label] = 0;
    }

    // 填充数据
    const fillBins = (scores, bins) => {
        scores.forEach(score => {
            if (score < startBin) return;
            let binIndex = Math.floor((score - startBin) / binSize);
            if (binIndex >= labels.length) binIndex = labels.length - 1;
            const label = labels[binIndex];
            if (label) bins[label]++;
        });
    };

    fillBins(cleanCurrent, binsCurrent);
    fillBins(cleanCompare, binsCompare);

    const dataCurrent = labels.map(label => binsCurrent[label]);
    const dataCompare = labels.map(label => binsCompare[label]);

    // 4. 配置图表
    let titleText = `${subjectName} 成绩分布对比`;
    let subTitleText = "";
    if (mode === 'tscore') {
        titleText += " (T分模式)";
        subTitleText = `本次T分均值: ${currStats.avg}  vs  上次T分均值: ${compStats.avg}`;
    } else {
        titleText += " (原始分模式)";
        subTitleText = `本次均分: ${currStats.avg}  vs  上次均分: ${compStats.avg}`;
    }

    const option = {
        title: {
            text: titleText,
            subtext: subTitleText,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' },
            subtextStyle: { fontSize: 12, color: '#666' }
        },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['本次成绩', '对比成绩'], top: 50 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: 80, containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            name: mode === 'tscore' ? 'T分段' : '分数段',
            axisLabel: { interval: 'auto', rotate: 30 }
        },
        yAxis: { type: 'value', name: '人数' },
        series: [
            {
                name: '对比成绩',
                type: 'bar',
                data: dataCompare,
                itemStyle: { color: '#ccc' },
                markLine: {
                    symbol: 'none',
                    data: [{ xAxis: (compStats.avg - startBin) / binSize, lineStyle: { color: '#999', type: 'dashed' }, label: { formatter: `{c}`, position: 'start' } }],
                    silent: true
                }
            },
            {
                name: '本次成绩',
                type: 'bar',
                data: dataCurrent,
                itemStyle: { color: '#4285f4' },
                markLine: {
                    symbol: 'none',
                    data: [{ xAxis: (currStats.avg - startBin) / binSize, lineStyle: { color: '#4285f4', type: 'dashed' }, label: { formatter: `{c}`, position: 'end' } }],
                    silent: true
                }
            }
        ]
    };
    myChart.setOption(option);

    // 绑定点击事件，显示名单弹窗
    myChart.off('click');
    myChart.on('click', function (params) {
        const label = params.name;
        const seriesName = params.seriesName;

        if (!label || !label.includes('-')) return;

        const [minStr, maxStr] = label.split('-');
        const minVal = parseFloat(minStr);
        const maxVal = parseFloat(maxStr);

        const isCurrent = (seriesName === '本次成绩');
        const sourceData = isCurrent ? currentData : compareData;

        const drilledStudents = sourceData.filter(s => {
            let val;
            if (mode === 'tscore') {
                val = s.tScores ? s.tScores[subjectName] : null;
            } else {
                val = (subjectName === 'totalScore') ? s.totalScore : s.scores[subjectName];
            }

            if (typeof val !== 'number' || isNaN(val)) return false;

            const isLastBin = (label === labels[labels.length - 1]);
            if (isLastBin) {
                return val >= minVal && val <= maxVal + 0.001;
            } else {
                return val >= minVal && val < maxVal;
            }
        });

        const typeText = mode === 'tscore' ? 'T分' : '分';
        const title = `${subjectName} ${typeText}段 [${label}] 学生名单 (${seriesName})`;

        if (typeof window.showDrillDownModal === 'function') {
            window.showDrillDownModal(title, drilledStudents, subjectName);
        }
    });
}

/**
 * 渲染等级构成对比图（支持原始分和T分模式）
 */
export function renderTrendCompositionChart(elementId, currentData, compareData, mode = 'raw') {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    const subjects = State.dynamicSubjectList;
    const dataMap = { curr: { A: [], B: [], C: [], D: [] }, comp: { A: [], B: [], C: [], D: [] } };

    // 内部辅助：获取单科统计
    const calcDist = (list, subject) => {
        let cA = 0, cB = 0, cC = 0, cD = 0, total = 0;
        const config = State.subjectConfigs[subject] || {};

        list.forEach(s => {
            let val;
            if (mode === 'tscore') {
                val = (s.tScores && s.tScores[subject]);
                if (val !== undefined && val !== null && !isNaN(val)) {
                    total++;
                    if (val >= 60) cA++;
                    else if (val >= 50) cB++;
                    else if (val >= 40) cC++;
                    else cD++;
                }
            } else {
                val = s.scores[subject];
                if (val !== undefined && val !== null && !isNaN(val)) {
                    total++;
                    if (val >= config.excel) cA++;
                    else if (val >= config.good) cB++;
                    else if (val >= config.pass) cC++;
                    else cD++;
                }
            }
        });

        if (total === 0) return { A: 0, B: 0, C: 0, D: 0 };
        return {
            A: parseFloat(((cA / total) * 100).toFixed(1)),
            B: parseFloat(((cB / total) * 100).toFixed(1)),
            C: parseFloat(((cC / total) * 100).toFixed(1)),
            D: parseFloat(((cD / total) * 100).toFixed(1))
        };
    };

    subjects.forEach(sub => {
        const curr = calcDist(currentData, sub);
        const comp = calcDist(compareData, sub);
        ['A', 'B', 'C', 'D'].forEach(k => {
            dataMap.curr[k].push(curr[k]);
            dataMap.comp[k].push(comp[k]);
        });
    });

    const colors = { A: '#28a745', B: '#007bff', C: '#ffc107', D: '#dc3545' };
    const titleText = mode === 'tscore' ? '各科 T分等级构成 (A:T≥60, B:≥50, C:≥40)' : '各科 原始分等级构成 (基于优秀/良好/及格线)';

    const option = {
        title: { text: titleText, left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal', color: '#666' }, top: 5 },
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'shadow' },
            formatter: (params) => {
                let html = `<strong>${params[0].name}</strong><br/>`;
                html += `<div style="display:inline-block; width:49%; vertical-align:top;">`;
                html += `<div style="border-bottom:1px solid #eee; margin-bottom:5px;">📘 本次</div>`;
                params.filter(p => p.seriesName.startsWith('本次')).reverse().forEach(p => html += `${p.marker} ${p.seriesName.split('-')[1]}: ${p.value}%<br/>`);
                html += `</div>`;
                html += `<div style="display:inline-block; width:49%; vertical-align:top; margin-left:2%;">`;
                html += `<div style="border-bottom:1px solid #eee; margin-bottom:5px; color:#999;">📓 上次</div>`;
                params.filter(p => p.seriesName.startsWith('上次')).reverse().forEach(p => html += `${p.marker} ${p.seriesName.split('-')[1]}: ${p.value}%<br/>`);
                html += `</div>`;
                return html;
            }
        },
        legend: { data: ['A (优秀)', 'B (良好)', 'C (及格)', 'D (不及格)'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
        xAxis: { type: 'category', data: subjects, axisLabel: { rotate: 30, interval: 0 } },
        yAxis: { type: 'value', max: 100, name: '百分比 (%)' },
        series: [
            { name: '本次-D (不及格)', stack: 'current', type: 'bar', data: dataMap.curr.D, itemStyle: { color: colors.D }, barGap: 0 },
            { name: '本次-C (及格)', stack: 'current', type: 'bar', data: dataMap.curr.C, itemStyle: { color: colors.C } },
            { name: '本次-B (良好)', stack: 'current', type: 'bar', data: dataMap.curr.B, itemStyle: { color: colors.B } },
            { name: '本次-A (优秀)', stack: 'current', type: 'bar', data: dataMap.curr.A, itemStyle: { color: colors.A } },
            { name: '上次-D (不及格)', stack: 'compare', type: 'bar', data: dataMap.comp.D, itemStyle: { color: colors.D, opacity: 0.4 } },
            { name: '上次-C (及格)', stack: 'compare', type: 'bar', data: dataMap.comp.C, itemStyle: { color: colors.C, opacity: 0.4 } },
            { name: '上次-B (良好)', stack: 'compare', type: 'bar', data: dataMap.comp.B, itemStyle: { color: colors.B, opacity: 0.4 } },
            { name: '上次-A (优秀)', stack: 'compare', type: 'bar', data: dataMap.comp.A, itemStyle: { color: colors.A, opacity: 0.4 } },
            { name: 'A (优秀)', type: 'bar', stack: 'current', data: [], itemStyle: { color: colors.A } },
            { name: 'B (良好)', type: 'bar', stack: 'current', data: [], itemStyle: { color: colors.B } },
            { name: 'C (及格)', type: 'bar', stack: 'current', data: [], itemStyle: { color: colors.C } },
            { name: 'D (不及格)', type: 'bar', stack: 'current', data: [], itemStyle: { color: colors.D } }
        ]
    };
    myChart.setOption(option);
}

/**
 * 渲染排名分层流动图（桑基图）
 */
export function renderRankingSankey(elementId, mergedData, rankTiers, getRankCategory, currentFilter, subject = 'totalScore') {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return null;

    const myChart = getChartInstance(elementId);
    if (!myChart) return null;

    if (mergedData.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">无匹配的学生数据。</p>`;
        return null;
    }

    const tierColors = ['#5470c6', '#fac858', '#91cc75', '#ee6666'];

    // ECharts Nodes
    const nodes = [];
    rankTiers.forEach((tier, index) => {
        const color = tierColors[index % tierColors.length];
        nodes.push({
            name: `上次: ${tier.name}`,
            itemStyle: { color: color }
        });
    });
    rankTiers.forEach((tier, index) => {
        const color = tierColors[index % tierColors.length];
        nodes.push({
            name: `本次: ${tier.name}`,
            itemStyle: { color: color }
        });
    });

    // ECharts Links
    const linksMap = {};
    mergedData.forEach(student => {
        const useGradeRank = (currentFilter === 'ALL');
        let oldRank, newRank;

        if (subject === 'totalScore') {
            oldRank = useGradeRank ? (student.oldGradeRank || 0) : student.oldRank;
            newRank = useGradeRank ? (student.gradeRank || 0) : student.rank;
        } else {
            const oldRanksObj = useGradeRank ? (student.oldGradeRanks || {}) : (student.oldClassRanks || {});
            const newRanksObj = useGradeRank ? (student.gradeRanks || {}) : (student.classRanks || {});
            oldRank = oldRanksObj[subject] || 0;
            newRank = newRanksObj[subject] || 0;
        }

        if (oldRank > 0 && newRank > 0) {
            const source = `上次: ${getRankCategory(oldRank)}`;
            const target = `本次: ${getRankCategory(newRank)}`;
            const key = `${source} -> ${target}`;
            linksMap[key] = (linksMap[key] || 0) + 1;
        }
    });

    const links = Object.keys(linksMap).map(key => {
        const [source, target] = key.split(' -> ');
        return {
            source: source,
            target: target,
            value: linksMap[key]
        };
    });

    const titleText = (subject === 'totalScore') ? '总分排名' : `${subject}排名`;

    const option = {
        title: {
            text: `${titleText}分层流动图`,
            subtext: `基于两次${subject === 'totalScore' ? '总分' : subject}均有效的学生`,
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            formatter: (params) => {
                if (params.dataType === 'link') {
                    return `${params.data.source} → ${params.data.target}: ${params.data.value} 人`;
                }
                if (params.dataType === 'node') {
                    return `${params.name}: ${params.value} 人`;
                }
                return '';
            }
        },
        series: [{
            type: 'sankey',
            data: nodes,
            links: links,
            emphasis: { focus: 'adjacency' },
            nodeAlign: 'justify',
            layoutIterations: 32,
            lineStyle: {
                color: 'gradient',
                curveness: 0.5
            },
            label: {
                fontSize: 12
            }
        }]
    };
    myChart.setOption(option);
    return myChart;
}

