/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';
import { loadExcelData, addSubjectRanksToData } from '../../data/parser.js';
import { renderMultiExamLineChart, renderSubjectRankChart } from './charts.js';
import { startMultiTablePrintJob } from './print.js';
import {
    ensureCollectionsExist,
    loadMultiExamData,
    saveMultiExamData,
    renderCollectionSelect,
    setActiveCollection,
    createCollection,
    renameActiveCollection,
    deleteActiveCollection,
    COLLECTIONS_KEY
} from './storage.js';

const TEMPLATE = `
    <h2>考试系统中心和多次数据分析</h2>
    <p style="margin-top: -20px; margin-bottom: 20px; color: var(--text-muted);">
        在此模块上传的成绩将被浏览器永久保存（直到您手动清除）。
    </p>

    <div class="main-card-wrapper" style="margin-bottom: 20px;">
        <h4>考试列表管理</h4>
        <ol id="multi-exam-list" class="multi-exam-list-container"></ol>

        <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 15px 0 0 0; border-top: 1px solid var(--border-color); flex-wrap: wrap; justify-content: space-between;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <label for="multi-file-uploader" class="upload-label" style="padding: 10px 16px; background-color: var(--primary-color); color: white;">
                    📊 添加成绩 (可多选)
                </label>
                <input type="file" id="multi-file-uploader" accept=".xlsx, .xls, .csv" style="display: none;" multiple>

                <label for="multi-json-uploader" class="upload-label" style="padding: 10px 16px; background-color: var(--color-orange); color: white;">
                    📥 导入全系统备份 (JSON)
                </label>
                <input type="file" id="multi-json-uploader" accept=".json" style="display: none;">
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="multi-export-all" class="sidebar-button" style="background-color: var(--color-green);">
                    📤 导出全系统备份 (JSON)
                </button>
                <button id="multi-clear-all" class="sidebar-button" style="background-color: var(--color-red);">
                    🗑️ 清除全部
                </button>
            </div>
        </div>
        <span id="multi-file-status" style="margin-top: 10px; color: var(--text-muted); display: block;"></span>
    </div>

    <div class="main-card-wrapper" style="margin-bottom: 20px;">
        <div class="controls-bar">
            <label for="multi-student-search">搜索学生 (姓名/考号):</label>
            <div class="search-combobox">
                <input type="text" id="multi-student-search" placeholder="输入姓名或考号..." autocomplete="off">
                <div class="search-results" id="multi-student-search-results"></div>
            </div>
        </div>
    </div>

    <div id="multi-student-report" style="display: none;">
        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <h4 id="multi-student-name-title">学生报表</h4>
            
            <div id="multi-subject-filter-container">
                <div class="main-card-wrapper" style="padding: 15px; margin-top: 10px; box-shadow: var(--shadow-sm);">
                    <h5>各科成绩曲线 (图1) - 科目筛选</h5>
                    <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; flex-wrap: wrap; gap: 10px;">
                        <button id="multi-subject-all" class="sidebar-button" style="padding: 5px 10px; font-size: 0.8em;">全选</button>
                        <button id="multi-subject-none" class="sidebar-button" style="padding: 5px 10px; font-size: 0.8em; background-color: var(--color-gray);">全不选</button>
                    </div>
                    <div id="multi-subject-checkboxes" class="multi-subject-filter-container"></div>
                </div>
            </div>

            <div class="dashboard-chart-grid-1x1" style="margin-top: 20px;">
                <div class="main-card-wrapper" style="padding: 15px; margin-bottom: 0; border-bottom: none; border-radius: 8px 8px 0 0;">
                    <h4 style="margin: 0;">1. 各科分数变化曲线</h4>
                    <p style="margin: 5px 0 0 0; font-size: 0.8em; color: var(--text-muted);">* 受上方“科目复选框”控制</p>
                </div>
                <div class="chart-container" id="multi-exam-score-chart" style="height: 350px; margin-top: 0; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px; background: #fff;"></div>

                <div class="main-card-wrapper" style="padding: 15px; margin-top: 20px; margin-bottom: 0; border-bottom: none; border-radius: 8px 8px 0 0;">
                    <h4 style="margin: 0;">2. 总分排名变化曲线</h4>
                    <p style="margin: 5px 0 0 0; font-size: 0.8em; color: var(--text-muted);">* 固定显示总分排名，不受筛选影响</p>
                </div>
                <div class="chart-container" id="multi-exam-rank-chart" style="height: 350px; margin-top: 0; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px; background: #fff;"></div>

                <div class="main-card-wrapper" style="padding: 15px; margin-top: 20px; margin-bottom: 0; border-bottom: none; border-radius: 8px 8px 0 0;">
                    <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; margin: 0; justify-content: space-between; flex-wrap: wrap;">
                        <h4 style="margin: 0;">3. 各科排名变化曲线</h4>
                        
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <label for="multi-rank-type-select" style="margin: 0; font-size: 0.9em;">显示类型:</label>
                            <select id="multi-rank-type-select" class="sidebar-select" style="width: auto; padding: 6px 12px;">
                                <option value="both">同时显示 (班排 + 年排)</option>
                                <option value="class">仅看班级排名</option>
                                <option value="grade">仅看年级排名</option>
                            </select>
                        </div>
                    </div>
                    <p style="margin: 5px 0 0 0; font-size: 0.8em; color: var(--text-muted);">
                        * 受上方“科目复选框” 和 此处“显示类型” 共同控制
                    </p>
                </div>
                <div class="chart-container" id="multi-exam-subject-rank-chart" style="height: 350px; margin-top: 0; border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px; background: #fff;"></div>
            </div>

            <div id="multi-student-table-container" class="multi-exam-table-container"></div>
        </div>
    </div>
`;

