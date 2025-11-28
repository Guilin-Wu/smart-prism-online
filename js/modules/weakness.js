/* eslint-disable no-undef */
'use strict';

/**
 * 模块十：学生偏科诊断
 */

import { State } from '../config/state.js';
import { calculateWeaknessData } from '../utils/weakness.js';
import { renderWeaknessScatter } from '../charts/weakness.js';

/**
 * 渲染 Weakness 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderWeakness(container, data) {
    const { activeData = [], stats = {}, currentFilter = 'ALL' } = data;

    // 渲染基础 HTML
    container.innerHTML = `
        <h2>模块十：学生偏科诊断 (当前筛选: ${currentFilter})</h2>
        <p style="margin-top: -20px; margin-bottom: 20px; color: var(--text-muted);">
            分析学生的学科均衡度，快速定位"高分低能"或"严重偏科"的学生。
        </p>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar chart-controls">
                <h4 style="margin:0;">偏科程度四象限图</h4>
                <span style="font-size: 0.8em; color: var(--text-muted);">(右上: 尖子生有短板 | 右下: 学霸全能 | 左上: 基础差且偏科 | 左下: 基础差但均衡)</span>
            </div>
            <div class="chart-container" id="weakness-scatter-chart" style="width: 100%; height: 500px;"></div>
        </div>

        <div class="main-card-wrapper">
            <div class="controls-bar chart-controls" style="justify-content: space-between;">
                <h4 style="margin:0;">学生偏科诊断总表</h4>
                <span style="font-size: 0.8em; color: var(--text-muted);">(按"最弱项偏离度"排序)</span>
            </div>

            <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0 0 15px 0; flex-wrap: wrap; gap: 10px;">
                <label for="weakness-class-filter">班级:</label>
                <select id="weakness-class-filter" class="sidebar-select" style="min-width: 120px;">
                    <option value="ALL">-- 全部 --</option>
                </select>

                <label for="weakness-search" style="margin-left: 10px;">搜索:</label>
                <input type="text" id="weakness-search" placeholder="输入姓名或考号..." style="width: 150px;">

                <button id="weakness-print-btn" class="sidebar-button" style="background-color: var(--color-blue); margin-left: auto;">
                    🖨️ 打印表格
                </button>
            </div>

            <div class="table-container" id="weakness-table-container"></div>

            <div id="weakness-detail-container" style="margin-top: 20px; display: none;"></div>
        </div>
    `;

    // 计算偏科数据
    const weaknessData = calculateWeaknessData(activeData, stats);

    // 渲染图表
    setTimeout(() => {
        if (renderWeaknessScatter) {
            renderWeaknessScatter('weakness-scatter-chart', weaknessData, stats);
        }
    }, 100);

    // 渲染表格
    renderWeaknessTable('weakness-table-container', weaknessData);

    // 绑定主表点击事件
    const tableContainer = document.getElementById('weakness-table-container');
    const detailContainer = document.getElementById('weakness-detail-container');

    if (tableContainer) {
        tableContainer.addEventListener('click', (e) => {
            const row = e.target.closest('tr[data-id]');
            if (!row) return;

            const studentId = row.dataset.id;
            const studentData = weaknessData.find(d => String(d.student.id) === String(studentId));

            if (studentData && detailContainer) {
                renderWeaknessDetail(detailContainer, studentData);
                detailContainer.style.display = 'block';
                detailContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

/**
 * 渲染偏科诊断表格
 * @param {string} elementId - DOM 元素 ID
 * @param {Array} weaknessData - 偏科数据
 */
