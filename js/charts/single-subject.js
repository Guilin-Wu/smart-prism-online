/* eslint-disable no-undef */
'use strict';

/**
 * Single-Subject 模块专用图表函数
 */

import { State } from '../config/state.js';
import { calculateClassComparison } from './dashboard.js';
import { renderClassComparisonChart } from './dashboard.js';

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
 * 计算分位数
 */
function quantile(arr, q) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
}

/**
 * 渲染单科班级箱形图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} students - 学生数据
 * @param {string} subject - 科目名称
 */
export function renderSingleSubjectClassBoxplot(elementId, students, subject) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 数据分组
    const classMap = {};
    students.forEach(s => {
        if (!classMap[s.class]) classMap[s.class] = [];
        const val = s.scores[subject];
        if (typeof val === 'number' && !isNaN(val)) {
            classMap[s.class].push(val);
        }
    });

    // 排序班级名
    const classes = Object.keys(classMap).sort();
    
    // 计算箱线数据
    const boxData = [];
    const outliers = [];

    classes.forEach((cls, idx) => {
        const scores = classMap[cls].sort((a, b) => a - b);
        if (scores.length === 0) {
            boxData.push([0,0,0,0,0]);
            return;
        }
        
        // 计算四分位
        const q1Val = quantile(scores, 0.25);
        const q2Val = quantile(scores, 0.5);
        const q3Val = quantile(scores, 0.75);
        const iqr = q3Val - q1Val;
        
        const minLimit = q1Val - 1.5 * iqr;
        const maxLimit = q3Val + 1.5 * iqr;

        // 过滤异常值
        const normalScores = scores.filter(s => s >= minLimit && s <= maxLimit);
        const minVal = normalScores.length > 0 ? Math.min(...normalScores) : q1Val;
        const maxVal = normalScores.length > 0 ? Math.max(...normalScores) : q3Val;

        boxData.push([minVal, q1Val, q2Val, q3Val, maxVal]);

        // 收集异常点
        scores.forEach(s => {
            if (s < minLimit || s > maxLimit) {
                outliers.push([idx, s]);
            }
        });
    });

    const option = {
        tooltip: {
            trigger: 'item',
            axisPointer: { type: 'shadow' },
            confine: true
        },
        grid: { left: '10%', right: '5%', bottom: '15%' },
        xAxis: {
            type: 'category',
            data: classes,
            axisLabel: { rotate: 30, interval: 0 }
        },
        yAxis: {
            type: 'value',
            name: '分数',
            splitArea: { show: true }
        },
        series: [
            {
                name: '分数分布',
                type: 'boxplot',
                data: boxData,
                itemStyle: {
                    color: '#e3f2fd',
                    borderColor: '#007bff'
                },
                tooltip: {
                    formatter: function (param) {
                        return [
                            '<strong>' + param.name + '</strong>',
                            '最高分 (上须): ' + param.data[5].toFixed(1),
                            'Q3 (前25%线): ' + param.data[4].toFixed(1),
                            '中位数: ' + param.data[3].toFixed(1),
                            'Q1 (后25%线): ' + param.data[2].toFixed(1),
                            '最低分 (下须): ' + param.data[1].toFixed(1)
                        ].join('<br/>');
                    }
                }
            },
            {
                name: '异常值',
                type: 'scatter',
                data: outliers,
                itemStyle: { color: '#dc3545' },
                tooltip: {
                    formatter: (p) => `<strong>${classes[p.data[0]]}</strong><br/>异常分: ${p.data[1]}`
                }
            }
        ]
    };

    myChart.setOption(option);
}

/**
 * 渲染单科班级四象限诊断图
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} students - 学生数据
 * @param {string} subject - 科目名称
 * @param {Object} gradeStats - 年级统计数据
 */