const searchState = {
    initialized: false,
    students: [],
    input: null,
    results: null,
    report: null
};

export async function renderMultiExam(container) {
    if (!container) return;
    container.innerHTML = TEMPLATE;

    await ensureCollectionsExist();
    await renderCollectionSelect(document.getElementById('multi-collection-select'));
    bindCollectionDrawer();

    const statusLabel = document.getElementById('multi-file-status');
    const multiUploader = document.getElementById('multi-file-uploader');
    const jsonUploader = document.getElementById('multi-json-uploader');
    const exportBtn = document.getElementById('multi-export-all');
    const clearBtn = document.getElementById('multi-clear-all');
    const listContainer = document.getElementById('multi-exam-list');

    multiUploader.addEventListener('change', (event) => handleMultiFileUpload(event, statusLabel));
    jsonUploader.addEventListener('change', (event) => handleJsonImport(event, statusLabel, jsonUploader));
    exportBtn.addEventListener('click', () => handleFullBackupExport(statusLabel, exportBtn));
    clearBtn.addEventListener('click', () => handleClearAll(statusLabel));
    listContainer.addEventListener('input', handleListRename);
    listContainer.addEventListener('click', handleListActions);

    bindRankTypeSelect();
    bindSubjectCheckboxShortcuts();

    const initialData = await loadMultiExamData();
    renderMultiExamList(initialData);
    initializeStudentSearch(initialData);
    toggleReportVisibility(false);
}

async function handleMultiFileUpload(event, statusLabel) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    statusLabel.innerText = `🔄 正在解析 ${files.length} 个文件...`;
    let currentData = await loadMultiExamData();

    try {
        for (const file of files) {
            const { processedData } = await loadExcelData(file);
            const rankedData = addSubjectRanksToData(processedData);

            currentData.push({
                id: Date.now() + Math.random(),
                originalName: file.name,
                label: file.name.replace(/\.xlsx|\.xls|\.csv/gi, ''),
                students: rankedData,
                isHidden: false
            });
        }

        await saveMultiExamData(currentData);
        await renderCollectionSelect(document.getElementById('multi-collection-select'));
        renderMultiExamList(currentData);
        initializeStudentSearch(currentData);
        toggleReportVisibility(false);
        statusLabel.innerText = `✅ 成功添加 ${files.length} 次考试。`;
        statusLabel.style.color = 'var(--color-green)';
    } catch (err) {
        console.error(err);
        statusLabel.innerText = `❌ 加载失败: ${err.message}`;
        statusLabel.style.color = 'var(--color-red)';
    } finally {
        event.target.value = '';
    }
}