function renderWeaknessTable(elementId, weaknessData) {
    const tableContainer = document.getElementById(elementId);
    if (!tableContainer) return;

    // 创建列表
    const studentWeaknessList = weaknessData.map(data => {
        if (!data.subjectDeviations || data.subjectDeviations.length === 0) {
            return {
                name: data.student.name,
                id: data.student.id,
                className: data.student.class,
                avgZScore: data.avgZScore,
                weakestSubject: 'N/A',
                weakestDeviation: 0,
                weakestZScore: 'N/A'
            };
        }

        // 找到偏离度最小的科目
        const weakest = data.subjectDeviations.reduce((minSub, currentSub) => {
            return currentSub.deviation < minSub.deviation ? currentSub : minSub;
        }, data.subjectDeviations[0]);

        return {
            name: data.student.name,
            id: data.student.id,
            className: data.student.class,
            avgZScore: data.avgZScore,
            weakestSubject: weakest.subject,
            weakestDeviation: weakest.deviation,
            weakestZScore: weakest.zScore
        };
    });

    // 默认排序
    studentWeaknessList.sort((a, b) => a.weakestDeviation - b.weakestDeviation);

    // 填充班级下拉框
    const classSelect = document.getElementById('weakness-class-filter');
    if (classSelect) {
        const uniqueClasses = [...new Set(studentWeaknessList.map(s => s.className))].sort();
        let opts = `<option value="ALL">-- 全部班级 --</option>`;
        uniqueClasses.forEach(c => {
            opts += `<option value="${c}">${c}</option>`;
        });
        classSelect.innerHTML = opts;
    }

    // 渲染表格函数
    const drawTable = () => {
        const searchInput = document.getElementById('weakness-search');
        const classFilter = document.getElementById('weakness-class-filter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedClass = classFilter ? classFilter.value : 'ALL';

        const filteredList = studentWeaknessList.filter(item => {
            const matchSearch = String(item.name).toLowerCase().includes(searchTerm) ||
                String(item.id).toLowerCase().includes(searchTerm);
            const matchClass = (selectedClass === 'ALL') || (item.className === selectedClass);
            return matchSearch && matchClass;
        });

        let html = ``;
        if (filteredList.length === 0) {
            html = `<p style="text-align: center; padding: 20px; color: var(--text-muted);">未找到匹配的学生。</p>`;
        } else {
            html = `
                <table>
                    <thead>
                        <tr>
                            <th>班级</th>
                            <th>学生姓名</th>
                            <th>考号</th>
                            <th>最弱科目</th>
                            <th>最弱项偏离度</th>
                            <th>最弱项Z-Score</th>
                            <th>学生平均Z-Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredList.map(item => `
                            <tr data-id="${item.id}" style="cursor: pointer;">
                                <td>${item.className}</td>
                                <td><strong>${item.name}</strong></td>
                                <td>${item.id}</td>
                                <td><strong>${item.weakestSubject}</strong></td>
                                <td><strong class="${item.weakestDeviation < -0.5 ? 'regress' : ''}">${item.weakestDeviation.toFixed(2)}</strong></td>
                                <td>${item.weakestZScore !== 'N/A' ? item.weakestZScore.toFixed(2) : 'N/A'}</td>
                                <td>${item.avgZScore.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top:10px; font-size:0.85em; color:#666; text-align:right;">
                    共筛选出 ${filteredList.length} 人
                </div>
            `;
        }
        tableContainer.innerHTML = html;
    };

    // 绑定事件
    const searchInput = document.getElementById('weakness-search');
    if (searchInput) searchInput.addEventListener('input', drawTable);
    if (classSelect) classSelect.addEventListener('change', drawTable);

    // 绑定打印按钮
    const printBtn = document.getElementById('weakness-print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', async () => {
            const content = tableContainer.innerHTML;
            if (!content || content.includes('未找到匹配')) {
                alert('当前列表为空，无法打印。');
                return;
            }

            let examName = "本次考试";
            try {
                const name = await localforage.getItem('G_MainFileName');
                if (name) examName = name;
                else {
                    examName = localStorage.getItem('G_MainFileName') || "本次考试";
                }
            } catch (e) {
                console.warn("无法读取考试名称", e);
            }

            const selectedClassVal = classSelect ? classSelect.value : 'ALL';
            const subTitle = selectedClassVal === 'ALL' ? '全体学生' : selectedClassVal;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>${examName} - 偏科诊断表</title>
                    <style>
                        body { font-family: "Segoe UI", Arial, sans-serif; padding: 30px; color: #333; }
                        h2 { text-align: center; margin-bottom: 5px; }
                        h4 { text-align: center; margin-top: 0; color: #666; font-weight: normal; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                        th, td { border: 1px solid #333; padding: 8px; text-align: center; }
                        th { background-color: #f0f0f0; }
                        .regress { color: red; font-weight: bold; }
                        @media print {
                           .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h2>${examName} - 学生偏科诊断表</h2>
                    <h4>范围：${subTitle} | 生成时间：${new Date().toLocaleString()}</h4>
                    ${content}
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        });
    }

    // 初始绘制
    drawTable();
}

/**
 * 渲染单个学生的详细偏科表
 * @param {HTMLElement} containerElement - 容器元素
 * @param {Object} studentData - 学生偏科数据
 */
function renderWeaknessDetail(containerElement, studentData) {
    const student = studentData.student;
    const deviations = [...studentData.subjectDeviations];

    // 按偏离度升序排序
    deviations.sort((a, b) => a.deviation - b.deviation);

    let html = `
        <h4>${student.name} (${student.id}) - 各科偏离度详情</h4>
        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
            <table>
                <thead>
                    <tr>
                        <th>科目</th>
                        <th>科目分数</th>
                        <th>该科Z-Score</th>
                        <th>学生平均Z-Score</th>
                        <th>偏离度 (该科Z - 均Z)</th>
                    </tr>
                </thead>
                <tbody>
                    ${deviations.map(item => `
                        <tr>
                            <td><strong>${item.subject}</strong></td>
                            <td style="font-weight:bold; color:#555;">
                                ${student.scores[item.subject] !== undefined ? student.scores[item.subject] : '-'}
                            </td>
                            <td>${item.zScore.toFixed(2)}</td>
                            <td>${studentData.avgZScore.toFixed(2)}</td>
                            <td>
                                <strong class="${item.deviation < -0.5 ? 'regress' : (item.deviation > 0.5 ? 'progress' : '')}">
                                    ${item.deviation.toFixed(2)}
                                </strong>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    containerElement.innerHTML = html;
}