export function renderSingleSubjectQuadrant(elementId, students, subject, gradeStats) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    // 准备数据
    const classes = [...new Set(students.map(s => s.class))].sort();
    const config = State.subjectConfigs[subject] || { pass: 60 };

    const data = classes.map(cls => {
        const group = students.filter(s => s.class === cls);
        const scores = group.map(s => s.scores[subject]).filter(v => typeof v === 'number');
        
        if (scores.length === 0) return null;

        const avg = scores.reduce((a,b)=>a+b, 0) / scores.length;
        const passCount = scores.filter(v => v >= config.pass).length;
        const passRate = (passCount / scores.length) * 100;

        return {
            name: cls,
            value: [passRate.toFixed(1), avg.toFixed(1)],
            count: scores.length
        };
    }).filter(d => d !== null);

    // 基准线 (年级平均)
    const gradeAvg = gradeStats.average || 0;
    const gradePassRate = gradeStats.passRate || 0;

    // 计算坐标轴范围
    const minX = Math.min(...data.map(d => parseFloat(d.value[0])), gradePassRate) * 0.9;
    const maxX = Math.min(100, Math.max(...data.map(d => parseFloat(d.value[0])), gradePassRate) * 1.05);
    const minY = Math.min(...data.map(d => parseFloat(d.value[1])), gradeAvg) * 0.9;
    const maxY = Math.max(...data.map(d => parseFloat(d.value[1])), gradeAvg) * 1.05;

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                return `<strong>${p.name}</strong><br/>` +
                       `平均分: ${p.value[1]}<br/>` +
                       `及格率: ${p.value[0]}%<br/>` +
                       `人数: ${p.data.count}`;
            }
        },
        grid: { left: '10%', right: '10%', top: '10%', bottom: '10%' },
        xAxis: {
            type: 'value',
            name: '及格率 (%)',
            nameLocation: 'middle',
            nameGap: 25,
            min: Math.floor(minX),
            max: Math.ceil(maxX),
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: '平均分',
            nameLocation: 'middle',
            nameGap: 30,
            min: Math.floor(minY),
            max: Math.ceil(maxY),
            splitLine: { show: false }
        },
        series: [
            {
                type: 'scatter',
                data: data,
                symbolSize: 15,
                itemStyle: {
                    color: (p) => {
                        const x = parseFloat(p.value[0]);
                        const y = parseFloat(p.value[1]);
                        if (x >= gradePassRate && y >= gradeAvg) return '#28a745';
                        if (x < gradePassRate && y < gradeAvg) return '#dc3545';
                        return '#ffc107';
                    },
                    shadowBlur: 5,
                    shadowColor: 'rgba(0,0,0,0.3)'
                },
                label: {
                    show: true,
                    formatter: '{b}',
                    position: 'top',
                    color: '#333',
                    fontSize: 10
                },
                markLine: {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { type: 'dashed', color: '#666' },
                    label: { position: 'end' },
                    data: [
                        { xAxis: gradePassRate, name: '年级及格率' },
                        { yAxis: gradeAvg, name: '年级平均分' }
                    ]
                }
            }
        ]
    };

    myChart.setOption(option);
}

/**
 * 渲染单科等级构成饼图
 * @param {string} elementId - DOM 元素 ID
 * @param {Object} subjectStats - 科目统计数据
 */
export function renderSingleSubjectPie(elementId, subjectStats) {
    const myChart = getChartInstance(elementId);
    if (!myChart) return;

    if (!subjectStats || !subjectStats.scores || subjectStats.scores.length === 0) {
        document.getElementById(elementId).innerHTML = '<p style="text-align:center;padding-top:50px;color:#999;">无数据</p>';
        return;
    }

    // 计算各等级人数（需要从统计数据中获取，这里简化处理）
    const excellentCount = subjectStats.excellentCount || 0;
    const goodCount = subjectStats.goodCount || 0;
    const passCount = (subjectStats.passCount || 0) - goodCount;
    const failCount = subjectStats.failCount || 0;

    const data = [
        { name: 'A (优秀)', value: excellentCount, itemStyle: { color: '#28a745' } },
        { name: 'B (良好)', value: goodCount, itemStyle: { color: '#17a2b8' } },
        { name: 'C (及格)', value: passCount, itemStyle: { color: '#ffc107' } },
        { name: 'D (不及格)', value: failCount, itemStyle: { color: '#dc3545' } }
    ];

    const option = {
        title: { text: 'A/B/C/D 等级构成', left: 'center' },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}人 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: ['A (优秀)', 'B (良好)', 'C (及格)', 'D (不及格)']
        },
        series: [{
            name: '等级分布',
            type: 'pie',
            radius: '60%',
            data: data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };

    myChart.setOption(option);
}

