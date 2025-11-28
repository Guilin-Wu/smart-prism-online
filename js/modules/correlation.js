/* eslint-disable no-undef */
'use strict';

/**
 * 模块九：学科关联矩阵
 */

import { State } from '../config/state.js';
import { calculateCorrelation } from '../utils/correlation.js';
import { renderCorrelationHeatmapV2, renderCorrelationNetwork, renderSubjectCentrality } from '../charts/correlation.js';

/**
 * 渲染 Correlation 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderCorrelation(container, data) {
    const { activeData = [], currentFilter = 'ALL' } = data;

    // 渲染基础 HTML
    container.innerHTML = `
        <h2>模块九：学科关联矩阵 (当前筛选: ${currentFilter})</h2>
        <p style="margin-top: -20px; margin-bottom: 20px; color: var(--text-muted);">
            探索学科间的隐性关联。相关系数越接近 1，说明两科成绩"同进退"的趋势越强。
        </p>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <h4 style="margin:0;">🔥 全科相关系数热力图</h4>
            <div class="chart-container" id="correlation-heatmap-chart" style="width: 100%; height: 600px;"></div>
        </div>

        <div class="dashboard-chart-grid-2x2" style="margin-bottom: 20px;">
            <div class="main-card-wrapper">
                <h4 style="margin:0;">🕸️ 学科"引力"网络拓扑图</h4>
                <p style="font-size:0.8em; color:#999; margin:5px 0;">* 线条越粗代表关联越强。抱团的科目通常需要相似的思维能力。</p>
                <div class="chart-container" id="correlation-network-chart" style="height: 450px;"></div>
            </div>
            <div class="main-card-wrapper">
                <h4 style="margin:0;">👑 学科"核心影响力"排行</h4>
                <p style="font-size:0.8em; color:#999; margin:5px 0;">* 核心度 = 该科与其他所有科目相关性的均值。分值越高，代表该科越能反映综合实力。</p>
                <div class="chart-container" id="correlation-centrality-chart" style="height: 450px;"></div>
            </div>
        </div>
    `;

    // 统一计算矩阵数据
    const subjects = State.dynamicSubjectList;
    const n = subjects.length;
    
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    const links = [];
    const centrality = subjects.map(sub => ({ name: sub, totalR: 0, count: 0 }));

    // 双重循环计算矩阵
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                matrix[i][j] = 1.0;
            } else if (i < j) {
                const subA = subjects[i];
                const subB = subjects[j];

                // 提取成对有效数据
                const pairsA = [];
                const pairsB = [];
                
                activeData.forEach(s => {
                    const valA = s.scores[subA];
                    const valB = s.scores[subB];
                    if (typeof valA === 'number' && typeof valB === 'number') {
                        pairsA.push(valA);
                        pairsB.push(valB);
                    }
                });

                const r = calculateCorrelation(pairsA, pairsB);
                const rVal = parseFloat(r.toFixed(2));

                matrix[i][j] = rVal;
                matrix[j][i] = rVal;

                // 收集网络图连线
                if (rVal > 0.35) {
                    links.push({
                        source: subA,
                        target: subB,
                        value: rVal,
                        lineStyle: {
                            width: (rVal - 0.3) * 5,
                            opacity: 0.6 + (rVal * 0.4)
                        }
                    });
                }

                // 累加核心度
                centrality[i].totalR += rVal;
                centrality[i].count++;
                centrality[j].totalR += rVal;
                centrality[j].count++;
            }
        }
    }

    // 渲染图表
    setTimeout(() => {
        if (renderCorrelationHeatmapV2) {
            renderCorrelationHeatmapV2('correlation-heatmap-chart', subjects, matrix);
        }
        if (renderCorrelationNetwork) {
            renderCorrelationNetwork('correlation-network-chart', subjects, links);
        }
        if (renderSubjectCentrality) {
            renderSubjectCentrality('correlation-centrality-chart', centrality);
        }
    }, 100);
}