async function handleListRename(event) {
    if (!event.target || event.target.dataset.role !== 'label') return;
    const listItem = event.target.closest('li');
    if (!listItem) return;

    const data = await loadMultiExamData();
    const target = data.find(exam => String(exam.id) === listItem.dataset.id);
    if (!target) return;

    target.label = event.target.value;
    await saveMultiExamData(data);
    await renderCollectionSelect(document.getElementById('multi-collection-select'));
    initializeStudentSearch(data);
    toggleReportVisibility(false);
}

async function handleListActions(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const role = button.dataset.role;
    if (!role) return;

    const listItem = button.closest('li');
    if (!listItem) return;

    let data = await loadMultiExamData();
    const index = data.findIndex(exam => String(exam.id) === listItem.dataset.id);
    if (index === -1) return;

    if (role === 'toggle-hide') {
        data[index].isHidden = !data[index].isHidden;
    } else if (role === 'delete') {
        const label = data[index].label;
        if (!confirm(`您确定要删除 "${label}" 这次考试吗？\n此操作不可撤销。`)) return;
        data.splice(index, 1);
    } else if (role === 'up' && index > 0) {
        [data[index - 1], data[index]] = [data[index], data[index - 1]];
    } else if (role === 'down' && index < data.length - 1) {
        [data[index], data[index + 1]] = [data[index + 1], data[index]];
    }

    await saveMultiExamData(data);
    renderMultiExamList(data);
    initializeStudentSearch(data);
    toggleReportVisibility(false);
}

async function handleClearAll(statusLabel) {
    if (!confirm('您确定要清除所有已保存的“多次考试”数据吗？此操作不可撤销。')) return;
    await saveMultiExamData([]);
    renderMultiExamList([]);
    initializeStudentSearch([]);
    toggleReportVisibility(false);
    statusLabel.innerText = '✅ 已清空当前考试列表。';
    statusLabel.style.color = 'var(--color-green)';
}

