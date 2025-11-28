/* eslint-disable no-undef */
'use strict';

/**
 * 模块八：学生分层筛选
 */

import { State } from '../config/state.js';
import { calculateAllStatistics } from '../utils/statistics.js';
import { renderGroupClassPie, renderGroupRadarChart } from '../charts/groups.js';

/**
 * 渲染 Groups 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderGroups(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;

    // 渲染筛选器卡片
    container.innerHTML = `
        <h2>模块八：学生分层筛选 (当前筛选: ${currentFilter})</h2>
        
        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; margin-bottom: 0; flex-wrap: wrap;">
                <label for="group-subject">筛选科目:</label>
                <select id="group-subject" class="sidebar-select">
                    <option value="totalScore">总分</option>
                    ${State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <input type="number" id="group-min" placeholder="最低分" value="0">
                <label for="group-max"> <= 分数 <= </label>
                <input type="number" id="group-max" placeholder="最高分" value="900">
                <button id="group-filter-btn" class="sidebar-button">筛选</button>
            </div>
            
            <div class="shortcut-btn-group">
                <label style="font-size: 0.9em; color: var(--text-muted); align-self: center;">快捷方式:</label>
                <button class="shortcut-btn" data-type="A">A (优秀)</button>
                <button class="shortcut-btn" data-type="B">B (良好)</button>
                <button class="shortcut-btn" data-type="C">C (及格)</button>
                <button class="shortcut-btn" data-type="D">D (不及格)</button>
            </div>
        </div>

        <div class="main-card-wrapper" id="group-results-wrapper" style="display: none;">
            <div id="group-results-table"></div>

            <div class="dashboard-chart-grid-2x2" style="margin-top: 20px;">
                <div class="main-card-wrapper" style="padding: 10px;">
                    <h4 style="margin:0 0 10px 0; text-align:center;">🥧 筛选群体的班级构成</h4>
                    <div class="chart-container" id="group-class-pie-chart" style="height: 350px;"></div>
                </div>
                <div class="main-card-wrapper" style="padding: 10px;">
                    <h4 style="margin:0 0 10px 0; text-align:center;">🕸️ 群体能力 vs 全体平均</h4>
                    <p style="font-size:0.8em; color:#999; text-align:center; margin:0;">(基于各科得分率/难度系数对比)</p>
                    <div class="chart-container" id="group-radar-chart" style="height: 350px;"></div>
                </div>
            </div>
        </div>
    `;

    // 绑定事件
    const subjectSelect = document.getElementById('group-subject');
    const minInput = document.getElementById('group-min');
    const maxInput = document.getElementById('group-max');
    const filterBtn = document.getElementById('group-filter-btn');
    const resultsWrapper = document.getElementById('group-results-wrapper');
    const tableEl = document.getElementById('group-results-table');
    const shortcutBtns = document.querySelectorAll('.shortcut-btn');

    // 快捷按钮事件
    shortcutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const subject = subjectSelect.value;
            let config;
            let min = 0, max = 0;

            if (subject === 'totalScore') {
                const full = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.full || 0), 0);
                const excel = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.excel || 0), 0);
                const good = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.good || 0), 0);
                const pass = State.dynamicSubjectList.reduce((sum, key) => sum + (State.subjectConfigs[key]?.pass || 0), 0);
                config = { full: full, excel: excel, good: good, pass: pass };
            } else {
                config = State.subjectConfigs[subject] || {};
            }

            const goodLine = config.good || 0;

            switch (type) {
                case 'A': min = config.excel || 0; max = config.full || 0; break;
                case 'B': min = goodLine; max = config.excel || 0; break;
                case 'C': min = config.pass || 0; max = goodLine; break;
                case 'D': min = 0; max = config.pass || 0; break;
            }

            minInput.value = Math.floor(min);
            maxInput.value = Math.ceil(max);
        });
    });

    // 筛选按钮事件
    filterBtn.addEventListener('click', () => {
        const subject = subjectSelect.value;
        const min = parseFloat(minInput.value);
        const max = parseFloat(maxInput.value);

        const filteredStudents = activeData.filter(s => {
            const score = (subject === 'totalScore') ? s.totalScore : s.scores[subject];
            return score >= min && score <= max;
        });

        resultsWrapper.style.display = 'block';

        if (filteredStudents.length === 0) {
            tableEl.innerHTML = `<p>在 ${min} - ${max} 分数段内没有找到学生。</p>`;
            const pieChart = document.getElementById('group-class-pie-chart');
            const radarChart = document.getElementById('group-radar-chart');
            if (pieChart) pieChart.innerHTML = '';
            if (radarChart) radarChart.innerHTML = '';
            return;
        }

        tableEl.innerHTML = `
            <h4>筛选结果 (共 ${filteredStudents.length} 人)</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>班排</th>
                            <th>姓名</th>
                            <th>考号</th>
                            <th>${subject === 'totalScore' ? '总分' : subject}</th>
                            <th>年排</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStudents.map(s => `
                        <tr>
                            <td>${s.rank}</td>
                            <td>${s.name}</td>
                            <td>${s.id}</td>
                            <td><strong>${subject === 'totalScore' ? s.totalScore : s.scores[subject]}</strong></td>
                            <td>${s.gradeRank || 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // 渲染图表
        setTimeout(() => {
            if (renderGroupClassPie) {
                renderGroupClassPie('group-class-pie-chart', filteredStudents);
            }

            // 确保传入有效的全体统计数据
            let globalStats = stats;
            if (!globalStats || Object.keys(globalStats).length === 0) {
                globalStats = calculateAllStatistics(State.studentsData, State.dynamicSubjectList, State.subjectConfigs);
            }
            
            if (renderGroupRadarChart) {
                renderGroupRadarChart('group-radar-chart', filteredStudents, globalStats);
            }
        }, 100);
    });
}

