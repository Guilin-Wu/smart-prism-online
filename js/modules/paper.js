/* eslint-disable no-undef */
'use strict';

/**
 * 模块三：试卷科目分析
 */

import { State } from '../config/state.js';
import { renderHistogram } from '../charts/common.js';
import { renderSubjectComparisonBarChart } from '../charts/common.js';
import { renderDifficultyScatter } from '../charts/paper.js';

/**
 * 渲染 Paper 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderPaper(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;

    // 渲染 HTML 结构
    container.innerHTML = `
        <h2>模块三：试卷科目分析 (当前筛选: ${currentFilter})</h2>
        
        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls" style="align-items:center; flex-wrap:wrap;">
                <label for="subject-select">选择科目:</label>
                <select id="subject-select" class="sidebar-select" style="margin-right:15px;">
                    <option value="totalScore">总分</option>
                    ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                
                <div style="display:flex; align-items:center; margin-right:15px;">
                    <input type="checkbox" id="paper-compare-class" style="margin-right:5px; cursor:pointer;">
                    <label for="paper-compare-class" style="cursor:pointer; user-select:none; font-weight:bold; color:#007bff;">对比各班</label>
                </div>
                
                <label for="paper-bin-size">分段大小:</label>
                <input type="number" id="paper-bin-size" value="10" style="width: 60px;">
                <button id="paper-redraw-btn" class="sidebar-button" style="width: auto; margin-left:10px;">重绘</button>
            </div>
            <div class="chart-container" id="subject-histogram-chart" style="width: 100%; height: 500px;"></div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls">
                <h4 style="margin:0;">各科难度系数对比</h4>
                <span style="font-size: 0.8em; color: var(--text-muted);">(难度 = 平均分 / 满分, 越高越简单)</span>
            </div>
            <div class="chart-container" id="difficulty-chart" style="width: 100%; height: 500px;"></div>
        </div>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls">
                <h4 style="margin:0;">各科区分度对比 (标准差)</h4>
                <span style="font-size: 0.8em; color: var(--text-muted);">(标准差越大, 越能拉开差距)</span>
            </div>
            <div class="chart-container" id="discrimination-chart" style="width: 100%; height: 500px;"></div>
        </div>

        <div class="main-card-wrapper">
            <div class="controls-bar chart-controls" style="display: block;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin:0;">难度-区分度 散点图</h4>
                </div>
                
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px 15px; font-size: 0.85em; color: #555;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <strong style="color: #fd7e14;">↖ 左上 (难 + 拉分)</strong>：<strong>胜负手</strong>。题目难且能拉开差距，决定尖子生排名。
                        </div>
                        <div>
                            <strong style="color: #28a745;">↗ 右上 (易 + 拉分)</strong>：<strong>黄金区</strong>。题目适中，既照顾基础又能选拔人才。
                        </div>
                        <div>
                            <strong style="color: #dc3545;">↙ 左下 (难 + 不拉分)</strong>：<strong>无效难</strong>。太难了大家都不会，无法区分水平。
                        </div>
                        <div>
                            <strong style="color: #007bff;">↘ 右下 (易 + 不拉分)</strong>：<strong>福利局</strong>。题目简单，大家分都高，不论英雄。
                        </div>
                    </div>
                    <div style="margin-top: 8px; border-top: 1px dashed #dee2e6; padding-top: 5px; color: #888;">
                        * 气泡大小代表科目满分权重 (如语数英气泡更大)。
                    </div>
                </div>
            </div>
            <div class="chart-container" id="difficulty-scatter-chart" style="width: 100%; height: 500px;"></div>
        </div>
    `;

    // 绘制直方图
    const drawChart = () => {
        const subjectName = document.getElementById('subject-select').value;
        const binSize = parseInt(document.getElementById('paper-bin-size').value) || 10;
        const isClassCompare = document.getElementById('paper-compare-class').checked;
        
        const s = stats[subjectName];
        if (!s) return;

        let fullScore;
        if (subjectName === 'totalScore') {
            fullScore = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.full || 0), 0);
        } else {
            fullScore = State.subjectConfigs[subjectName]?.full || 100;
        }

        // 如果是对比模式，使用所有数据；否则使用筛选数据
        const sourceData = isClassCompare ? State.studentsData : activeData;

        if (renderHistogram) {
            renderHistogram(
                'subject-histogram-chart',
                sourceData,
                subjectName,
                fullScore,
                `${s.name} 分数段分布图 (分段=${binSize})`,
                binSize,
                isClassCompare
            );
        }
    };

    // 绑定事件
    const subjectSelect = document.getElementById('subject-select');
    const redrawBtn = document.getElementById('paper-redraw-btn');
    const compareCheckbox = document.getElementById('paper-compare-class');

    if (subjectSelect) subjectSelect.addEventListener('change', drawChart);
    if (redrawBtn) redrawBtn.addEventListener('click', drawChart);
    if (compareCheckbox) compareCheckbox.addEventListener('change', drawChart);

    // 绘制其他图表
    setTimeout(() => {
        if (renderSubjectComparisonBarChart) {
            renderSubjectComparisonBarChart('difficulty-chart', stats, 'difficulty');
            renderSubjectComparisonBarChart('discrimination-chart', stats, 'stdDev');
        }
        if (renderDifficultyScatter) {
            renderDifficultyScatter('difficulty-scatter-chart', stats);
        }
        // 默认绘制总分
        drawChart();
    }, 100);
}