async function handleFullBackupExport(statusLabel, button) {
    try {
        button.disabled = true;
        button.innerText = '📦 打包中...';
        statusLabel.innerText = '⏳ 正在收集数据...';

        const [
            collections,
            goalArchives,
            goalSessionMeta,
            itemLibrary,
            subjectConfigs
        ] = await Promise.all([
            localforage.getItem(COLLECTIONS_KEY),
            localforage.getItem('G_Goal_Archives'),
            localforage.getItem('G_Goal_Session_Meta'),
            localforage.getItem('G_ItemAnalysis_Library'),
            localforage.getItem('G_SubjectConfigs')
        ]);

        const meta = {
            activeCollectionId: localStorage.getItem('G_MultiExam_ActiveId'),
            activeGoalSessionId: localStorage.getItem('G_Goal_Current_Session_ID'),
            deepSeekKey: localStorage.getItem('G_DeepSeekKey'),
            theme: localStorage.getItem('app_theme')
        };

        const fullBackup = {
            __version__: 'SmartPrism_Full_v2.0',
            timestamp: new Date().toLocaleString(),
            data: {
                collections: collections || {},
                goalArchives: goalArchives || {},
                goalSessionMeta: goalSessionMeta || [],
                itemLibrary: itemLibrary || [],
                subjectConfigs: subjectConfigs || {},
                meta
            }
        };

        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `智慧棱镜_全系统备份_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        statusLabel.innerText = '✅ 全系统备份已导出。';
        statusLabel.style.color = 'var(--color-green)';
    } catch (err) {
        console.error(err);
        statusLabel.innerText = `❌ 导出失败: ${err.message}`;
        statusLabel.style.color = 'var(--color-red)';
    } finally {
        button.disabled = false;
        button.innerText = '📤 导出全系统备份 (JSON)';
    }
}

function handleJsonImport(event, statusLabel, inputEl) {
    const file = event.target.files[0];
    if (!file) return;

    statusLabel.innerText = '⏳ 正在解析备份文件...';
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const jsonContent = JSON.parse(e.target.result);
            if (jsonContent.__version__ && jsonContent.__version__.startsWith('SmartPrism_Full')) {
                await importFullBackup(jsonContent, statusLabel);
            } else if (Array.isArray(jsonContent) || (jsonContent.length > 0 && jsonContent[0].students)) {
                await importLegacyExamList(jsonContent, statusLabel);
            } else {
                throw new Error('无法识别的文件格式。请确保这是由本系统导出的 JSON 备份。');
            }
        } catch (err) {
            console.error(err);
            alert(`❌ 导入失败: ${err.message}`);
            statusLabel.innerText = '❌ 文件解析错误';
            statusLabel.style.color = 'var(--color-red)';
        } finally {
            inputEl.value = '';
        }
    };

    reader.onerror = () => {
        alert('文件读取失败，请重试。');
        statusLabel.innerText = '❌ 文件读取失败';
        statusLabel.style.color = 'var(--color-red)';
        inputEl.value = '';
    };

    reader.readAsText(file);
}

async function importFullBackup(jsonContent, statusLabel) {
    const { data, timestamp } = jsonContent;
    if (!confirm(`检测到全系统备份文件 (创建于 ${timestamp})。\n\n包含：\n- 📚 考试列表库\n- 🎯 目标规划数据\n- 🔬 小题分析库\n- ⚙️ 系统配置\n\n【警告】导入将覆盖当前浏览器的所有历史数据！\n确定要还原吗？`)) {
        statusLabel.innerText = '操作已取消';
        return;
    }

    statusLabel.innerText = '🔄 正在还原数据...';
    await Promise.all([
        localforage.setItem(COLLECTIONS_KEY, data.collections || {}),
        localforage.setItem('G_Goal_Archives', data.goalArchives || {}),
        localforage.setItem('G_Goal_Session_Meta', data.goalSessionMeta || []),
        localforage.setItem('G_ItemAnalysis_Library', data.itemLibrary || []),
        localforage.setItem('G_SubjectConfigs', data.subjectConfigs || {})
    ]);

    if (data.meta) {
        if (data.meta.activeCollectionId) localStorage.setItem('G_MultiExam_ActiveId', data.meta.activeCollectionId);
        if (data.meta.activeGoalSessionId) localStorage.setItem('G_Goal_Current_Session_ID', data.meta.activeGoalSessionId);
        if (data.meta.deepSeekKey) localStorage.setItem('G_DeepSeekKey', data.meta.deepSeekKey);
        if (data.meta.theme) {
            localStorage.setItem('app_theme', data.meta.theme);
            if (data.meta.theme === 'dark') document.body.setAttribute('data-theme', 'dark');
        }
    }

    alert('✅ 全系统数据还原成功！页面即将刷新。');
    location.reload();
}

async function importLegacyExamList(examList, statusLabel) {
    if (!confirm('检测到旧版备份文件 (仅包含考试列表)。\n\n是否将其导入到当前选中的列表库中？')) {
        statusLabel.innerText = '操作已取消';
        return;
    }
    await saveMultiExamData(examList);
    renderMultiExamList(examList);
    initializeStudentSearch(examList);
    toggleReportVisibility(false);
    statusLabel.innerText = '✅ 旧版数据已导入 (仅更新考试列表)';
    statusLabel.style.color = 'var(--color-green)';
}

function renderMultiExamList(multiExamData) {
    const listContainer = document.getElementById('multi-exam-list');
    if (!listContainer) return;

    if (!multiExamData || multiExamData.length === 0) {
        listContainer.innerHTML = '<li class="multi-exam-item-empty">暂无数据，请点击“添加成绩”上传。</li>';
        return;
    }

    listContainer.innerHTML = multiExamData.map((item, index) => `
        <li class="multi-exam-item ${item.isHidden ? 'is-hidden' : ''}" data-id="${item.id}">
            <span class="multi-exam-index">${index + 1}.</span>
            <input type="text" value="${item.label}" data-role="label" class="multi-exam-label" title="点击可重命名: ${item.originalName}">
            <div class="multi-exam-buttons">
                <button data-role="up" ${index === 0 ? 'disabled' : ''}>▲</button>
                <button data-role="down" ${index === multiExamData.length - 1 ? 'disabled' : ''}>▼</button>
                <button data-role="toggle-hide" class="hide-btn" title="${item.isHidden ? '点击设为可见' : '点击设为隐藏'}">
                    ${item.isHidden ? '🚫' : '👁️'}
                </button>
                <button data-role="delete" class="delete-btn">×</button>
            </div>
        </li>
    `).join('');
}

function initializeStudentSearch(multiExamData) {
    const searchInput = document.getElementById('multi-student-search');
    const resultsContainer = document.getElementById('multi-student-search-results');
    const reportContainer = document.getElementById('multi-student-report');
    if (!searchInput || !resultsContainer || !reportContainer) return;

    searchState.input = searchInput;
    searchState.results = resultsContainer;
    searchState.report = reportContainer;
    searchState.students = buildStudentIndex(multiExamData);

    if (searchState.initialized) return;
    searchState.initialized = true;

    searchInput.addEventListener('input', handleStudentSearchInput);
    resultsContainer.addEventListener('click', handleStudentSelect);
    document.addEventListener('click', (e) => {
        if (!resultsContainer.contains(e.target) && !searchInput.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });
}

function buildStudentIndex(multiExamData) {
    const allStudentsMap = new Map();
    multiExamData.filter(exam => !exam.isHidden).forEach(exam => {
        exam.students.forEach(student => {
            if (!allStudentsMap.has(student.id)) {
                allStudentsMap.set(student.id, student.name);
            }
        });
    });
    return Array.from(allStudentsMap, ([id, name]) => ({ id, name }));
}

function handleStudentSearchInput(event) {
    const term = event.target.value.trim().toLowerCase();
    if (term.length < 1) {
        searchState.results.innerHTML = '';
        searchState.results.style.display = 'none';
        return;
    }

    const filtered = searchState.students.filter(s =>
        String(s.name).toLowerCase().includes(term) || String(s.id).toLowerCase().includes(term)
    ).slice(0, 50);

    if (filtered.length === 0) {
        searchState.results.innerHTML = '<div class="result-item">-- 未找到 --</div>';
    } else {
        searchState.results.innerHTML = filtered.map(s => `
            <div class="result-item" data-id="${s.id}">
                <strong>${s.name}</strong> (${s.id})
            </div>
        `).join('');
    }
    searchState.results.style.display = 'block';
}

async function handleStudentSelect(event) {
    const item = event.target.closest('.result-item');
    if (!item || !item.dataset.id) return;

    const studentId = item.dataset.id;
    const studentName = item.querySelector('strong').innerText;
    searchState.input.value = `${studentName} (${studentId})`;
    searchState.results.innerHTML = '';
    searchState.results.style.display = 'none';

    document.getElementById('multi-student-name-title').innerText = `${studentName} 的成绩曲线`;
    searchState.report.dataset.studentId = studentId;
    toggleReportVisibility(true);

    const data = await loadMultiExamData();
    drawMultiExamChartsAndTable(studentId, data, true);
}

async function redrawCharts(force = false) {
    const report = document.getElementById('multi-student-report');
    if (!report || !report.dataset.studentId) return;
    const currentData = await loadMultiExamData();
    drawMultiExamChartsAndTable(report.dataset.studentId, currentData, force);
}

function bindRankTypeSelect() {
    const rankTypeSelect = document.getElementById('multi-rank-type-select');
    if (!rankTypeSelect) return;
    rankTypeSelect.addEventListener('change', () => redrawCharts(false));
}

function bindSubjectCheckboxShortcuts() {
    const checkboxContainer = document.getElementById('multi-subject-checkboxes');
    const selectAllBtn = document.getElementById('multi-subject-all');
    const selectNoneBtn = document.getElementById('multi-subject-none');

    if (checkboxContainer) {
        checkboxContainer.addEventListener('change', () => redrawCharts(false));
    }
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
            redrawCharts(false);
        });
    }
    if (selectNoneBtn) {
        selectNoneBtn.addEventListener('click', () => {
            checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            redrawCharts(false);
        });
    }
}

function toggleReportVisibility(show) {
    const report = document.getElementById('multi-student-report');
    if (report) {
        report.style.display = show ? 'block' : 'none';
        if (!show) delete report.dataset.studentId;
    }
}

function getCheckedSubjects(forceRepopulate, dynamicSubjects) {
    const checkboxContainer = document.getElementById('multi-subject-checkboxes');
    if (!checkboxContainer) return new Set();

    if (forceRepopulate) {
        checkboxContainer.innerHTML = dynamicSubjects.map(subject => `
            <div>
                <input type="checkbox" id="multi-cb-${subject}" value="${subject}" checked>
                <label for="multi-cb-${subject}">${subject}</label>
            </div>
        `).join('');
    }

    const checked = new Set();
    checkboxContainer.querySelectorAll('input:checked').forEach(cb => checked.add(cb.value));
    return checked;
}

function drawMultiExamChartsAndTable(studentId, multiExamData, forceRepopulateCheckboxes = false) {
    const visibleExams = multiExamData.filter(e => !e.isHidden);
    const examNames = visibleExams.map(e => e.label);

    const rankData = { classRank: [], gradeRank: [] };
    const subjectData = {};
    const subjectRankData = {};
    const subjectSet = new Set();

    visibleExams.forEach(exam => {
        exam.students.forEach(student => {
            if (student.scores) Object.keys(student.scores).forEach(subject => subjectSet.add(subject));
        });
    });

    const dynamicSubjects = Array.from(subjectSet);
    dynamicSubjects.forEach(subject => {
        subjectData[subject] = [];
        subjectRankData[subject] = { classRank: [], gradeRank: [] };
    });

    let currentStudentName = '学生';
    let currentStudentClass = '';

    visibleExams.forEach(exam => {
        const student = exam.students.find(s => String(s.id) === String(studentId));
        if (student) {
            if (currentStudentName === '学生') {
                currentStudentName = student.name;
                currentStudentClass = student.class;
            }
            rankData.classRank.push(student.rank || null);
            rankData.gradeRank.push(student.gradeRank || null);

            dynamicSubjects.forEach(subject => {
                const rawScore = student.scores[subject];
                subjectData[subject].push((rawScore !== null && rawScore !== undefined) ? rawScore : null);

                let classRank = null;
                let gradeRank = null;
                if (typeof rawScore === 'number' && !isNaN(rawScore)) {
                    classRank = student.classRanks ? student.classRanks[subject] : null;
                    gradeRank = student.gradeRanks ? student.gradeRanks[subject] : null;
                }
                subjectRankData[subject].classRank.push(classRank);
                subjectRankData[subject].gradeRank.push(gradeRank);
            });
        } else {
            rankData.classRank.push(null);
            rankData.gradeRank.push(null);
            dynamicSubjects.forEach(subject => {
                subjectData[subject].push(null);
                subjectRankData[subject].classRank.push(null);
                subjectRankData[subject].gradeRank.push(null);
            });
        }
    });

    const checkedSubjects = getCheckedSubjects(forceRepopulateCheckboxes, dynamicSubjects);
    const scoreSeries = dynamicSubjects
        .filter(subject => checkedSubjects.has(subject))
        .map(subject => ({ name: subject, data: subjectData[subject] }));

    renderMultiExamLineChart('multi-exam-score-chart', '', examNames, scoreSeries, false);

    const totalRankSeries = [
        { name: '班级排名 (总)', data: rankData.classRank },
        { name: '年级排名 (总)', data: rankData.gradeRank }
    ];
    renderMultiExamLineChart('multi-exam-rank-chart', '', examNames, totalRankSeries, true);

    const rankTypeSelect = document.getElementById('multi-rank-type-select');
    const rankType = rankTypeSelect ? rankTypeSelect.value : 'both';
    renderSubjectRankChart('multi-exam-subject-rank-chart', examNames, visibleExams, studentId, checkedSubjects, rankType);

    renderMultiExamTables(
        studentId,
        currentStudentName,
        currentStudentClass,
        examNames,
        dynamicSubjects,
        rankData,
        subjectData,
        subjectRankData,
        visibleExams
    );
}

function renderMultiExamTables(studentId, studentName, studentClass, examNames, subjects, rankData, subjectData, subjectRankData, visibleExams) {
    const tableContainer = document.getElementById('multi-student-table-container');
    if (!tableContainer) return;

    const safeVal = (v) => (v !== null && v !== undefined ? v : '-');

    const generateSingleTableHTML = (sName, sClass, sId, sRankData, sSubData, sSubRankData) => `
        <div class="print-page-wrapper" style="page-break-after: always; padding: 20px;">
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0;">${sName} - 历次考试成绩详情</h2>
                <p style="margin:5px 0; color:#666;">班级: ${sClass} | 考号: ${sId}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: center;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="border: 1px solid #999; padding: 8px; min-width: 120px;">考试名称</th>
                        <th style="border: 1px solid #999; padding: 8px;">班级排名 (总)</th>
                        <th style="border: 1px solid #999; padding: 8px;">年级排名 (总)</th>
                        ${subjects.map(s => `<th style="border: 1px solid #999; padding: 8px;">${s}<br>(分数)</th>`).join('')}
                        ${subjects.map(s => `<th style="border: 1px solid #999; padding: 8px;">${s}<br>(班排)</th>`).join('')}
                        ${subjects.map(s => `<th style="border: 1px solid #999; padding: 8px;">${s}<br>(年排)</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${examNames.map((examName, index) => `
                        <tr>
                            <td style="border: 1px solid #999; padding: 8px; font-weight: bold;">${examName}</td>
                            <td style="border: 1px solid #999; padding: 8px;">${safeVal(sRankData.classRank[index])}</td>
                            <td style="border: 1px solid #999; padding: 8px;">${safeVal(sRankData.gradeRank[index])}</td>
                            ${subjects.map(subject => `<td style="border: 1px solid #999; padding: 8px;">${safeVal(sSubData[subject][index])}</td>`).join('')}
                            ${subjects.map(subject => `<td style="border: 1px solid #999; padding: 8px;">${safeVal(sSubRankData[subject].classRank[index])}</td>`).join('')}
                            ${subjects.map(subject => `<td style="border: 1px solid #999; padding: 8px;">${safeVal(sSubRankData[subject].gradeRank[index])}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 20px; text-align: right; font-size: 10px; color: #999;">
                生成时间: ${new Date().toLocaleString()}
            </div>
        </div>
    `;

    const currentStudentHtml = generateSingleTableHTML(studentName, studentClass, studentId, rankData, subjectData, subjectRankData);
    tableContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-top: 20px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
            <h4 style="margin: 0;">成绩详情表</h4>
            <div>
                <button id="multi-print-table-btn" class="sidebar-button" style="font-size: 0.9em; padding: 6px 12px; background-color: var(--color-gray);">
                    🖨️ 打印当前
                </button>
                <button id="multi-batch-print-btn" class="sidebar-button" style="font-size: 0.9em; padding: 6px 12px; background-color: var(--color-blue); margin-left: 10px;">
                    📑 批量打印 (全班/每人一页)
                </button>
            </div>
        </div>
        <div class="table-container" id="multi-print-table-content" style="max-height: 400px;">
            ${currentStudentHtml.replace('<div class="print-page-wrapper" style="page-break-after: always; padding: 20px;">', '').replace(/<\/div>\s*$/, '')}
        </div>
    `;

    const printBtn = document.getElementById('multi-print-table-btn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            startMultiTablePrintJob(studentName, currentStudentHtml);
        });
    }

    const classmates = collectClassmates(visibleExams, studentClass);
    const batchPrintBtn = document.getElementById('multi-batch-print-btn');
    if (batchPrintBtn) {
        batchPrintBtn.addEventListener('click', () => handleBatchPrint(
            studentClass,
            classmates,
            subjects,
            visibleExams,
            generateSingleTableHTML
        ));
    }
}

function collectClassmates(visibleExams, className) {
    const classmatesMap = new Map();
    visibleExams.forEach(exam => {
        exam.students.forEach(student => {
            if (student.class === className && !classmatesMap.has(student.id)) {
                classmatesMap.set(student.id, { id: student.id, name: student.name, class: student.class });
            }
        });
    });
    return Array.from(classmatesMap.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function handleBatchPrint(currentClass, classmates, subjects, exams, generateSingleTableHTML) {
    if (!currentClass) {
        alert('无法识别当前学生的班级，无法进行批量打印。');
        return;
    }
    if (!confirm(`即将生成 "${currentClass}" 所有学生的成绩单。\n\n每位学生将占据一页，是否继续？`)) return;

    if (classmates.length === 0) {
        alert('未找到同班同学数据。');
        return;
    }

    let fullHtml = '';
    classmates.forEach(mate => {
        const rankData = { classRank: [], gradeRank: [] };
        const subjectData = {};
        const subjectRankData = {};
        subjects.forEach(subject => {
            subjectData[subject] = [];
            subjectRankData[subject] = { classRank: [], gradeRank: [] };
        });

        exams.forEach(exam => {
            const student = exam.students.find(s => String(s.id) === String(mate.id));
            if (student) {
                rankData.classRank.push(student.rank || null);
                rankData.gradeRank.push(student.gradeRank || null);
                subjects.forEach(subject => {
                    const score = student.scores[subject];
                    subjectData[subject].push((score !== null && score !== undefined) ? score : null);
                    let classRank = null;
                    let gradeRank = null;
                    if (typeof score === 'number' && !isNaN(score)) {
                        classRank = student.classRanks ? student.classRanks[subject] : null;
                        gradeRank = student.gradeRanks ? student.gradeRanks[subject] : null;
                    }
                    subjectRankData[subject].classRank.push(classRank);
                    subjectRankData[subject].gradeRank.push(gradeRank);
                });
            } else {
                rankData.classRank.push(null);
                rankData.gradeRank.push(null);
                subjects.forEach(subject => {
                    subjectData[subject].push(null);
                    subjectRankData[subject].classRank.push(null);
                    subjectRankData[subject].gradeRank.push(null);
                });
            }
        });

        fullHtml += generateSingleTableHTML(
            mate.name,
            mate.class,
            mate.id,
            rankData,
            subjectData,
            subjectRankData
        );
    });

    startMultiTablePrintJob(`${currentClass}-批量成绩单`, fullHtml);
}

function bindCollectionDrawer() {
    const drawer = document.getElementById('multi-collection-drawer');
    const toggleBtn = document.getElementById('multi-collection-toggle-btn');
    const closeBtn = document.getElementById('multi-collection-close-btn');
    const selectEl = document.getElementById('multi-collection-select');
    const btnNew = document.getElementById('btn-new-collection');
    const btnRename = document.getElementById('btn-rename-collection');
    const btnDelete = document.getElementById('btn-delete-collection');

    if (toggleBtn && drawer) {
        toggleBtn.onclick = () => drawer.classList.add('open');
    }
    if (closeBtn && drawer) {
        closeBtn.onclick = () => drawer.classList.remove('open');
    }
    if (selectEl) {
        selectEl.onchange = async () => {
            await setActiveCollection(selectEl.value);
            await renderCollectionSelect(selectEl);
            const data = await loadMultiExamData();
            renderMultiExamList(data);
            initializeStudentSearch(data);
            toggleReportVisibility(false);
            drawer?.classList.remove('open');
        };
    }
    if (btnNew) {
        btnNew.onclick = async () => {
            const name = prompt('请输入列表名称 (例如：高二下学期):');
            if (!name) return;
            await createCollection(name);
            await renderCollectionSelect(selectEl);
            renderMultiExamList([]);
            initializeStudentSearch([]);
            toggleReportVisibility(false);
        };
    }
    if (btnRename) {
        btnRename.onclick = async () => {
            const name = prompt('重命名列表:');
            if (!name) return;
            const ok = await renameActiveCollection(name);
            if (ok) {
                await renderCollectionSelect(selectEl);
            }
        };
    }
    if (btnDelete) {
        btnDelete.onclick = async () => {
            if (!confirm('确定要删除当前列表及其包含的所有考试数据吗？此操作不可恢复！')) return;
            try {
                await deleteActiveCollection();
                await renderCollectionSelect(selectEl);
                const data = await loadMultiExamData();
                renderMultiExamList(data);
                initializeStudentSearch(data);
                toggleReportVisibility(false);
            } catch (err) {
                alert(err.message);
            }
        };
    }
}

