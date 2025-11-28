/* eslint-disable no-undef */
'use strict';

/**
 * 模块二：学生个体报告
 */

import { State } from '../config/state.js';
import { addSubjectRanksToData } from '../data/parser.js';
import { calculateFujianAssignedScore } from '../utils/statistics.js';
import { renderStudentRadar } from '../charts/student.js';

/**
 * 渲染 Student 模块
 * @param {HTMLElement} container - 容器元素
 * @param {Object} data - 数据对象 { activeData, activeCompareData, stats, compareStats, currentFilter }
 */
export function renderStudent(container, data) {
    const { activeData = [], activeCompareData = [], stats = {}, currentFilter = 'ALL' } = data;
    
    // 初始化隐藏状态
    if (typeof window.G_HideRank === 'undefined') window.G_HideRank = false;
    
    // 防御性检查：如果发现排名缺失，尝试现场补算
    let students = [...activeData];
    if (students.length > 0 && (!students[0].classRanks || !students[0].gradeRanks)) {
        console.log("检测到排名数据缺失，正在自动补全...");
        students = addSubjectRanksToData(students, State.dynamicSubjectList);
    }

    // 渲染搜索框、操作按钮和结果容器
    container.innerHTML = `
        <h2>模块二：学生个体报告 (当前筛选: ${currentFilter})</h2>
        <div class="controls-bar">
            <label for="student-search">搜索学生 (姓名/考号):</label>
            <div class="search-combobox">
                <input type="text" id="student-search" placeholder="输入姓名或考号..." autocomplete="off">
                <div class="search-results" id="student-search-results"></div>
            </div>
            
            <button id="toggle-rank-btn" class="sidebar-button" style="margin-left: auto; background-color: ${window.G_HideRank ? '#6c757d' : '#fd7e14'};">
                ${window.G_HideRank ? '👁️ 显示排名' : '🚫 隐藏排名'}
            </button>

            <button id="open-print-modal-btn" class="sidebar-button" style="margin-left: 10px; background-color: var(--color-blue);">
                🖨️ 打印报告
            </button>
        </div>
        <div id="student-report-content">
            <p>请输入关键词以搜索学生。</p>
        </div>
    `;

    const searchInput = document.getElementById('student-search');
    const resultsContainer = document.getElementById('student-search-results');
    const contentEl = document.getElementById('student-report-content');
    const openPrintModalBtn = document.getElementById('open-print-modal-btn');
    const toggleRankBtn = document.getElementById('toggle-rank-btn');

    // 绑定隐藏排名按钮事件
    toggleRankBtn.addEventListener('click', () => {
        window.G_HideRank = !window.G_HideRank;
        toggleRankBtn.innerHTML = window.G_HideRank ? '👁️ 显示排名' : '🚫 隐藏排名';
        toggleRankBtn.style.backgroundColor = window.G_HideRank ? '#6c757d' : '#fd7e14';
        const currentStudentId = contentEl.dataset.currentStudentId;
        if (currentStudentId) {
            showReport(currentStudentId);
        }
    });

    // 打印功能
    openPrintModalBtn.addEventListener('click', () => {
        const printModal = document.getElementById('print-modal');
        const printBtnCurrent = document.getElementById('print-btn-current');
        const printBtnFilter = document.getElementById('print-btn-filter');
        
        if (printModal && printBtnCurrent && printBtnFilter) {
            const currentStudentId = contentEl.dataset.currentStudentId;
            if (currentStudentId) {
                const currentStudentName = contentEl.dataset.currentStudentName;
                printBtnCurrent.innerHTML = `🖨️ 打印当前学生 (${currentStudentName})`;
                printBtnCurrent.dataset.studentId = currentStudentId;
                printBtnCurrent.disabled = false;
            } else {
                printBtnCurrent.innerHTML = `🖨️ 打印当前学生 (未选择)`;
                printBtnCurrent.dataset.studentId = '';
                printBtnCurrent.disabled = true;
            }
            const filterText = (currentFilter === 'ALL') ? '全体年段' : currentFilter;
            printBtnFilter.innerHTML = `🖨️ 打印当前筛选 (${filterText})`;
            printModal.style.display = 'flex';
        }
    });

    // 内部函数：显示报告
    const showReport = (studentId) => {
        const student = students.find(s => String(s.id) === String(studentId));
        if (!student) {
            contentEl.innerHTML = `<p>未找到学生。</p>`;
            return;
        }

        contentEl.dataset.currentStudentId = student.id;
        contentEl.dataset.currentStudentName = student.name;

        let oldStudent = null;
        let scoreDiff = 'N/A', rankDiff = 'N/A', gradeRankDiff = 'N/A';

        if (activeCompareData && activeCompareData.length > 0) {
            oldStudent = activeCompareData.find(s => String(s.id) === String(student.id));
        }

        if (oldStudent) {
            scoreDiff = (student.totalScore - oldStudent.totalScore).toFixed(2);
            rankDiff = oldStudent.rank - student.rank;
            gradeRankDiff = (oldStudent.gradeRank && student.gradeRank) ? oldStudent.gradeRank - student.gradeRank : 'N/A';
        }

        // 掩码辅助函数
        const maskRank = (val) => window.G_HideRank ? '***' : val;
        const maskDiff = (diffVal, diffText) => window.G_HideRank ? '' : (diffVal !== 'N/A' && oldStudent ? diffText : '');

        contentEl.innerHTML = `
            <div class="student-card">
                <div class="sc-name"><span>姓名</span><strong>${student.name}</strong></div>
                <div class="sc-id"><span>考号</span><strong>${student.id}</strong></div>
                
                <div class="sc-total">
                    <span>总分 (上次: ${oldStudent ? oldStudent.totalScore : 'N/A'})</span>
                    <strong class="${scoreDiff > 0 ? 'progress' : scoreDiff < 0 ? 'regress' : ''}">
                        ${student.totalScore}
                        ${(scoreDiff !== 'N/A' && oldStudent) ? `(${scoreDiff > 0 ? '▲' : '▼'} ${Math.abs(scoreDiff)})` : ''}
                    </strong>
                </div>

                <div class="sc-rank">
                    <span>班级排名 (上次: ${maskRank(oldStudent ? oldStudent.rank : 'N/A')})</span>
                    <strong class="${rankDiff > 0 ? 'progress' : rankDiff < 0 ? 'regress' : ''}">
                        ${maskRank(student.rank)}
                        ${maskDiff(rankDiff, `(${rankDiff > 0 ? '▲' : '▼'} ${Math.abs(rankDiff)})`)}
                    </strong>
                </div>

                <div class="sc-grade-rank">
                    <span>年级排名 (上次: ${maskRank(oldStudent ? (oldStudent.gradeRank || 'N/A') : 'N/A')})</span>
                    <strong class="${gradeRankDiff > 0 ? 'progress' : gradeRankDiff < 0 ? 'regress' : ''}">
                        ${maskRank(student.gradeRank || 'N/A')}
                        ${maskDiff(gradeRankDiff, `(${gradeRankDiff > 0 ? '▲' : '▼'} ${Math.abs(gradeRankDiff)})`)}
                    </strong>
                </div>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>科目</th>
                            <th>得分 (变化)</th>
                            <th>班级科目排名 (变化)</th>
                            <th>年级科目排名 (变化)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${State.dynamicSubjectList.map(subject => {
            let subjectScoreDiff = 'N/A';
            let subjectClassRankDiff = 'N/A';
            let subjectGradeRankDiff = 'N/A';

            if (oldStudent && oldStudent.scores) {
                const oldScore = oldStudent.scores[subject] || 0;
                const newScore = student.scores[subject] || 0;
                if (oldScore !== 0 || newScore !== 0) {
                    subjectScoreDiff = (newScore - oldScore).toFixed(2);
                }
                if (oldStudent.classRanks && student.classRanks) {
                    const oldClassRank = oldStudent.classRanks[subject] || 0;
                    const newClassRank = student.classRanks[subject] || 0;
                    if (oldClassRank > 0 && newClassRank > 0) {
                        subjectClassRankDiff = oldClassRank - newClassRank;
                    }
                }
                if (oldStudent.gradeRanks && student.gradeRanks) {
                    const oldGradeRank = oldStudent.gradeRanks[subject] || 0;
                    const newGradeRank = student.gradeRanks[subject] || 0;
                    if (oldGradeRank > 0 && newGradeRank > 0) {
                        subjectGradeRankDiff = oldGradeRank - newGradeRank;
                    }
                }
            }

            const config = State.subjectConfigs[subject] || {};
            const isAssignedSubject = config.isAssigned === true;
            let rankBasedScoreDisplay = '';
            if (isAssignedSubject) {
                const allScoresForSubject = State.studentsData.map(s => s.scores[subject]);
                const fujianScore = calculateFujianAssignedScore(student.scores[subject], allScoresForSubject);
                rankBasedScoreDisplay = `<div style="font-size:0.85em; color:#6f42c1; margin-top:4px; font-weight:bold;">赋分: ${fujianScore}</div>`;
            } else {
                rankBasedScoreDisplay = `<div style="font-size:0.8em; color:#aaa; margin-top:4px;">(原始分)</div>`;
            }

            const tScore = (student.tScores && student.tScores[subject]) ? student.tScores[subject] : 'N/A';
            let tScoreDiffHtml = '';
            if (oldStudent && oldStudent.tScores && oldStudent.tScores[subject]) {
                const oldTScore = oldStudent.tScores[subject];
                if (tScore !== 'N/A') {
                    const diff = tScore - oldTScore;
                    const diffAbs = Math.abs(diff).toFixed(1);
                    if (diff > 0) tScoreDiffHtml = `<span class="progress" style="font-size:0.9em; margin-left:4px;">(▲${diffAbs})</span>`;
                    else if (diff < 0) tScoreDiffHtml = `<span class="regress" style="font-size:0.9em; margin-left:4px;">(▼${diffAbs})</span>`;
                }
            }

            return `
                                <tr>
                                    <td>${subject}</td>
                                    <td>
                                        <div>
                                            ${student.scores[subject] || 0}
                                            ${(oldStudent && subjectScoreDiff !== 'N/A') ? `<span class="${subjectScoreDiff > 0 ? 'progress' : subjectScoreDiff < 0 ? 'regress' : ''}" style="font-size:0.8em">(${subjectScoreDiff > 0 ? '▲' : '▼'} ${Math.abs(subjectScoreDiff)})</span>` : ''}
                                        </div>
                                        <div style="font-size:0.8em; color:#666; margin-top:4px;">
                                            T分: <strong>${tScore}</strong> ${tScoreDiffHtml}
                                        </div>
                                    </td>
                                    <td>
                                        ${maskRank(student.classRanks ? (student.classRanks[subject] || 'N/A') : 'N/A')}
                                        ${maskDiff(subjectClassRankDiff, `<span class="${subjectClassRankDiff > 0 ? 'progress' : subjectClassRankDiff < 0 ? 'regress' : ''}" style="font-size:0.8em">(${subjectClassRankDiff > 0 ? '▲' : '▼'} ${Math.abs(subjectClassRankDiff)})</span>`)}
                                    </td>
                                    <td>
                                        <div>
                                            ${maskRank(student.gradeRanks ? (student.gradeRanks[subject] || 'N/A') : 'N/A')}
                                            ${maskDiff(subjectGradeRankDiff, `<span class="${subjectGradeRankDiff > 0 ? 'progress' : subjectGradeRankDiff < 0 ? 'regress' : ''}" style="font-size:0.8em">(${subjectGradeRankDiff > 0 ? '▲' : '▼'} ${Math.abs(subjectGradeRankDiff)})</span>`)}
                                        </div>
                                        ${rankBasedScoreDisplay}
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="main-card-wrapper" style="margin-top: 20px;">
                <div class="chart-container" id="student-radar-chart" style="height: 400px;"></div>
            </div>
        `;

        // 渲染雷达图
        setTimeout(() => {
            if (renderStudentRadar) {
                renderStudentRadar('student-radar-chart', student, stats);
            }
        }, 100);
    };

    // 监听搜索输入
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length < 1) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
        }
        const filteredStudents = students.filter(s => {
            return String(s.name).toLowerCase().includes(searchTerm) ||
                String(s.id).toLowerCase().includes(searchTerm);
        }).slice(0, 50);

        if (filteredStudents.length === 0) {
            resultsContainer.innerHTML = '<div class="result-item">-- 未找到 --</div>';
        } else {
            resultsContainer.innerHTML = filteredStudents.map(s => {
                return `<div class="result-item" data-id="${s.id}">
                    <strong>${s.name}</strong> (${s.id}) - 班排: ${window.G_HideRank ? '***' : s.rank}
                </div>`;
            }).join('');
        }
        resultsContainer.style.display = 'block';
    });

    resultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (item && item.dataset.id) {
            const studentId = item.dataset.id;
            searchInput.value = `${item.querySelector('strong').innerText} (${studentId})`;
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            showReport(studentId);
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', () => {
        if (resultsContainer.innerHTML !== '') {
            resultsContainer.style.display = 'block';
        }
    });
}

