/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';

/**
 * 辅助: 渲染趋势图
 */
export function renderGoalTrendChart(elemId, xData, yData, titleText) {
    const dom = document.getElementById(elemId);
    if (!dom) return;
    
    const echartsInstances = State.echartsInstances || window.echartsInstances || {};
    if (echartsInstances[elemId]) echartsInstances[elemId].dispose();
    
    const myChart = echarts.init(dom);
    const option = {
        title: { text: titleText, left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis', formatter: '{b}<br/>达成率: {c}%' },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: { type: 'category', data: xData, axisLabel: { rotate: 30 } },
        yAxis: { type: 'value', name: '达成率 (%)', min: (val) => Math.floor(val.min * 0.9), max: (val) => Math.ceil(val.max * 1.05) },
        series: [{
            data: yData, type: 'line', smooth: true,
            markLine: { data: [{ yAxis: 100, name: '100% 目标线', lineStyle: { color: 'green', type: 'dashed' } }] },
            itemStyle: { color: '#6f42c1' },
            label: { show: true, position: 'top', formatter: '{c}%' }
        }]
    };
    myChart.setOption(option);
    echartsInstances[elemId] = myChart;
    if (State.echartsInstances) State.echartsInstances[elemId] = myChart;
}

/**
 * [图表] 提分路径瀑布图
 */
export function renderGoalWaterfall(elementId, currentTotal, targetTotal, details) {
    const dom = document.getElementById(elementId);
    if (!dom) return;
    
    const echartsInstances = State.echartsInstances || window.echartsInstances || {};
    if (echartsInstances[elementId]) echartsInstances[elementId].dispose();
    
    const myChart = echarts.init(dom);

    // 过滤掉提分为0的科目，避免图表太长
    const validDetails = details.filter(d => d.gain > 0.1);

    const xData = ['当前总分', ...validDetails.map(d => d.subject), '目标总分'];

    // 辅助数据构建
    // 瀑布图原理：透明柱子垫底
    let currentStack = currentTotal;
    const placeholders = [0]; // 第一根柱子起点0
    const values = [currentTotal]; // 第一根柱子高度

    validDetails.forEach(d => {
        placeholders.push(currentStack); // 垫高
        values.push(parseFloat(d.gain.toFixed(1))); // 增量
        currentStack += d.gain;
    });

    // 最后一根柱子 (目标)
    placeholders.push(0);
    values.push(parseFloat(targetTotal.toFixed(1)));

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function (params) {
                let tar = params[1]; // 实际显示的柱子
                return `${tar.name}<br/>${tar.seriesName} : ${tar.value}`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            splitLine: { show: false },
            data: xData
        },
        yAxis: {
            type: 'value',
            min: Math.floor(currentTotal * 0.9) // Y轴不从0开始，显示差异更明显
        },
        series: [
            {
                name: '辅助',
                type: 'bar',
                stack: '总量',
                itemStyle: {
                    barBorderColor: 'rgba(0,0,0,0)',
                    color: 'rgba(0,0,0,0)'
                },
                emphasis: {
                    itemStyle: {
                        barBorderColor: 'rgba(0,0,0,0)',
                        color: 'rgba(0,0,0,0)'
                    }
                },
                data: placeholders
            },
            {
                name: '分数',
                type: 'bar',
                stack: '总量',
                label: {
                    show: true,
                    position: 'top'
                },
                data: values.map((val, idx) => {
                    // 第一列和最后一列颜色不同
                    if (idx === 0) return { value: val, itemStyle: { color: '#6c757d' } };
                    if (idx === values.length - 1) return { value: val, itemStyle: { color: '#28a745' } };
                    return { value: val, itemStyle: { color: '#6f42c1' } }; // 增量部分紫色
                })
            }
        ]
    };
    myChart.setOption(option);
    echartsInstances[elementId] = myChart;
    if (State.echartsInstances) State.echartsInstances[elementId] = myChart;
}

/**
 * [图表] 现状 vs 目标 雷达图
 */
export function renderGoalRadar(elementId, student, details) {
    const dom = document.getElementById(elementId);
    if (!dom) return;
    
    const echartsInstances = State.echartsInstances || window.echartsInstances || {};
    if (echartsInstances[elementId]) echartsInstances[elementId].dispose();
    
    const myChart = echarts.init(dom);

    const indicators = [];
    const currentData = [];
    const targetData = [];

    // 将 details 转为 map 方便查找
    const detailMap = {};
    details.forEach(d => detailMap[d.subject] = d);

    const subjectList = State.dynamicSubjectList || window.G_DynamicSubjectList || [];
    const subjectConfigs = State.subjectConfigs || window.G_SubjectConfigs || {};

    subjectList.forEach(subject => {
        const config = subjectConfigs[subject] || { full: 100 };
        indicators.push({ name: subject, max: config.full });

        currentData.push(student.scores[subject] || 0);

        const d = detailMap[subject];
        targetData.push(d ? parseFloat(d.target.toFixed(1)) : (student.scores[subject] || 0));
    });

    const option = {
        tooltip: {},
        legend: { data: ['当前成绩', '规划目标'], bottom: 0 },
        radar: {
            indicator: indicators,
            radius: '65%'
        },
        series: [{
            name: '当前 vs 目标',
            type: 'radar',
            data: [
                {
                    value: currentData,
                    name: '当前成绩',
                    itemStyle: { color: '#6c757d' },
                    areaStyle: { opacity: 0.2 }
                },
                {
                    value: targetData,
                    name: '规划目标',
                    itemStyle: { color: '#6f42c1' }, // 紫色代表目标
                    lineStyle: { type: 'dashed' },
                    areaStyle: { opacity: 0.1, color: '#6f42c1' }
                }
            ]
        }]
    };
    myChart.setOption(option);
    echartsInstances[elementId] = myChart;
    if (State.echartsInstances) State.echartsInstances[elementId] = myChart;
}

/**
 * [辅助] 3维雷达图渲染 (基准 vs 目标 vs 实际)
 */
export function renderGoalRadarComparison(elemId, details, actualStudent) {
    const dom = document.getElementById(elemId);
    if (!dom) return;
    
    const echartsInstances = State.echartsInstances || window.echartsInstances || {};
    if (echartsInstances[elemId]) echartsInstances[elemId].dispose();
    
    const myChart = echarts.init(dom);

    const indicators = [];
    const dataBaseline = [];
    const dataTarget = [];
    const dataActual = [];

    details.forEach(d => {
        // 估算满分
        const full = d.current + d.room;
        indicators.push({ name: d.subject, max: full });
        dataBaseline.push(d.current);
        dataTarget.push(d.target);
        if (actualStudent) {
            dataActual.push(actualStudent.scores[d.subject] || 0);
        }
    });

    const seriesData = [
        { value: dataBaseline, name: '基准成绩', itemStyle: { color: '#6c757d' }, lineStyle: { type: 'dotted' } },
        { value: dataTarget, name: '规划目标', itemStyle: { color: '#6f42c1' }, areaStyle: { opacity: 0.1, color: '#6f42c1' } }
    ];

    if (actualStudent) {
        seriesData.push({
            value: dataActual,
            name: '实际成绩',
            itemStyle: { color: '#fd7e14' }, // 橙色
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.2, color: '#fd7e14' }
        });
    }

    const option = {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        radar: { indicator: indicators, radius: '60%' },
        series: [{ type: 'radar', data: seriesData }]
    };
    myChart.setOption(option);
    echartsInstances[elemId] = myChart;
    if (State.echartsInstances) State.echartsInstances[elemId] = myChart;
}

