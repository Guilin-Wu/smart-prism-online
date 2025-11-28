/* eslint-disable no-undef */
'use strict';

import { State } from '../config/state.js';

/**
 * 模块十七：综合评语助手
 * 渲染评语生成器界面
 */
export async function renderCommentGenerator(container) {
    const multiData = await window.loadMultiExamData();

    if (!multiData || multiData.length === 0) {
        container.innerHTML = `<div class="main-card-wrapper" style="text-align:center; padding:50px; color:#666;">⚠️ 请先在"数据管理中心"导入考试数据。</div>`;
        return;
    }

    // 1. 数据聚合
    const studentMap = new Map();
    const classSet = new Set();

    multiData.forEach(exam => {
        if (exam.isHidden) return;
        exam.students.forEach(s => {
            if (!studentMap.has(s.id)) {
                studentMap.set(s.id, {
                    info: { name: s.name, class: s.class, id: s.id },
                    exams: []
                });
            }
            const record = studentMap.get(s.id);
            record.info.class = s.class;
            classSet.add(s.class);
            record.exams.push({
                label: exam.label,
                totalScore: s.totalScore,
                rank: s.rank,
                gradeRank: s.gradeRank
            });
        });
    });

    const classes = Array.from(classSet).sort();
    let currentSortMode = 'rank';

    // 2. 渲染 UI
    container.innerHTML = `
        <h2>✍️ 模块十七：综合评语助手</h2>

        <div class="main-card-wrapper" style="border-left: 5px solid #20c997; margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <div>
                        <label style="font-weight:600; font-size:0.9em; color:#555;">班级:</label>
                        <select id="comment-class-select" class="sidebar-select" style="width:auto; min-width:120px; font-weight:bold;">
                            ${classes.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <label style="font-weight:600; font-size:0.9em; color:#6f42c1;">依据:</label>
                        <select id="comment-gen-mode" class="sidebar-select" style="width:auto; min-width:180px; border-color:#6f42c1; color:#6f42c1; font-weight:bold;">
                            <option value="comprehensive" selected>🌟 综合 (历史趋势+日常)</option>
                            <option value="history_only">📈 仅历史成绩趋势</option>
                            <option value="current_only">🎯 仅本次成绩</option>
                            <option value="daily_only">📝 仅日常行为表现</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button id="btn-toggle-archive" class="sidebar-button" style="background-color: #6c757d; font-size: 0.9em;">📂 评语存档库</button>
                    <button id="btn-gen-rule" class="sidebar-button" style="background-color: #17a2b8; font-size: 0.9em;">⚡️ 规则生成</button>
                    <button id="btn-gen-ai-batch" class="sidebar-button" style="background-color: #6f42c1; font-size: 0.9em;">🤖 AI 批量生成</button>
                    <button id="btn-export-comments" class="sidebar-button" style="background-color: var(--color-green); font-size: 0.9em;">📥 导出</button>
                </div>
            </div>

            <div id="archive-panel" style="display:none; margin-top:15px; padding-top:15px; border-top:1px dashed #ccc; background-color:#fcfcfc; padding:15px; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h4 style="margin:0; font-size:1em; color:#555;">📚 历史评语存档</h4>
                    <button id="btn-save-library" class="sidebar-button" style="background-color: #28a745; padding:4px 10px; font-size: 0.8em;">💾 保存当前表格</button>
                </div>
                <div id="comment-library-list" style="max-height: 150px; overflow-y: auto; border:1px solid #eee; background:#fff; border-radius:4px;">
                    <div style="padding:15px; text-align:center; color:#999;">加载中...</div>
                </div>
            </div>
            
            <div id="ai-batch-progress" style="display:none; margin-top:15px; background:#fff; padding:10px; border:1px solid #e9ecef; border-radius:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9em; margin-bottom:5px;">
                    <span id="ai-progress-text" style="font-weight:bold; color:#555;">AI 生成中...</span>
                    <div style="display:flex; gap:10px;">
                        <button id="btn-stop-ai" style="color:#dc3545; background:none; border:none; font-weight:bold; cursor:pointer;">⏹ 停止</button>
                        <button id="btn-close-progress" style="color:#999; background:none; border:none; font-size:1.2em; cursor:pointer;">&times;</button>
                    </div>
                </div>
                <div style="width:100%; background:#e9ecef; height:8px; border-radius:4px; overflow:hidden;">
                    <div id="ai-progress-bar" style="width:0%; height:100%; background:#6f42c1; transition:width 0.3s;"></div>
                </div>
            </div>
        </div>

        <div class="main-card-wrapper">
            <div class="table-container" style="max-height: 65vh; overflow-y: auto;">
                <table id="comment-table">
                    <thead>
                        <tr>
                            <th id="th-sort-name" style="width:70px; cursor:pointer; user-select:none;" title="点击切换：按成绩排序 / 按姓名排序">
                                姓名 <span id="sort-icon" style="font-size:0.8em; color:#ccc;">⇅</span>
                            </th>
                            <th style="width:120px;">成绩趋势</th>
                            <th style="width:250px; background-color:#fff9db;">📝 日常印象 (关键词)</th>
                            <th>评语内容 (AI / 规则)</th>
                            <th style="width:60px;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="comment-tbody"></tbody>
                </table>
            </div>
        </div>
    `;

    // 功能逻辑 - 调用全局函数（保持与 script.js 的兼容）
    // 这里只是一个框架，实际逻辑仍在 script.js 中
    
    const archiveBtn = document.getElementById('btn-toggle-archive');
    const archivePanel = document.getElementById('archive-panel');
    
    archiveBtn.addEventListener('click', () => {
        if (archivePanel.style.display === 'none') {
            archivePanel.style.display = 'block';
            archiveBtn.style.backgroundColor = '#5a6268';
        } else {
            archivePanel.style.display = 'none';
            archiveBtn.style.backgroundColor = '#6c757d';
        }
    });

    // 渲染表格函数
    const renderTable = (className) => {
        const tbody = document.getElementById('comment-tbody');
        let rowsHtml = '';
        const classStudents = [];
        
        studentMap.forEach(record => {
            if (record.info.class === className) classStudents.push(record);
        });

        if (currentSortMode === 'name') {
            classStudents.sort((a, b) => a.info.name.localeCompare(b.info.name, 'zh-CN'));
        } else {
            classStudents.sort((a, b) => {
                const lastRankA = a.exams[a.exams.length - 1]?.rank || 9999;
                const lastRankB = b.exams[b.exams.length - 1]?.rank || 9999;
                return lastRankA - lastRankB;
            });
        }

        classStudents.forEach(record => {
            const exams = record.exams;
            const count = exams.length;
            let trendHtml = '<span style="color:#ccc">-</span>';

            if (count >= 2) {
                const ranks = exams.map(e => e.gradeRank || e.rank || 0);
                const slope = (typeof window.calculateTrendSlope === 'function') ? window.calculateTrendSlope(ranks) : 0;
                const trendScore = Math.round(slope * (count - 1) * -1);

                if (trendScore > 20) trendHtml = `<span class="progress">🚀 升 ${trendScore}</span>`;
                else if (trendScore > 5) trendHtml = `<span class="progress" style="color:#20c997">📈 升 ${trendScore}</span>`;
                else if (trendScore < -20) trendHtml = `<span class="regress">📉 降 ${Math.abs(trendScore)}</span>`;
                else if (trendScore < -5) trendHtml = `<span class="regress" style="color:#fd7e14">📉 降 ${Math.abs(trendScore)}</span>`;
                else trendHtml = `<span style="color:#007bff">⚖️ 稳定</span>`;
            }

            const historyJson = encodeURIComponent(JSON.stringify(record));

            rowsHtml += `
                <tr class="comment-row" data-history="${historyJson}">
                    <td style="font-weight:bold;">${record.info.name}</td>
                    <td style="font-size:0.9em;">${trendHtml}</td>
                    <td style="vertical-align:top;">
                        <input type="text" class="daily-input sidebar-select" style="width:90%; margin-bottom:5px; font-size:0.9em;" placeholder="例: 乐于助人...">
                    </td>
                    <td style="padding:10px;">
                        <textarea class="result-textarea sidebar-select" style="width:100%; height:120px; border:1px solid #eee; resize:vertical; font-family:inherit; line-height:1.4;"></textarea>
                    </td>
                    <td>
                        <button class="btn-single-ai sidebar-button" style="font-size:1.2em; padding:8px 16px; background-color:#6f42c1;">🤖</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = rowsHtml;

        const sortIcon = document.getElementById('sort-icon');
        if (sortIcon) {
            sortIcon.style.color = currentSortMode === 'name' ? '#007bff' : '#ccc';
            sortIcon.innerText = currentSortMode === 'name' ? '🔤' : '⇅';
        }
    };

    const classSelect = document.getElementById('comment-class-select');
    classSelect.addEventListener('change', () => renderTable(classSelect.value));
    if (classes.length > 0) renderTable(classes[0]);

    document.getElementById('th-sort-name').addEventListener('click', () => {
        currentSortMode = (currentSortMode === 'rank') ? 'name' : 'rank';
        renderTable(classSelect.value);
    });
}

