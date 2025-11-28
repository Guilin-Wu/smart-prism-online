/* eslint-disable no-undef */
'use strict';

/**
 * 模块十九：荣誉中心
 */

import { State } from '../config/state.js';

/**
 * 渲染 HonorWall 模块
 */
export function renderHonorWall(container, data) {
    const classes = [...new Set(State.studentsData.map(s => s.class))].sort();
    const classOptions = classes.map(c => `<option value="${c}">${c}</option>`).join('');

    container.innerHTML = `
        <h2>🏆 模块十九：荣誉中心</h2>
        
        <div class="main-card-wrapper" style="border-left: 5px solid #ffc107; background: #fffdf5;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap: 15px;">
                <div>
                    <h4 style="margin:0; color:#d35400;">🌟 荣誉挖掘机</h4>
                    <p style="font-size:0.8em; color:#888; margin:5px 0 0 0;">基于【本次成绩】与【对比成绩】自动计算。</p>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="font-weight:bold; color:#555;">统计范围:</label>
                    <select id="honor-class-filter" class="sidebar-select" style="width:auto; min-width:120px; font-weight:bold; border-color:#ffc107;">
                        <option value="ALL">🏫 全体年段</option>
                        ${classOptions}
                    </select>
                    <button id="btn-honor-refresh" class="sidebar-button" style="background-color:#ffc107; color:#333;">🔄 刷新数据</button>
                </div>
            </div>
        </div>

        <div id="honor-display-area" style="margin-top:20px;"></div>
    `;

    // 绑定事件
    document.getElementById('btn-honor-refresh').addEventListener('click', () => calculateAndRenderHonors());
    document.getElementById('honor-class-filter').addEventListener('change', () => calculateAndRenderHonors());

    // 初始加载
    calculateAndRenderHonors();
}

/**
 * 计算并渲染荣誉名单
 */
function calculateAndRenderHonors() {
    const container = document.getElementById('honor-display-area');
    const filterVal = document.getElementById('honor-class-filter').value;

    let activeData = State.studentsData || [];
    let compareData = State.compareData || [];

    if (filterVal !== 'ALL') {
        activeData = activeData.filter(s => s.class === filterVal);
        compareData = compareData.filter(s => s.class === filterVal);
    }

    if (!activeData || activeData.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px; color:#999;">该范围内暂无数据。</p>`;
        return;
    }

    // 1. 总分 Top 5
    const topTotal = [...activeData].sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);

    // 2. 单科状元
    const subjectKings = [];
    State.dynamicSubjectList.forEach(sub => {
        let maxScore = -Infinity;
        activeData.forEach(s => { if ((s.scores[sub] || 0) > maxScore) maxScore = s.scores[sub]; });
        if (maxScore > 0) {
            const kings = activeData.filter(s => s.scores[sub] === maxScore);
            subjectKings.push({ subject: sub, score: maxScore, students: kings });
        }
    });

    // 3. 进步之星
    let progressStars = [];
    if (compareData && compareData.length > 0) {
        progressStars = activeData.map(s => {
            const old = compareData.find(o => String(o.id) === String(s.id));
            if (!old || !old.gradeRank || !s.gradeRank) return null;
            return { ...s, diff: old.gradeRank - s.gradeRank };
        }).filter(s => s && s.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5);
    }

    // 渲染
    let html = '';

    // 总分榜
    html += `
        <div class="main-card-wrapper" style="margin-bottom:20px;">
            <h4 style="margin:0 0 15px 0; color:#d35400;">🏆 巅峰领跑者 (总分 Top 5)</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px;">
                ${topTotal.map((s, idx) => `
                    <div style="background:linear-gradient(135deg, ${idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#f5f5f5'}, #fff); 
                        padding:15px; border-radius:8px; text-align:center; border:1px solid #ddd;">
                        <div style="font-size:1.5em;">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'}</div>
                        <div style="font-weight:bold; margin:5px 0;">${s.name}</div>
                        <div style="color:#666; font-size:0.9em;">${s.totalScore} 分</div>
                        <div style="color:#999; font-size:0.8em;">${s.class}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // 单科状元
    html += `
        <div class="main-card-wrapper" style="margin-bottom:20px;">
            <h4 style="margin:0 0 15px 0; color:#6f42c1;">🥇 单科状元榜</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px;">
                ${subjectKings.map(k => `
                    <div style="background:#f8f9fa; padding:12px; border-radius:8px; border-left:4px solid #6f42c1;">
                        <div style="font-weight:bold; color:#6f42c1; margin-bottom:5px;">${k.subject}</div>
                        <div style="font-size:0.9em;">
                            ${k.students.map(s => `<span style="background:#e9ecef; padding:2px 8px; border-radius:4px; margin-right:5px;">${s.name}</span>`).join('')}
                        </div>
                        <div style="color:#666; font-size:0.85em; margin-top:5px;">满分: ${k.score}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // 进步之星
    if (progressStars.length > 0) {
        html += `
            <div class="main-card-wrapper">
                <h4 style="margin:0 0 15px 0; color:#28a745;">🚀 进步之星 (年级排名提升 Top 5)</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px;">
                    ${progressStars.map((s, idx) => `
                        <div style="background:#e8f5e9; padding:15px; border-radius:8px; text-align:center; border:1px solid #c8e6c9;">
                            <div style="font-size:1.2em;">🌟</div>
                            <div style="font-weight:bold; margin:5px 0;">${s.name}</div>
                            <div style="color:#28a745; font-weight:bold;">↑ ${s.diff} 名</div>
                            <div style="color:#999; font-size:0.8em;">${s.class}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="main-card-wrapper">
                <h4 style="margin:0 0 15px 0; color:#28a745;">🚀 进步之星</h4>
                <p style="color:#999; text-align:center; padding:20px;">请先导入"对比成绩"以计算进步情况。</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

