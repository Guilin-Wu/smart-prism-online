/* eslint-disable no-undef */
'use strict';

/**
 * 模块十六：智能互助分组
 */

import { State } from '../config/state.js';

/**
 * 渲染 StudyGroups 模块
 */
export function renderStudyGroups(container, data) {
    const classes = [...new Set(State.studentsData.map(s => s.class))].sort();
    const subjectOptions = State.dynamicSubjectList.map(s => `<option value="${s}">${s}</option>`).join('');

    container.innerHTML = `
        <h2>🧩 模块十六：智能互助分组</h2>
        
        <div class="main-card-wrapper" style="border-left: 5px solid #6f42c1;">
            <h4 style="margin:0 0 15px 0;">🛠️ 策略配置</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; align-items: end;">
                <div>
                    <label style="font-weight:600; font-size:0.9em; color:#555;">1. 选择班级</label>
                    <select id="group-class-select" class="sidebar-select" style="width:100%; font-weight:bold;">
                        ${classes.map(c => `<option value="${c}">${c}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-weight:600; font-size:0.9em; color:#555;">2. 分组模式</label>
                    <select id="group-strategy" class="sidebar-select" style="width:100%;">
                        <option value="balanced">⚖️ S型均衡分组</option>
                        <option value="high_low">🤝 1帮1 (首尾结对)</option>
                        <option value="random">🎲 完全随机</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:600; font-size:0.9em; color:#555;">3. 分组依据</label>
                    <select id="group-sort-basis" class="sidebar-select" style="width:100%; color:#6f42c1; font-weight:bold;">
                        <option value="total">🏆 按总分</option>
                        <option value="single">🎯 按单科</option>
                    </select>
                </div>
                <div id="group-size-wrapper">
                    <label style="font-weight:600; font-size:0.9em; color:#555;">每组人数</label>
                    <input type="number" id="group-size-input" class="sidebar-select" value="6" min="2" max="10" style="width:100%;">
                </div>
                <div id="group-single-wrapper" style="display:none;">
                    <label style="font-weight:600; font-size:0.9em; color:#555;">目标学科</label>
                    <select id="group-single-subject" class="sidebar-select" style="width:100%;">${subjectOptions}</select>
                </div>
                <div>
                    <button id="btn-generate-groups" class="sidebar-button" style="background-color: #6f42c1; width:100%; height: 42px;">✨ 生成分组</button>
                </div>
            </div>
        </div>

        <div id="group-result-area" style="display: none; margin-top: 20px;">
            <div class="main-card-wrapper">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">📋 分组结果预览</h3>
                    <button id="btn-export-groups" class="sidebar-button" style="background-color: var(--color-green);">📥 导出名单</button>
                </div>
                <div id="group-stats-bar" style="background:#fff3cd; padding:10px; border-radius:6px; margin-bottom:15px; font-size:0.9em; color:#856404; border:1px solid #ffeeba;"></div>
                <div id="group-cards-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:15px;"></div>
            </div>
        </div>
    `;

    // 绑定依据切换
    document.getElementById('group-sort-basis').addEventListener('change', (e) => {
        document.getElementById('group-size-wrapper').style.display = e.target.value !== 'single' ? 'block' : 'none';
        document.getElementById('group-single-wrapper').style.display = e.target.value === 'single' ? 'block' : 'none';
    });

    // 绑定生成按钮
    document.getElementById('btn-generate-groups').addEventListener('click', () => {
        const selectedClass = document.getElementById('group-class-select').value;
        const strategy = document.getElementById('group-strategy').value;
        const sortBasis = document.getElementById('group-sort-basis').value;
        const groupSize = parseInt(document.getElementById('group-size-input').value) || 6;

        // 筛选班级学生
        let classStudents = State.studentsData.filter(s => s.class === selectedClass);

        // 计算排序分数
        if (sortBasis === 'single') {
            const subject = document.getElementById('group-single-subject').value;
            classStudents = classStudents.map(s => ({ ...s, _sortScore: s.scores[subject] || 0 }));
        } else {
            classStudents = classStudents.map(s => ({ ...s, _sortScore: s.totalScore || 0 }));
        }

        // 排序
        classStudents.sort((a, b) => b._sortScore - a._sortScore);

        // 计算分组
        const groups = calculateGroups(classStudents, strategy, groupSize);

        // 渲染结果
        renderGroupResults(groups, selectedClass);
    });

    // 导出按钮
    document.getElementById('btn-export-groups').addEventListener('click', () => {
        alert('导出功能需要 xlsx 库支持');
    });
}

/**
 * 分组核心算法
 */
function calculateGroups(students, strategy, groupSize) {
    const groups = [];
    const total = students.length;

    if (strategy === 'random') {
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        const numGroups = Math.ceil(total / groupSize);
        for (let i = 0; i < numGroups; i++) groups.push({ name: `第 ${i + 1} 组`, members: [] });
        shuffled.forEach((s, idx) => groups[idx % numGroups].members.push(s));
    } else if (strategy === 'high_low') {
        const pairCount = Math.floor(total / 2);
        for (let i = 0; i < pairCount; i++) {
            groups.push({
                name: `帮扶对子 ${i + 1}`,
                members: [students[i], students[total - 1 - i]]
            });
        }
        if (total % 2 !== 0) {
            groups[groups.length - 1].members.push(students[Math.floor(total / 2)]);
        }
    } else {
        const numGroups = Math.ceil(total / groupSize);
        for (let i = 0; i < numGroups; i++) groups.push({ name: `第 ${i + 1} 组`, members: [] });
        students.forEach((s, index) => {
            const row = Math.floor(index / numGroups);
            let groupIndex = row % 2 === 0 ? index % numGroups : numGroups - 1 - (index % numGroups);
            groups[groupIndex].members.push(s);
        });
    }

    // 计算统计
    groups.forEach(g => {
        const sum = g.members.reduce((acc, m) => acc + m._sortScore, 0);
        g.avgSortScore = (sum / g.members.length).toFixed(1);
        g.members.sort((a, b) => b._sortScore - a._sortScore);
    });

    return groups;
}

/**
 * 渲染分组结果
 */
function renderGroupResults(groups, className) {
    const resultArea = document.getElementById('group-result-area');
    const statsBar = document.getElementById('group-stats-bar');
    const cardsContainer = document.getElementById('group-cards-container');

    resultArea.style.display = 'block';

    // 统计信息
    const avgScores = groups.map(g => parseFloat(g.avgSortScore));
    const minAvg = Math.min(...avgScores).toFixed(1);
    const maxAvg = Math.max(...avgScores).toFixed(1);
    const diff = (maxAvg - minAvg).toFixed(1);

    statsBar.innerHTML = `
        📊 <strong>${className}</strong> 共 ${groups.reduce((acc, g) => acc + g.members.length, 0)} 人，分为 ${groups.length} 组 | 
        组均分范围: ${minAvg} ~ ${maxAvg} (极差: ${diff})
    `;

    // 渲染卡片
    cardsContainer.innerHTML = groups.map(g => `
        <div style="background:#fff; border:1px solid #ddd; border-radius:8px; padding:15px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <strong style="color:#6f42c1;">${g.name}</strong>
                <span style="font-size:0.85em; color:#666;">均分: ${g.avgSortScore}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                ${g.members.map((m, idx) => `
                    <div style="display:flex; justify-content:space-between; padding:5px; background:${idx === 0 ? '#e8f5e9' : '#f5f5f5'}; border-radius:4px;">
                        <span>${idx === 0 ? '👑 ' : ''}${m.name}</span>
                        <span style="color:#666;">${m._sortScore}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

