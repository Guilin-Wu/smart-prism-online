/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';
import { loadExcelData, addSubjectRanksToData } from '../../data/parser.js';
import { calculateAllStatistics } from '../../utils/statistics.js';
import { calculateSmartAllocation, getDifficultyText } from './allocation.js';
import { renderGoalWaterfall, renderGoalRadar, renderGoalRadarComparison, renderGoalTrendChart } from './charts.js';
import { startGoalPrintJob, startDetailPrintJob } from './print.js';

/**
 * 模块十四：目标规划与复盘管理
 * 从 script.js 完全迁移
 */
export async function renderGoalSetting(container, data) {
    const activeData = (data && data.activeData) || State.activeData || State.studentsData || [];
    const stats = (data && data.stats) || State.statistics || {};

    // 默认基准数据使用全局导入的数据
    const goalBaselineData = window.G_GoalBaselineData || State.goalBaselineData;
    if (!goalBaselineData) {
        window.G_GoalBaselineData = activeData;
        State.goalBaselineData = activeData;
    }

    // 记录复盘数据来源名称 (用于显示和打印)
    let currentOutcomeSourceName = "未导入";
    const goalOutcomeData = window.G_GoalOutcomeData || State.goalOutcomeData;
    if (goalOutcomeData && goalOutcomeData.length > 0) {
        currentOutcomeSourceName = localStorage.getItem('G_GoalOutcome_FileName') || "已导入数据";
    }

    // 加载存档和批次信息
    let allArchives = await localforage.getItem('G_Goal_Archives') || {};
    let sessionMeta = await localforage.getItem('G_Goal_Session_Meta') || [];

    // 初始化默认批次
    if (sessionMeta.length === 0) {
        sessionMeta = [{ id: 'default_session', name: '默认规划列表', createDate: new Date().toLocaleString() }];
        await localforage.setItem('G_Goal_Session_Meta', sessionMeta);
    }

    // 获取当前选中的批次ID
    let currentSessionId = localStorage.getItem('G_Goal_Current_Session_ID') || sessionMeta[0].id;
    if (!sessionMeta.find(s => s.id === currentSessionId)) currentSessionId = sessionMeta[0].id;

    // 局部变量
    let currentStudent = null;
    let G_EditingPlanState = null;
    let currentPlanMode = 'total';
    const subjectList = State.dynamicSubjectList || window.G_DynamicSubjectList || [];
    let currentSubject = subjectList[0] || '语文';
    let currentStrategy = null;
    let currentTargetData = { val: 0, type: 'score' };

    // 获取基准数据（用于后续操作）
    const getBaselineData = () => window.G_GoalBaselineData || State.goalBaselineData || activeData;
    const getOutcomeData = () => window.G_GoalOutcomeData || State.goalOutcomeData || null;
    const subjectConfigs = State.subjectConfigs || window.G_SubjectConfigs || {};

    // ------------------------------------------------------
    // 1. 渲染界面框架
    // ------------------------------------------------------
    container.innerHTML = `
        <h2>🎯 模块十四：目标规划与复盘管理</h2>
        
        <div class="main-card-wrapper" style="background: #f8f9fa; border: 1px dashed #ccc; margin-bottom: 20px; padding: 15px;">
            <h4 style="margin: 0 0 15px 0; color: #555; display:flex; justify-content:space-between;">
                <span>📂 数据源配置 (Data Sources)</span>
                <span style="font-size:0.8em; font-weight:normal; color:#999;">支持从"数据中心"选择历史成绩</span>
            </h4>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; background:white; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <div style="font-weight:bold; margin-bottom:5px; color:#6f42c1;">1. 基准成绩 (制定规划用)</div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btn-import-baseline" class="sidebar-button" style="background-color: #6f42c1; font-size: 0.9em; width: 100%;">📥 导入/选择数据</button>
                        <input type="file" id="goal-upload-baseline" accept=".xlsx, .xls, .csv" style="display: none;">
                    </div>
                    <div id="goal-status-baseline" style="font-size: 0.85em; color: #666; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        当前: 系统默认数据 (${activeData.length}人)
                    </div>
                </div>
                <div style="flex: 1; min-width: 250px; background:white; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <div style="font-weight:bold; margin-bottom:5px; color:#20c997;">2. 达成成绩 (复盘对比用)</div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btn-import-outcome" class="sidebar-button" style="background-color: #20c997; font-size: 0.9em; width: 100%;">📥 导入/选择数据</button>
                        <input type="file" id="goal-upload-outcome" accept=".xlsx, .xls, .csv" style="display: none;">
                    </div>
                    <div id="goal-status-outcome" style="font-size: 0.85em; color: #dc3545; margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        当前: ${currentOutcomeSourceName}
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 20px; border-bottom: 2px solid #eee; display: flex; gap: 20px;">
            <button class="tab-btn active" data-tab="create" style="padding: 10px 20px; font-weight: bold; cursor: pointer; border:none; background:none; border-bottom: 3px solid var(--primary-color); color: var(--primary-color);">
                ✍️   建/修改规划
            </button>
            <button class="tab-btn" data-tab="manage" style="padding: 10px 20px; font-weight: bold; cursor: pointer; border:none; background:none; color: #666; border-bottom: 3px solid transparent;">
                📋 规划管理大厅
            </button>
        </div>

        <div id="goal-tab-create" class="tab-content">
            <div class="main-card-wrapper" style="margin-bottom: 20px; padding: 15px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                    <label style="font-weight:bold;">选择班级 (基于基准表):</label>
                    <select id="goal-class-select" class="sidebar-select" style="width:auto; min-width:150px; font-weight:bold; color:var(--primary-color);"></select>

                    <input type="text" id="goal-fast-search" placeholder="🔍 快速找人 (姓名/考号)" class="sidebar-select" style="width: 180px;">
                    <span style="color:#999; font-size:0.9em;">(✅ = 当前列表内已有规划)</span>
                </div>
                <div id="goal-student-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; max-height: 150px; overflow-y: auto; padding-right:5px;"></div>
            </div>

            <div id="goal-workspace" style="display: none;">
                <div class="controls-bar" style="background: #f0f7ff; border: 1px solid #cce5ff; padding: 10px 20px; justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:20px;">
                        <label style="font-weight:bold; color:#004085;">规划模式:</label>
                        <label style="cursor: pointer; display: flex; align-items: center;">
                            <input type="radio" name="plan-mode" value="total" checked style="margin-right: 5px;"> 全科/班主任
                        </label>
                        <label style="cursor: pointer; display: flex; align-items: center;">
                            <input type="radio" name="plan-mode" value="single" style="margin-right: 5px;"> 单科/科任
                        </label>
                    </div>
                    <div id="goal-single-subject-select-wrapper" style="display:none;">
                        <select id="goal-single-subject-select" class="sidebar-select" style="width:auto;">
                            ${subjectList.map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="main-card-wrapper" style="margin-bottom: 20px; border-left: 5px solid var(--color-purple);">
                    <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                        <span id="goal-target-label" style="font-weight:bold;">设定目标:</span>
                        <select id="goal-target-type" class="sidebar-select" style="width:120px;">
                            <option value="score">分数 (Score)</option>
                            <option value="rank">年级排名 (Rank)</option>
                        </select>
                        <input type="number" id="goal-target-val" class="sidebar-select" style="width:100px;" placeholder="目标值">
                        <button id="goal-calc-btn" class="sidebar-button" style="background-color: var(--color-purple);">🚀 生成规划</button>
                    </div>
                    <p id="goal-current-info" style="margin-top:10px; color:#666; font-size:0.9em;"></p>
                    <div style="font-size:0.85em; color:#999; text-align:right;">
                        当前将保存至列表：<span id="goal-current-session-label" style="font-weight:bold; color:#333;">...</span>
                    </div>
                </div>

                <div id="goal-result-area" style="display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3 style="margin:0;">📊 规划预览</h3>
                        <div style="display: flex; gap: 10px;">
                            <button id="goal-save-btn" class="sidebar-button" style="background-color: #28a745;">💾 保存并标记</button>
                            <button id="goal-print-btn" class="sidebar-button" style="background-color: var(--color-blue);">🖨️ 打印规划书</button>
                        </div>
                    </div>
                    <div id="goal-result-kpi" class="kpi-grid"></div>
                    <div class="table-container" id="goal-result-table"></div>
                    <div id="goal-chart-wrapper" class="dashboard-chart-grid-2x2" style="margin-top:20px;">
                        <div class="main-card-wrapper"><div class="chart-container" id="goal-waterfall-chart"></div></div>
                        <div class="main-card-wrapper"><div class="chart-container" id="goal-radar-chart"></div></div>
                    </div>
                </div>
            </div>
        </div>

        <div id="goal-tab-manage" class="tab-content" style="display: none;">
            <div class="main-card-wrapper" style="margin-bottom: 20px; background: #fffbf0; border: 1px solid #ffeebb;">
                <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                    <label style="font-weight:bold; font-size:1.1em;">📁 当前规划列表 (容器):</label>
                    <select id="goal-session-select" class="sidebar-select" style="width:auto; min-width:200px; font-weight:bold;"></select>
                    <button id="btn-new-session" class="sidebar-button" style="background-color:#fd7e14;">➕   建列表</button>
                    <button id="btn-rename-session" class="sidebar-button" style="background-color:#17a2b8;">✏️ 重命名</button>
                    <button id="btn-delete-session" class="sidebar-button" style="background-color:#dc3545;">🗑️ 删除列表</button>
                </div>
            </div>

            <div class="main-card-wrapper">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4>📋 学生规划档案 (当前列表内)</h4>
                    <button id="goal-manage-refresh" class="sidebar-button" style="font-size:0.8em; padding:5px 10px;">🔄 刷  列表</button>
                </div>
                <div class="table-container" style="max-height: 600px; overflow-y: auto;">
                    <table id="goal-manage-table">
                        <thead>
                            <tr>
                                <th>班级</th>
                                <th>姓名</th>
                                <th>规划名称 (点击查看详情)</th>
                                <th>类型</th>
                                <th>目标</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="goal-manage-tbody"></tbody>
                    </table>
                </div>
            </div>

            <div id="goal-review-panel" style="display:none; margin-top:20px; border-top:2px dashed #ccc; padding-top:20px;">
                <h3 style="color:var(--primary-color);">🧐 规划复盘报告</h3>
                <div class="main-card-wrapper" style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <h4 style="margin:0; text-align:left;">📈 规划达成率趋势</h4>
                        <div style="display:flex; gap:15px; font-size:0.9em; background:#f1f3f5; padding:5px 10px; border-radius:20px;">
                            <label style="cursor:pointer;"><input type="radio" name="goal-trend-mode" value="student" checked> 👤 当前学生</label>
                            <label style="cursor:pointer;"><input type="radio" name="goal-trend-mode" value="all"> 👥 全列表平均</label>
                        </div>
                    </div>
                    <div class="chart-container" id="goal-trend-line-chart" style="height: 350px;"></div>
                </div>
                <div id="goal-review-content"></div>
            </div>
        </div>

        <div id="goal-detail-modal" class="modal-overlay" style="display: none;">
            <div class="modal-content" style="max-width: 950px; width: 90%; max-height: 90vh; display: flex; flex-direction: column; padding: 0;">
                <div class="modal-header" style="padding: 15px 20px; border-bottom: 1px solid #eee;">
                    <h3 id="goal-detail-title" style="margin:0;">规划详情回顾</h3>
                    <span onclick="document.getElementById('goal-detail-modal').style.display='none'" class="modal-close-btn">&times;</span>
                </div>
                
                <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 20px;">
                    <div id="goal-detail-alert" style="display:none; background:#fff3cd; color:#856404; padding:10px; margin-bottom:15px; border-radius:4px; font-size:0.9em;"></div>
                    
                    <div id="goal-detail-source-info"></div>

                    <div class="kpi-grid" id="goal-detail-kpi"></div>
                    <div class="table-container" id="goal-detail-table" style="margin-bottom: 20px;"></div>
                    <div class="dashboard-chart-grid-2x2">
                        <div class="main-card-wrapper">
                            <h4 style="margin:0 0 10px 0; text-align:center;">📊 规划提分路径 (瀑布图)</h4>
                            <div class="chart-container" id="goal-detail-waterfall-chart" style="height: 350px;"></div>
                        </div>
                        <div class="main-card-wrapper">
                            <h4 style="margin:0 0 10px 0; text-align:center;">🕸️ 现状 vs 目标 vs 实际 (雷达图)</h4>
                            <div class="chart-container" id="goal-detail-radar-chart" style="height: 350px;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #eee; display:flex; justify-content:flex-end; gap:10px;">
                    <button id="goal-detail-print-btn" class="sidebar-button" style="background-color: var(--color-blue);">🖨️ 打印详情单</button>
                    <button class="sidebar-button" style="background-color: #6c757d;" onclick="document.getElementById('goal-detail-modal').style.display='none'">关闭</button>
                </div>
            </div>
        </div>
    `;

    // ------------------------------------------------------
    // 2. 数据源钩子与事件
    // ------------------------------------------------------
    document.getElementById('btn-import-baseline').addEventListener('click', () => { 
        window.G_CurrentImportType = State.currentImportType = 'goal-baseline'; 
        const titleEl = document.getElementById('import-modal-title');
        if (titleEl) titleEl.innerText = '选择"基准成绩"';
        if (typeof window.openImportModal === 'function') window.openImportModal();
    });
    document.getElementById('btn-import-outcome').addEventListener('click', () => { 
        window.G_CurrentImportType = State.currentImportType = 'goal-outcome'; 
        const titleEl = document.getElementById('import-modal-title');
        if (titleEl) titleEl.innerText = '选择"达成成绩"';
        if (typeof window.openImportModal === 'function') window.openImportModal();
    });

    // 全局数据刷新回调
    window.refreshGoalDataSourceUI = (type, fileName, data) => {
        if (type === 'baseline') {
            document.getElementById('goal-status-baseline').innerHTML = `✅ 已导入: <strong>${fileName}</strong> (${data.length}人)`;
            document.getElementById('goal-status-baseline').style.color = "#28a745";
            refreshClassSelector();
            document.getElementById('goal-workspace').style.display = 'none';
        } else if (type === 'outcome') {
            currentOutcomeSourceName = fileName;
            localStorage.setItem('G_GoalOutcome_FileName', fileName);
            document.getElementById('goal-status-outcome').innerHTML = `✅ 已导入: <strong>${fileName}</strong> (${data.length}人)`;
            document.getElementById('goal-status-outcome').style.color = "#28a745";
        }
    };

    // 文件控件监听
    document.getElementById('goal-upload-baseline').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { processedData } = await loadExcelData(file);
            const rankedData = addSubjectRanksToData(processedData);
            window.G_GoalBaselineData = rankedData;
            State.goalBaselineData = rankedData;
            window.refreshGoalDataSourceUI('baseline', file.name, rankedData);
        } catch (err) {
            alert(err.message);
        }
    });
    document.getElementById('goal-upload-outcome').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { processedData } = await loadExcelData(file);
            const rankedData = addSubjectRanksToData(processedData);
            window.G_GoalOutcomeData = rankedData;
            State.goalOutcomeData = rankedData;
            window.refreshGoalDataSourceUI('outcome', file.name, rankedData);
        } catch (err) {
            alert(err.message);
        }
    });

    // ------------------------------------------------------
    // 3. 批次管理逻辑
    // ------------------------------------------------------
    const sessionSelect = document.getElementById('goal-session-select');
    const sessionLabel = document.getElementById('goal-current-session-label');

    function renderSessionSelect() {
        sessionSelect.innerHTML = sessionMeta.map(s => `<option value="${s.id}" ${s.id === currentSessionId ? 'selected' : ''}>${s.name}</option>`).join('');
        const currentName = sessionMeta.find(s => s.id === currentSessionId)?.name || '未知';
        if (sessionLabel) sessionLabel.innerText = currentName;
    }
    renderSessionSelect();

    sessionSelect.addEventListener('change', () => {
        currentSessionId = sessionSelect.value;
        localStorage.setItem('G_Goal_Current_Session_ID', currentSessionId);
        renderManageTable();
        refreshClassSelector();
        if (sessionLabel) sessionLabel.innerText = sessionSelect.options[sessionSelect.selectedIndex].text;
    });
    document.getElementById('btn-new-session').addEventListener('click', async () => {
        const name = prompt("  列表名称:");
        if (!name) return;
        const newId = 'session_' + Date.now();
        sessionMeta.unshift({ id: newId, name: name, createDate: new Date().toLocaleString() });
        await localforage.setItem('G_Goal_Session_Meta', sessionMeta);
        currentSessionId = newId;
        localStorage.setItem('G_Goal_Current_Session_ID', currentSessionId);
        renderSessionSelect();
        renderManageTable();
    });
    document.getElementById('btn-rename-session').addEventListener('click', async () => {
        const current = sessionMeta.find(s => s.id === currentSessionId);
        if (!current) return;
        const newName = prompt("重命名:", current.name);
        if (newName) {
            current.name = newName;
            await localforage.setItem('G_Goal_Session_Meta', sessionMeta);
            renderSessionSelect();
        }
    });
    document.getElementById('btn-delete-session').addEventListener('click', async () => {
        if (sessionMeta.length <= 1) {
            alert("至少保留一个!");
            return;
        }
        if (!confirm("确定删除?")) return;
        sessionMeta = sessionMeta.filter(s => s.id !== currentSessionId);
        await localforage.setItem('G_Goal_Session_Meta', sessionMeta);
        for (const sid of Object.keys(allArchives)) {
            allArchives[sid] = allArchives[sid].filter(r => r.sessionId !== currentSessionId);
        }
        await localforage.setItem('G_Goal_Archives', allArchives);
        currentSessionId = sessionMeta[0].id;
        localStorage.setItem('G_Goal_Current_Session_ID', currentSessionId);
        renderSessionSelect();
        renderManageTable();
    });

    // ------------------------------------------------------
    // 4. 创建规划逻辑 (Tab 1)
    // ------------------------------------------------------
    function refreshClassSelector() {
        const classSelect = document.getElementById('goal-class-select');
        const studentGrid = document.getElementById('goal-student-grid');
        studentGrid.innerHTML = '';
        const baselineData = getBaselineData();
        if (!baselineData || baselineData.length === 0) return;
        const classes = [...new Set(baselineData.map(s => s.class))].sort();
        classSelect.innerHTML = `<option value="">-- 请选择班级 --</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    refreshClassSelector();

    // 快速搜索监听
    document.getElementById('goal-fast-search').addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        const grid = document.getElementById('goal-student-grid');

        if (!term) {
            document.getElementById('goal-class-select').dispatchEvent(new Event('change'));
            return;
        }

        const baselineData = getBaselineData();
        const matches = baselineData.filter(s =>
            s.name.toLowerCase().includes(term) || String(s.id).includes(term)
        );

        if (matches.length === 0) {
            grid.innerHTML = '<p style="color:#999; padding:10px;">未找到匹配的学生</p>';
            return;
        }

        grid.innerHTML = matches.map(s => {
            let hasPlan = false;
            if (allArchives[s.id]) hasPlan = allArchives[s.id].some(r => r.sessionId === currentSessionId);
            const mark = hasPlan ? `<span style="color:#28a745; font-weight:bold;">✅</span>` : '';

            return `<button class="sidebar-button goal-student-btn" data-id="${s.id}" 
                style="background-color:#fff; color:#333; border:1px solid #dee2e6; justify-content:center; font-size:0.9em; flex-direction:column; gap:2px;">
                <span>${s.name} ${mark}</span>
                <span style="font-size:0.75em; color:#999;">${s.class}</span>
            </button>`;
        }).join('');

        document.querySelectorAll('.goal-student-btn').forEach(btn => {
            btn.addEventListener('click', () => selectStudent(btn.dataset.id));
        });
    });

    document.getElementById('goal-class-select').addEventListener('change', (e) => {
        const cls = e.target.value;
        const grid = document.getElementById('goal-student-grid');
        if (!cls) {
            grid.innerHTML = '';
            return;
        }
        const baselineData = getBaselineData();
        const studentsInClass = baselineData.filter(s => s.class === cls);
        grid.innerHTML = studentsInClass.map(s => {
            let hasPlan = false;
            if (allArchives[s.id]) hasPlan = allArchives[s.id].some(r => r.sessionId === currentSessionId);
            const mark = hasPlan ? `<span style="color:#28a745; font-weight:bold;">✅</span>` : '';
            return `<button class="sidebar-button goal-student-btn" data-id="${s.id}" style="background-color:#fff; color:#333; border:1px solid #dee2e6; justify-content:center; font-size:0.9em;">${s.name} ${mark}</button>`;
        }).join('');
        document.querySelectorAll('.goal-student-btn').forEach(btn => btn.addEventListener('click', () => selectStudent(btn.dataset.id)));
        document.getElementById('goal-fast-search').value = '';
    });

    function selectStudent(id) {
        if (G_EditingPlanState && String(G_EditingPlanState.sid) !== String(id)) {
            G_EditingPlanState = null;
            const saveBtn = document.getElementById('goal-save-btn');
            saveBtn.innerHTML = "💾 保存并标记";
            saveBtn.style.backgroundColor = "#28a745";
            document.getElementById('goal-target-val').value = "";
        }
        
        const baselineData = getBaselineData();
        currentStudent = baselineData.find(s => String(s.id) === String(id));
        if (!currentStudent) return;
        document.querySelectorAll('.goal-student-btn').forEach(b => {
            b.style.backgroundColor = '#fff';
            b.style.color = '#333';
        });
        const activeBtn = document.querySelector(`.goal-student-btn[data-id="${id}"]`);
        if (activeBtn) {
            activeBtn.style.backgroundColor = '#007bff';
            activeBtn.style.color = '#fff';
        }
        document.getElementById('goal-workspace').style.display = 'block';
        document.getElementById('goal-result-area').style.display = 'none';
        updateCurrentInfoLabel();
    }

    document.getElementsByName('plan-mode').forEach(r => r.addEventListener('change', (e) => {
        currentPlanMode = e.target.value;
        document.getElementById('goal-single-subject-select-wrapper').style.display = (currentPlanMode === 'single') ? 'block' : 'none';
        document.getElementById('goal-chart-wrapper').style.display = (currentPlanMode === 'total') ? 'grid' : 'none';
        updateCurrentInfoLabel();
    }));
    document.getElementById('goal-single-subject-select').addEventListener('change', (e) => {
        currentSubject = e.target.value;
        updateCurrentInfoLabel();
    });
    document.getElementById('goal-target-type').addEventListener('change', updateCurrentInfoLabel);

    function updateCurrentInfoLabel() {
        if (!currentStudent) return;
        const infoEl = document.getElementById('goal-current-info');
        const targetType = document.getElementById('goal-target-type').value;

        if (currentPlanMode === 'total') {
            infoEl.innerHTML = `学生：<strong>${currentStudent.name}</strong> | 基准总分：${currentStudent.totalScore} | 基准年排：${currentStudent.gradeRank}`;
        } else {
            const score = currentStudent.scores[currentSubject] || 0;
            
            if (targetType === 'rank') {
                const rank = (currentStudent.gradeRanks && currentStudent.gradeRanks[currentSubject])
                    ? currentStudent.gradeRanks[currentSubject]
                    : '-';
                infoEl.innerHTML = `学生：<strong>${currentStudent.name}</strong> | 科目：<strong>${currentSubject}</strong> | <span style="color:#fd7e14; font-weight:bold;">基准年排：${rank}</span> <span style="color:#999; font-size:0.9em;">(当前分: ${score})</span>`;
            } else {
                infoEl.innerHTML = `学生：<strong>${currentStudent.name}</strong> | 科目：<strong>${currentSubject}</strong> | 基准分：${score}`;
            }
        }
    }

    // 计算生成
    document.getElementById('goal-calc-btn').addEventListener('click', () => {
        if (!currentStudent) return;
        const val = parseFloat(document.getElementById('goal-target-val').value);
        const type = document.getElementById('goal-target-type').value;
        if (!val) {
            alert("请输入目标值");
            return;
        }
        currentTargetData = { val, type };
        let details = [], targetTotal = 0, displayGap = 0;
        const baselineData = getBaselineData();

        if (currentPlanMode === 'single') {
            let targetScore = val;
            const currentScore = currentStudent.scores[currentSubject] || 0;
            const fullScore = subjectConfigs[currentSubject] ? subjectConfigs[currentSubject].full : 100;
            if (type === 'rank') {
                const allScores = baselineData.map(s => s.scores[currentSubject]).filter(v => typeof v === 'number').sort((a, b) => b - a);
                const idx = Math.min(Math.max(0, Math.floor(val) - 1), allScores.length - 1);
                targetScore = allScores[idx] || 0;
            }
            if (targetScore > fullScore) targetScore = fullScore;
            details.push({
                subject: currentSubject,
                current: currentScore,
                target: targetScore,
                gain: targetScore - currentScore,
                room: fullScore - currentScore,
                difficultyText: getDifficultyText(fullScore - currentScore, currentScore, fullScore)
            });
            targetTotal = targetScore;
            displayGap = targetScore - currentScore;
        } else {
            let targetScoreVal = val;
            if (type === 'rank') {
                const allTotals = baselineData.map(s => s.totalScore).filter(v => typeof v === 'number').sort((a, b) => b - a);
                const idx = Math.min(Math.max(0, Math.floor(val) - 1), allTotals.length - 1);
                targetScoreVal = allTotals[idx] || 0;
            }
            const baselineStats = calculateAllStatistics(baselineData, subjectList, subjectConfigs);
            const allocation = calculateSmartAllocation(currentStudent, targetScoreVal, baselineData, baselineStats);
            details.push(...allocation.details);
            targetTotal = targetScoreVal;
            displayGap = allocation.totalDeficit;
        }

        currentStrategy = {
            mode: currentPlanMode,
            subject: currentPlanMode === 'single' ? currentSubject : 'Total',
            targetType: type,
            targetVal: val,
            targetScoreCalculated: targetTotal,
            details: details,
            totalDeficit: displayGap
        };
        renderGoalResultsUI(currentStudent, currentStrategy, displayGap);
    });

    function renderGoalResultsUI(student, strategy, gap) {
        document.getElementById('goal-result-area').style.display = 'block';
        const kpi = document.getElementById('goal-result-kpi');
        const gapText = gap > 0 ? `需提升 ${gap.toFixed(1)}` : `已达标`;
        const modeText = strategy.mode === 'total' ? "总分" : strategy.subject;
        kpi.innerHTML = `<div class="kpi-card"><h3>目标${modeText}</h3><div class="value" style="color:var(--color-purple)">${strategy.targetScoreCalculated.toFixed(1)}</div></div><div class="kpi-card"><h3>差距</h3><div class="value" style="font-size:1.5em; color:${gap > 0 ? '#dc3545' : '#28a745'}">${gapText}</div></div>`;
        document.getElementById('goal-result-table').innerHTML = `<table><thead><tr><th>科目</th><th>基准分</th><th>目标</th><th style="color:purple">需提分</th><th>策略</th></tr></thead><tbody>${strategy.details.map(d => `<tr><td>${d.subject}</td><td>${d.current}</td><td><strong>${d.target.toFixed(1)}</strong></td><td style="font-weight:bold; color:${d.gain > 0 ? 'purple' : '#999'}">+${d.gain.toFixed(1)}</td><td>${d.difficultyText}</td></tr>`).join('')}</tbody></table>`;
        if (strategy.mode === 'total') {
            renderGoalWaterfall('goal-waterfall-chart', student.totalScore, strategy.targetScoreCalculated, strategy.details);
            renderGoalRadar('goal-radar-chart', student, strategy.details);
        }
    }

    // 保存规划
    document.getElementById('goal-save-btn').addEventListener('click', async () => {
        if (!currentStudent || !currentStrategy) return;
        const planName = prompt("规划名称:", "目标-" + new Date().toLocaleDateString());
        if (!planName) return;

        let baselineSource = "系统默认数据";
        const baselineStatusText = document.getElementById('goal-status-baseline').innerText;
        if (baselineStatusText.includes('已导入')) {
            const match = document.getElementById('goal-status-baseline').querySelector('strong');
            if (match) baselineSource = match.innerText;
        }

        const record = {
            id: Date.now(),
            sessionId: currentSessionId,
            studentId: currentStudent.id,
            studentName: currentStudent.name,
            className: currentStudent.class,
            name: planName,
            createDate: new Date().toLocaleString(),
            baselineSource: baselineSource,
            strategy: currentStrategy
        };
        if (!allArchives[currentStudent.id]) allArchives[currentStudent.id] = [];
        allArchives[currentStudent.id].unshift(record);
        await localforage.setItem('G_Goal_Archives', allArchives);
        alert("✅ 规划已保存！");
        const btn = document.querySelector(`.goal-student-btn[data-id="${currentStudent.id}"]`);
        if (btn && !btn.innerHTML.includes('✅')) btn.innerHTML += ` <span style="color:#28a745; font-weight:bold;">✅</span>`;
    });

    document.getElementById('goal-print-btn').addEventListener('click', () => {
        if (!currentStudent || !currentStrategy) return;
        let printRank = currentTargetData.type === 'rank' ? currentTargetData.val : '-';
        startGoalPrintJob(currentStudent, currentStrategy.targetScoreCalculated, printRank, currentStrategy);
    });

    // ------------------------------------------------------
    // 5. 管理大厅逻辑 (Tab 2)
    // ------------------------------------------------------
    const tabManage = document.querySelector('button[data-tab="manage"]');
    const tabCreate = document.querySelector('button[data-tab="create"]');
    tabManage.addEventListener('click', () => {
        document.getElementById('goal-tab-create').style.display = 'none';
        document.getElementById('goal-tab-manage').style.display = 'block';
        tabManage.classList.add('active');
        tabManage.style.borderBottomColor = 'var(--primary-color)';
        tabManage.style.color = 'var(--primary-color)';
        tabCreate.classList.remove('active');
        tabCreate.style.borderBottomColor = 'transparent';
        tabCreate.style.color = '#666';
        renderManageTable();
    });
    tabCreate.addEventListener('click', () => {
        document.getElementById('goal-tab-create').style.display = 'block';
        document.getElementById('goal-tab-manage').style.display = 'none';
        tabCreate.classList.add('active');
        tabCreate.style.borderBottomColor = 'var(--primary-color)';
        tabCreate.style.color = 'var(--primary-color)';
        tabManage.classList.remove('active');
        tabManage.style.borderBottomColor = 'transparent';
        tabManage.style.color = '#666';
    });
    document.getElementById('goal-manage-refresh').addEventListener('click', renderManageTable);

    // 渲染管理大厅表格 (支持点击表头排序)
    async function renderManageTable() {
        if (typeof window.G_GoalManageSort === 'undefined') {
            window.G_GoalManageSort = { key: 'id', direction: 'desc' };
        }

        const thead = document.querySelector('#goal-manage-table thead');
        if (thead && !thead.dataset.sortEnabled) {
            thead.dataset.sortEnabled = "true";
            thead.innerHTML = `
                <tr>
                    <th data-sort="className" style="cursor:pointer; user-select:none;">班级 ⇅</th>
                    <th data-sort="studentName" style="cursor:pointer; user-select:none;">姓名 ⇅</th>
                    <th data-sort="name" style="cursor:pointer; user-select:none;">规划名称 ⇅</th>
                    <th data-sort="mode" style="cursor:pointer; user-select:none;">类型 ⇅</th>
                    <th data-sort="target" style="cursor:pointer; user-select:none;">目标 ⇅</th>
                    <th>操作</th>
                </tr>
            `;
            thead.addEventListener('click', (e) => {
                const th = e.target.closest('th');
                if (!th || !th.dataset.sort) return;
                const key = th.dataset.sort;
                
                if (window.G_GoalManageSort.key === key) {
                    window.G_GoalManageSort.direction = window.G_GoalManageSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    window.G_GoalManageSort.key = key;
                    window.G_GoalManageSort.direction = 'desc';
                }
                renderManageTable();
            });
        }

        if (thead) {
            const ths = thead.querySelectorAll('th[data-sort]');
            ths.forEach(th => {
                th.style.color = '';
                let text = th.innerText.replace(/[↑↓⇅]/g, '').trim();
                th.innerText = text + ' ⇅';
                
                if (th.dataset.sort === window.G_GoalManageSort.key) {
                    th.style.color = '#007bff';
                    const icon = window.G_GoalManageSort.direction === 'asc' ? ' ↑' : ' ↓';
                    th.innerText = text + icon;
                }
            });
        }

        allArchives = await localforage.getItem('G_Goal_Archives') || {};
        const tbody = document.getElementById('goal-manage-tbody');
        const rows = [];
        
        Object.keys(allArchives).forEach(sid => {
            if (Array.isArray(allArchives[sid])) {
                allArchives[sid].forEach((plan, idx) => {
                    if (plan.sessionId === currentSessionId || (!plan.sessionId && currentSessionId === sessionMeta[0].id)) {
                        rows.push({ ...plan, idx, sid });
                    }
                });
            }
        });
        
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">当前列表 [${sessionLabel.innerText}] 暂无记录</td></tr>`;
            return;
        }
        
        const { key, direction } = window.G_GoalManageSort;
        rows.sort((a, b) => {
            let valA, valB;
            
            if (key === 'target') {
                valA = a.strategy.targetScoreCalculated || 0;
                valB = b.strategy.targetScoreCalculated || 0;
            } else if (key === 'mode') {
                valA = a.strategy.mode;
                valB = b.strategy.mode;
            } else if (key === 'id') {
                valA = a.id;
                valB = b.id;
            } else {
                valA = a[key] || '';
                valB = b[key] || '';
            }
            
            if (typeof valA === 'string') {
                return direction === 'asc' ? valA.localeCompare(valB, 'zh-CN') : valB.localeCompare(valA, 'zh-CN');
            } else {
                return direction === 'asc' ? valA - valB : valB - valA;
            }
        });
        
        tbody.innerHTML = rows.map(r => {
            const st = r.strategy || {};
            let targetDisplay = "";
            const isTotal = st.mode === 'total';
            const subjectLabel = isTotal ? "总分" : st.subject;

            if (st.targetType === 'rank') {
                targetDisplay = `${subjectLabel} 年排 <span style="color:#fd7e14; font-weight:bold;">${st.targetVal}</span> 名`;
            } else {
                const scoreVal = st.targetVal || st.targetScoreCalculated;
                targetDisplay = `${subjectLabel} <span style="color:#6f42c1; font-weight:bold;">${parseFloat(scoreVal).toFixed(1)}</span> 分`;
            }

            return `
                <tr>
                    <td>${r.className}</td>
                    <td onclick="showPlanDetail('${r.sid}', ${r.idx})" style="cursor:pointer; color:#007bff; font-weight:bold;" title="点击查看详情">
                        ${r.studentName} 📊
                    </td>
                    <td onclick="renamePlan('${r.sid}', ${r.idx})" style="cursor:pointer; color:#333;">
                        ${r.name || '未命名'} <span style="font-size:0.8em; color:#999;">✎</span>
                    </td>
                    <td>${isTotal ? '全科' : '单科'}</td>
                    <td>${targetDisplay}</td>
                    <td>
                        <button onclick="editPlanGlobal('${r.sid}', ${r.idx})" class="sidebar-button" style="background-color:#17a2b8; padding:4px 8px; font-size:0.8em;">修改</button>
                        <button onclick="reviewPlanGlobal('${r.sid}', ${r.idx})" class="sidebar-button" style="background-color:#28a745; padding:4px 8px; font-size:0.8em; margin-left:5px;">复盘</button>
                        <button onclick="deletePlanGlobal('${r.sid}', ${r.idx})" class="sidebar-button" style="background-color:#dc3545; padding:4px 8px; font-size:0.8em; margin-left:5px;">删除</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.renamePlan = async (sid, idx) => {
        let archives = await localforage.getItem('G_Goal_Archives');
        const newName = prompt("重命名:", archives[sid][idx].name);
        if (newName) {
            archives[sid][idx].name = newName;
            await localforage.setItem('G_Goal_Archives', archives);
            renderManageTable();
        }
    };
    window.deletePlanGlobal = async (sid, idx) => {
        if (!confirm("确定删除?")) return;
        let archives = await localforage.getItem('G_Goal_Archives');
        archives[sid].splice(idx, 1);
        await localforage.setItem('G_Goal_Archives', archives);
        renderManageTable();
    };

    // 详情查看 (含来源显示 + 打印)
    window.showPlanDetail = async (sid, idx) => {
        let archives = await localforage.getItem('G_Goal_Archives');
        const plan = archives[sid][idx];
        if (!plan) return;

        const outcomeData = getOutcomeData();
        let actualStudent = null;
        if (outcomeData) actualStudent = outcomeData.find(s => String(s.id) === String(sid));

        const modal = document.getElementById('goal-detail-modal');
        const titleEl = document.getElementById('goal-detail-title');
        const alertEl = document.getElementById('goal-detail-alert');
        const sourceInfoEl = document.getElementById('goal-detail-source-info');
        const kpiEl = document.getElementById('goal-detail-kpi');
        const tableEl = document.getElementById('goal-detail-table');
        const printBtn = document.getElementById('goal-detail-print-btn');

        titleEl.innerText = `${plan.studentName} - ${plan.name}`;

        const baseSource = plan.baselineSource || '系统默认/未知';
        const outSource = actualStudent ? currentOutcomeSourceName : null;

        sourceInfoEl.innerHTML = `
            <div style="background:#f1f3f5; padding:8px 12px; border-radius:6px; margin-bottom:15px; font-size:0.9em; color:#555; display:flex; flex-wrap:wrap; gap:15px;">
                <span>📄 <strong>规划基准:</strong> ${baseSource}</span>
                ${outSource ? `<span>📉 <strong>复盘依据:</strong> ${outSource}</span>` : ''}
            </div>
        `;

        if (actualStudent) {
            alertEl.style.display = 'none';
        } else {
            alertEl.innerHTML = `⚠️ 未检测到"达成成绩"数据源，当前仅显示规划内容。如需对比，请先在管理大厅顶部导入"达成成绩表"。`;
            alertEl.style.display = 'block';
        }

        const st = plan.strategy;
        const modeText = st.mode === 'total' ? "总分" : st.subject;
        let baseTotal = 0;
        st.details.forEach(d => baseTotal += d.current);

        let actualTotal = 0;
        let actualDiffHtml = '<span style="color:#ccc; font-size:0.5em;">(无数据)</span>';

        if (actualStudent) {
            if (st.mode === 'total') {
                actualTotal = actualStudent.totalScore;
            } else {
                actualTotal = actualStudent.scores[st.subject] || 0;
            }
            const diff = actualTotal - st.targetScoreCalculated;
            const diffIcon = diff >= 0 ? '🎉' : '⚠️';
            actualDiffHtml = `<span style="font-size:0.6em;">${diffIcon} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}</span>`;
        }

        kpiEl.innerHTML = `
            <div class="kpi-card"><h3>基准${modeText}</h3><div class="value">${baseTotal.toFixed(1)}</div></div>
            <div class="kpi-card"><h3>目标${modeText}</h3><div class="value" style="color:var(--color-purple)">${st.targetScoreCalculated.toFixed(1)}</div></div>
            ${actualStudent ? `<div class="kpi-card" style="border-left:5px solid #fd7e14;"><h3>实际${modeText}</h3><div class="value" style="color:#fd7e14;">${actualTotal} ${actualDiffHtml}</div></div>` : ''}
            <div class="kpi-card"><h3>计划提升</h3><div class="value" style="color:#28a745">+${(st.targetScoreCalculated - baseTotal).toFixed(1)}</div></div>
        `;

        let tableHtml = `<table><thead><tr><th>科目</th><th>基准分</th><th>目标分</th><th>计划增量</th>${actualStudent ? `<th style="background:#fff8e1;">实际分</th><th style="background:#fff8e1;">达成差值</th>` : ''}<th>策略</th></tr></thead><tbody>`;
        st.details.forEach(d => {
            let actualCell = '';
            if (actualStudent) {
                const actScore = actualStudent.scores[d.subject] || 0;
                const diff = actScore - d.target;
                const color = diff >= 0 ? 'green' : 'red';
                const icon = diff >= 0 ? '✅' : '❌';
                actualCell = `<td style="font-weight:bold; background:#fffbf0;">${actScore}</td><td style="color:${color}; background:#fffbf0;">${icon} ${diff > 0 ? '+' : ''}${diff.toFixed(1)}</td>`;
            }
            tableHtml += `<tr><td>${d.subject}</td><td>${d.current}</td><td><strong>${d.target.toFixed(1)}</strong></td><td style="color:#6f42c1;">+${d.gain.toFixed(1)}</td>${actualCell}<td>${d.difficultyText}</td></tr>`;
        });
        tableHtml += `</tbody></table>`;
        tableEl.innerHTML = tableHtml;

        printBtn.onclick = () => {
            startDetailPrintJob(plan, actualStudent, baseTotal, actualTotal, baseSource, outSource);
        };

        modal.style.display = 'flex';
        setTimeout(() => {
            if (st.mode === 'total') {
                renderGoalWaterfall('goal-detail-waterfall-chart', baseTotal, st.targetScoreCalculated, st.details);
                renderGoalRadarComparison('goal-detail-radar-chart', st.details, actualStudent);
            } else {
                document.getElementById('goal-detail-waterfall-chart').innerHTML = '<p style="text-align:center; padding-top:50px; color:#999;">单科模式无瀑布图</p>';
                document.getElementById('goal-detail-radar-chart').innerHTML = '<p style="text-align:center; padding-top:50px; color:#999;">单科模式无雷达图</p>';
            }
        }, 100);
    };

    // 全局修改函数：回填数据并切换Tab
    window.editPlanGlobal = async (sid, idx) => {
        let archives = await localforage.getItem('G_Goal_Archives');
        const plan = archives[sid][idx];
        if (!plan) return;

        G_EditingPlanState = { sid: sid, idx: idx };
        
        document.querySelector('button[data-tab="create"]').click();
        
        selectStudent(sid);

        const st = plan.strategy;
        
        const modeRadio = document.querySelector(`input[name="plan-mode"][value="${st.mode}"]`);
        if (modeRadio) modeRadio.click();

        if (st.mode === 'single') {
            const subSelect = document.getElementById('goal-single-subject-select');
            subSelect.value = st.subject;
            subSelect.dispatchEvent(new Event('change'));
        }

        const typeSelect = document.getElementById('goal-target-type');
        if (st.targetType) {
            typeSelect.value = st.targetType;
            typeSelect.dispatchEvent(new Event('change'));
        }

        document.getElementById('goal-target-val').value = st.targetVal || "";

        const saveBtn = document.getElementById('goal-save-btn');
        saveBtn.innerHTML = "💾 确认修改 (覆盖旧记录)";
        saveBtn.style.backgroundColor = "#17a2b8";
        
        alert(`已加载【${plan.studentName}】的规划。\n请调整目标值后，点击"生成规划"，最后点击"确认修改"。`);
    };

    // 复盘查看 (智能识别 排名/分数 目标)
    window.reviewPlanGlobal = async (sid, idx) => {
        const outcomeData = getOutcomeData();
        if (!outcomeData) {
            alert("⚠️ 请先在顶部右侧导入【达成成绩表】，系统才能进行对比复盘！");
            return;
        }

        let archives = await localforage.getItem('G_Goal_Archives');
        const plan = archives[sid][idx];
        const actualStudent = outcomeData.find(s => String(s.id) === String(sid));

        const panel = document.getElementById('goal-review-panel');
        const content = document.getElementById('goal-review-content');
        panel.style.display = 'block';

        if (!actualStudent) {
            content.innerHTML = `<div style="padding:20px; text-align:center; color:#dc3545; background:#fff5f5; border-radius:8px;">❌ 错误：在"达成成绩表"中未找到该学生 (考号 ${sid})。<br>请检查是否导入了正确的考试数据。</div>`;
            return;
        }

        const st = plan.strategy;
        const isRankGoal = st.targetType === 'rank';
        const isTotal = st.mode === 'total';
        const subject = st.subject;

        const targetVal = parseFloat(st.targetVal || st.targetScoreCalculated);

        let actualVal = 0;
        if (isRankGoal) {
            if (isTotal) {
                actualVal = actualStudent.gradeRank;
            } else {
                actualVal = (actualStudent.gradeRanks && actualStudent.gradeRanks[subject]) ? actualStudent.gradeRanks[subject] : 9999;
            }
        } else {
            if (isTotal) {
                actualVal = actualStudent.totalScore;
            } else {
                actualVal = actualStudent.scores[subject] || 0;
            }
        }

        let diff = 0;
        let isAchieved = false;
        let resultHtml = "";

        if (isRankGoal) {
            diff = targetVal - actualVal;
            isAchieved = actualVal <= targetVal;
            
            const color = isAchieved ? '#28a745' : '#dc3545';
            const icon = isAchieved ? '🎉 达成' : '⚠️ 未达成';
            const diffText = diff > 0 ? `前进 ${Math.abs(diff)} 名` : (diff < 0 ? `后退 ${Math.abs(diff)} 名` : `持平`);
            
            resultHtml = `
                <div class="kpi-card" style="background:#fff; border-left: 5px solid ${color}; width:100%; margin-bottom:20px;">
                    <h3>核心目标 (${isTotal ? '总分' : subject}年排)</h3>
                    <div style="display:flex; align-items:baseline; gap:15px;">
                        <span style="font-size:1.2em; color:#666;">目标: <strong>${targetVal}</strong></span>
                        <span style="font-size:1.2em; color:#333;">实际: <strong>${actualVal}</strong></span>
                        <span style="font-size:1.4em; font-weight:bold; color:${color}; margin-left:auto;">${icon} <span style="font-size:0.6em;">(${diffText})</span></span>
                    </div>
                </div>
            `;
        } else {
            diff = actualVal - targetVal;
            isAchieved = actualVal >= targetVal;
            
            const color = isAchieved ? '#28a745' : '#dc3545';
            const icon = isAchieved ? '🎉 达成' : '⚠️ 未达成';
            const diffText = diff > 0 ? `超 ${Math.abs(diff).toFixed(1)} 分` : `差 ${Math.abs(diff).toFixed(1)} 分`;

            resultHtml = `
                <div class="kpi-card" style="background:#fff; border-left: 5px solid ${color}; width:100%; margin-bottom:20px;">
                    <h3>核心目标 (${isTotal ? '总分' : subject})</h3>
                    <div style="display:flex; align-items:baseline; gap:15px;">
                        <span style="font-size:1.2em; color:#666;">目标: <strong>${targetVal}</strong></span>
                        <span style="font-size:1.2em; color:#333;">实际: <strong>${actualVal}</strong></span>
                        <span style="font-size:1.4em; font-weight:bold; color:${color}; margin-left:auto;">${icon} <span style="font-size:0.6em;">(${diffText})</span></span>
                    </div>
                </div>
            `;
        }

        const radios = document.getElementsByName('goal-trend-mode');
        const drawChart = () => {
            let mode = 'student';
            radios.forEach(r => { if (r.checked) mode = r.value; });
            const trendX = [];
            const trendY = [];

            if (mode === 'student') {
                const studentPlans = archives[sid] || [];
                const sessionPlans = studentPlans.filter(p => p.sessionId === currentSessionId).sort((a, b) => a.id - b.id);
                sessionPlans.forEach(p => {
                    if (p.strategy.mode === 'total' && actualStudent) {
                        const rate = (actualStudent.totalScore / p.strategy.targetScoreCalculated) * 100;
                        trendX.push(p.name);
                        trendY.push(parseFloat(rate.toFixed(1)));
                    }
                });
                renderGoalTrendChart('goal-trend-line-chart', trendX, trendY, `得分达成率趋势 (当前学生: ${plan.studentName})`);
            } else {
                const allSessionPlans = [];
                Object.values(archives).forEach(userPlans => {
                    userPlans.forEach(p => { if (p.sessionId === currentSessionId) allSessionPlans.push(p); });
                });
                const groups = {};
                allSessionPlans.forEach(p => {
                    if (p.strategy.mode === 'total') {
                        if (!groups[p.name]) groups[p.name] = { sumRate: 0, count: 0, ts: p.id };
                        const sData = outcomeData.find(s => String(s.id) === String(p.studentId));
                        if (sData) {
                            const rate = (sData.totalScore / p.strategy.targetScoreCalculated) * 100;
                            groups[p.name].sumRate += rate;
                            groups[p.name].count++;
                        }
                    }
                });
                const sortedGroups = Object.keys(groups).map(name => ({
                    name: name,
                    avgRate: groups[name].count > 0 ? (groups[name].sumRate / groups[name].count) : 0,
                    ts: groups[name].ts
                })).sort((a, b) => a.ts - b.ts);
                sortedGroups.forEach(g => {
                    trendX.push(g.name);
                    trendY.push(parseFloat(g.avgRate.toFixed(1)));
                });
                renderGoalTrendChart('goal-trend-line-chart', trendX, trendY, `得分达成率趋势 (全列表平均)`);
            }
        };
        radios.forEach(r => r.onclick = drawChart);
        radios[0].checked = true;
        drawChart();

        let tableHtml = `<h4>${plan.studentName} - ${plan.name} (科目细分)</h4>`;
        tableHtml += `<table><thead><tr><th>科目</th><th>规划分数目标</th><th>实际得分</th><th>状态</th></tr></thead><tbody>`;
        
        st.details.forEach(d => {
            const actual = actualStudent.scores[d.subject] || 0;
            const diff = actual - d.target;
            const status = diff >= 0 ? '✅' : `🔻 ${diff.toFixed(1)}`;
            const color = diff >= 0 ? 'green' : 'red';
            tableHtml += `<tr><td>${d.subject}</td><td>${d.target.toFixed(1)}</td><td style="font-weight:bold;">${actual}</td><td style="color:${color}">${status}</td></tr>`;
        });
        tableHtml += `</tbody></table>`;

        content.innerHTML = resultHtml + tableHtml;
        
        panel.scrollIntoView({ behavior: 'smooth' });
    };
}

