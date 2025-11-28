/* eslint-disable no-undef */
'use strict';

import { State } from '../config/state.js';

/**
 * 模块十八：个性化错题攻坚本生成器
 */
export function renderWeaknessWorkbook(container) {
    // 1. 检查数据源
    if (!State.itemAnalysisData || Object.keys(State.itemAnalysisData).length === 0) {
        container.innerHTML = `<div class="main-card-wrapper" style="text-align:center; padding:50px; color:#666;">⚠️ 请先前往"学科小题分析"导入数据。</div>`;
        return;
    }

    const subjects = Object.keys(State.itemAnalysisData);

    container.innerHTML = `
        <h2>📝 模块十八：个性化错题攻坚本生成器</h2>
        <p style="color: var(--text-muted); margin-top:-10px;">
            自动筛选学生的薄弱题目，支持 AI 批量生成同类变式题，一键打印专属订正单。
        </p>
        <p style="color: var(--text-muted); margin-top:-10px;">
            题目为Ai 生成，请仔细甄别是否有错误！！！
        </p>

        <div class="main-card-wrapper" style="border-left: 5px solid #fd7e14;">
            <h4 style="margin-top:0;">🛠️ 生成配置</h4>
            <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; flex-wrap: wrap;">
                
                <label>选择科目:</label>
                <select id="wb-subject-select" class="sidebar-select" style="width:auto; min-width:120px;">
                    ${subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>

                <label style="margin-left:15px;">选择班级:</label>
                <select id="wb-class-select" class="sidebar-select" style="width:auto; min-width:120px;">
                    <option value="ALL">-- 全体 --</option>
                </select>

                <label style="margin-left:15px;">薄弱阈值:</label>
                <select id="wb-threshold" class="sidebar-select" style="width:auto;">
                    <option value="0.6" selected>得分率 < 60% (不及格)</option>
                    <option value="0.8">得分率 < 80% (非优秀)</option>
                    <option value="1.0">所有错题 (得分 < 满分)</option>
                </select>

                <button id="btn-gen-workbook" class="sidebar-button" style="background-color: #fd7e14; margin-left: 15px;">
                    📄 生成预览列表
                </button>
                
                <button id="btn-batch-ai-workbook" class="sidebar-button" style="background-color: #6f42c1; margin-left: 10px; display:none;">
                    🤖 批量生成变式题
                </button>

                <button id="btn-print-workbook" class="sidebar-button" style="background-color: var(--color-blue); margin-left: 10px; display:none;">
                    🖨️ 批量打印攻坚本
                </button>
            </div>
            
            <div id="wb-batch-progress" style="display:none; margin-top:15px; background:#f8f9fa; padding:10px; border-radius:6px; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9em; margin-bottom:5px;">
                    <span id="wb-progress-text" style="font-weight:bold; color:#555;">AI 生成中... (0/0)</span>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btn-stop-wb-ai" style="border:none; background:none; color:#dc3545; cursor:pointer; font-weight:bold;">⏹ 停止</button>
                        <button id="btn-close-wb-progress" style="border:none; background:none; color:#999; cursor:pointer; font-size:1.2em; line-height:1;">&times;</button>
                    </div>
                </div>
                <div style="width:100%; background:#e9ecef; height:8px; border-radius:4px; overflow:hidden;">
                    <div id="wb-progress-bar" style="width:0%; height:100%; background:#6f42c1; transition:width 0.3s;"></div>
                </div>
            </div>
        </div>

        <div id="wb-preview-area" class="main-card-wrapper" style="display:none;">
            <div style="margin-bottom:10px; font-weight:bold; color:#555;">
                共筛选出 <span id="wb-student-count" style="color:#fd7e14;">0</span> 名学生有薄弱题，
                累计 <span id="wb-question-total" style="color:#fd7e14;">0</span> 道错题。
            </div>
            <div class="table-container" style="max-height: 600px; overflow-y: auto;">
                <table id="wb-preview-table">
                    <thead>
                        <tr>
                            <th style="width:80px;">姓名</th>
                            <th style="width:80px;">薄弱题数</th>
                            <th>薄弱题目详情 (题号 / 知识点 / 得分率)</th>
                            <th style="width:100px;">AI 状态</th>
                            <th style="width:120px;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="wb-preview-tbody"></tbody>
                </table>
            </div>
        </div>
    `;

    // 2. 绑定基础事件
    const subjectSelect = document.getElementById('wb-subject-select');
    const classSelect = document.getElementById('wb-class-select');

    const updateClassList = () => {
        const sub = subjectSelect.value;
        if (!sub || !State.itemAnalysisData[sub]) return;
        const students = State.itemAnalysisData[sub].students;
        const classes = [...new Set(students.map(s => s.class))].sort();
        classSelect.innerHTML = `<option value="ALL">-- 全体 --</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    };
    
    subjectSelect.addEventListener('change', updateClassList);
    updateClassList();

    let workbookData = [];

    document.getElementById('btn-gen-workbook').addEventListener('click', () => {
        const subject = subjectSelect.value;
        const className = classSelect.value;
        const threshold = parseFloat(document.getElementById('wb-threshold').value);
        
        // 调用全局函数
        if (typeof window.calculateWeaknessWorkbook === 'function') {
            workbookData = window.calculateWeaknessWorkbook(subject, className, threshold);
            if (typeof window.renderWorkbookPreview === 'function') {
                window.renderWorkbookPreview(workbookData);
            }
        }
    });

    document.getElementById('btn-print-workbook').addEventListener('click', () => {
        if (workbookData.length === 0) return;
        const subject = subjectSelect.value;
        if (workbookData.length > 20 && !confirm(`即将生成 ${workbookData.length} 份攻坚本，是否继续？`)) return;
        if (typeof window.printWorkbook === 'function') {
            window.printWorkbook(workbookData, subject);
        }
    });
}

