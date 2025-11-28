/* eslint-disable no-undef */
'use strict';

import { State } from '../../config/state.js';

const echartsInstances = State.echartsInstances || (State.echartsInstances = {});

let G_ItemAnalysisData = State.itemAnalysisData || (typeof window !== 'undefined' ? window.G_ItemAnalysisData : null) || {};
let G_ItemAnalysisConfig = State.itemAnalysisConfig || (typeof window !== 'undefined' ? window.G_ItemAnalysisConfig : null) || {};
let G_ItemOutlierList = State.itemOutlierList || (typeof window !== 'undefined' ? window.G_ItemOutlierList : null) || [];
let G_ItemDetailSort = State.itemDetailSort || (typeof window !== 'undefined' ? window.G_ItemDetailSort : null) || { key: 'deviation', direction: 'asc' };

if (typeof window !== 'undefined') {
    window.G_ItemAnalysisData = G_ItemAnalysisData;
    window.G_ItemAnalysisConfig = G_ItemAnalysisConfig;
    window.G_ItemOutlierList = G_ItemOutlierList;
    window.G_ItemDetailSort = G_ItemDetailSort;
}

State.itemAnalysisData = G_ItemAnalysisData;
State.itemAnalysisConfig = G_ItemAnalysisConfig;
State.itemOutlierList = G_ItemOutlierList;
State.itemDetailSort = G_ItemDetailSort;

//    NEW    模块十三：学科小题分析
// =====================================================================

/**
 * 13.1. 渲染模块十三 (学科小题分析) 的主界面
 * *    修正版 15    - 2025-11-12
 * - (Feature)     “题目-学生 诊断散点图”的 HTML 框架和下拉框。
 * - (Refactor) 更  事件监听器以包含  图表。
 */
export function renderItemAnalysis(container) {
    if (container.dataset.initialized) {
        return;
    }
    container.dataset.initialized = 'true';

    // 1. 渲染基础HTML
    container.innerHTML = `
        <h2>模块十二：学科小题分析</h2>
        
        <p style="margin-top: -20px; margin-bottom: 20px; color: var(--text-muted);">
            请导入“小题分明细”Excel文件。系统将自动解析所有工作表(Sheet)，每个工作表代表一个科目。
        </p>

        <div class="main-card-wrapper" style="margin-bottom: 20px;">
            <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; flex-wrap: wrap;">
                <label for="item-analysis-uploader" class="upload-label" style="padding: 10px 16px; background-color: var(--primary-color); color: white;">
                    📊 导入小题分明细 Excel
                </label>
                <input type="file" id="item-analysis-uploader" accept=".xlsx, .xls, .csv" style="display: none;">
                
                <button id="item-analysis-config-btn" class="sidebar-button" style="background-color: var(--color-orange); margin-left: 15px; display: none;">
                    ⚙️ 配置题目
                </button>
                <span id="item-analysis-status" style="margin-left: 15px; color: var(--text-muted);"></span>
            </div>
            <div class="main-card-wrapper" style="margin-bottom: 20px; border-left: 5px solid #6f42c1; background-color: #fdfaff;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h4 style="margin:0; color:#6f42c1;">📂 小题分析数据归档库 (History)</h4>
                <div style="display:flex; gap:10px;">
                    <button id="item-lib-save-current-btn" class="sidebar-button" style="background-color:#28a745; font-size:0.85em;" disabled>
                        💾 保存当前数据
                    </button>
                     <button id="item-lib-clear-btn" class="sidebar-button" style="background-color:#dc3545; font-size:0.85em;">
                        🗑️ 清空库
                    </button>
                </div>
            </div>
            <p style="font-size:0.85em; color:#666; margin:5px 0 10px 0;">点击列表项可直接切换至该次考试分析。保存的数据包含题目配置和试卷文本。</p>
            
            <div id="item-analysis-library-list" class="multi-exam-list-container" style="max-height: 250px; overflow-y: auto; background:#fff;">
                <div style="padding:20px; text-align:center; color:#999;">加载中...</div>
            </div>
        </div>
        </div>

        

        <div id="item-analysis-results" style="display: none;">
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <div class="controls-bar" style="background: transparent; box-shadow: none; padding: 0; margin-bottom: 0; flex-wrap: wrap;">
                    
                    <label for="item-subject-select" style="margin-left: 0;">科目:</label>
                    <select id="item-subject-select" class="sidebar-select" style="width: auto; min-width: 150px; margin-right: 15px;"></select>
                    
                    <label for="item-class-filter">班级:</label>
                    <select id="item-class-filter" class="sidebar-select" style="width: auto; min-width: 150px; margin-right: 15px;">
                        <option value="ALL">-- 全体 --</option>
                    </select>

                    <label for="item-layer-groups">学生分层数:</label>
                    <select id="item-layer-groups" class="sidebar-select" style="width: auto;">
                        <option value="10">10层 (高-低)</option>
                        <option value="5">5层 (高-低)</option>
                    </select>
                </div>
            </div>

            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <div>
                        <h4 style="margin:0 0 10px 0;">📊 核心指标概览</h4>
                        <div id="item-kpi-grid" class="kpi-grid" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));"></div>
                    </div>
                    
                    <div style="border-left: 1px solid #eee; padding-left: 20px;">
                        <h4 style="margin:0 0 5px 0; text-align:center;">🧩 试卷难度结构</h4>
                        <div class="chart-container" id="item-difficulty-pie-chart" style="height: 220px;"></div>
                        <p style="text-align:center; font-size:0.8em; color:#999; margin:0;">(基于题目满分权重统计)</p>
                    </div>
                </div>
            </div>
            
            
            <h3 style="margin-top: 30px;">📊 各大题 (文字/字母) 分析</h3>
            
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <div class="controls-bar chart-controls" style="padding: 0; border: none; margin-bottom: 10px;">
                    <label for="item-major-metric-select">选择指标:</label>
                    <select id="item-major-metric-select" class="sidebar-select" style="width: auto;">
                        <option value="difficulty">难度 (得分率)</option>
                        <option value="discrimination">区分度</option>
                    </select>
                </div>
                <div class="chart-container" id="item-chart-major" style="height: 400px;"></div>
            </div>
            <h3 style="margin-top: 30px;">📉 各大题得分率分层对比 (趋势图)</h3>
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <p style="color: var(--text-muted); font-size: 0.9em; text-align:center; margin-top: 0;">
                    柱状图为全体得分率，折线图为各分层学生得分率 (G1为最高分层)。
                </p>
                <div class="chart-container" id="item-chart-layered-major" style="height: 450px;"></div>
            </div>

            <h3 style="margin-top: 30px;">🔬 各小题 (数字) 分析</h3>
            <div class="main-card-wrapper" style="gap: 20px; margin-bottom: 20px;">
                <div class="controls-bar chart-controls" style="padding: 0; border: none;">
                    <label for="item-minor-metric-select">选择指标:</label>
                    <select id="item-minor-metric-select" class="sidebar-select" style="width: auto;">
                        <option value="difficulty">难度 (得分率)</option>
                        <option value="discrimination">区分度</option>
                    </select>
                </div>
                <div class="chart-container" id="item-chart-minor" style="height: 400px;"></div>
            </div>

            <h3 style="margin-top: 30px;">📉 小题得分率分层对比</h3>
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 0;">
                    柱状图为全体学生得分率，折线图为按总分分层后各层学生的得分率 (G1为最高分层)。
                </p>
                <div class="chart-container" id="item-chart-layered" style="height: 500px;"></div>
            </div>

            <div class="main-card-wrapper" style="margin-bottom: 20px; border-left: 5px solid #17a2b8;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:15px;">
                    <div style="display:flex; flex-direction:column;">
                        <h3 style="margin:0;">👥 分层学生名单查询</h3>
                        <span style="font-size:0.8em; color:#666; margin-top:4px;">查看特定分数段（层级）内的学生分布</span>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:10px;">
                         <label style="font-weight:bold;">选择层级:</label>
                         <select id="item-layer-list-select" class="sidebar-select" style="width:auto; min-width:150px; font-weight:bold; color:#17a2b8;">
                             </select>
                         <button id="btn-export-layer-list" class="sidebar-button" style="background-color:var(--color-green); font-size:0.9em; padding:6px 12px;">
                            📥 导出该层名单
                         </button>
                    </div>
                </div>
                
                <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                    <table id="item-layer-table">
                        <thead>
                            <tr>
                                <th>层级名称</th>
                                <th>姓名</th>
                                <th>班级</th>
                                <th>总分</th>
                                <th>本题组得分 (如适用)</th>
                                <th>班排</th>
                                <th>年排</th>
                            </tr>
                        </thead>
                        <tbody id="item-layer-tbody">
                            </tbody>
                    </table>
                </div>
            </div>
            
            <h3 style="margin-top: 30px;">📈 知识点掌握情况 (分层对比)</h3>
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 0;">
                    对比不同分数层 (G1为最高分层) 在各个知识点上的得分率。
                </p>
                <div class="chart-container" id="item-chart-knowledge" style="height: 500px;"></div>
            </div>

            <h3 style="margin-top: 30px;">🎯 学生个体知识点诊断表</h3>
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                
                <div class="controls-bar chart-controls" style="padding: 0; border: none; flex-wrap: wrap; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        
                        <label for="item-outlier-type-filter">题目类型:</label>
                        <select id="item-outlier-type-filter" class="sidebar-select" style="width: auto;">
                            <option value="all">大题+小题</option>
                            <option value="minor">仅小题</option>
                            <option value="major">仅大题</option>
                        </select>
                        
                        <label for="item-outlier-sort" style="margin-left: 15px;">排序方式:</label>
                        <select id="item-outlier-sort" class="sidebar-select" style="width: auto;">
                            <option value="weakness">按“最短板”排序 (高分低能)</option>
                            <option value="strength">按“最亮点”排序 (低分高能)</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <label for="item-outlier-search">索引学生:</label>
                        <input type="text" id="item-outlier-search" placeholder="输入姓名或考号..." style="width: 150px;">
                    </div>
                    <button id="item-print-btn" class="sidebar-button" style="background-color: var(--color-blue); margin-left: auto;">
                        🖨️ 打印
                    </button>
                </div>

                <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 0;">
                    “偏差” = 学生知识点得分率 - 该层平均知识点得分率。 (点击学生查看题目详情)
                </p>
                <div class="table-container" id="item-outlier-table-container" style="max-height: 600px; overflow-y: auto;">
                </div>
                
                <div id="item-student-detail-container" style="display: none; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                </div>

            </div>

            <h3 style="margin-top: 30px;">🎯 题目-学生 诊断散点图</h3>
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <div class="controls-bar chart-controls" style="padding: 0; border: none; flex-wrap: wrap;">
                    <label for="item-scatter-question-select">选择题目:</label>
                    <select id="item-scatter-question-select" class="sidebar-select" style="width: auto; min-width: 150px;"></select>
                </div>
                <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 0;">
                    分析学生“总分”与“单题得分”的关系。左上象限 (高总分 - 低题分) 为“短板学生”，值得重点关注。
                </p>
                <div class="chart-container" id="item-chart-scatter-quadrant" style="height: 500px;"></div>
            </div>

            <h3 style="margin-top: 30px;">🕸️ 知识点归因图谱 (Remedial Path)</h3>
            <div class="main-card-wrapper" style="margin-bottom: 20px;">
                <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 0;">
                    <span style="display:inline-block; width:10px; height:10px; background:#dc3545; border-radius:50%;"></span> 红色节点：薄弱知识点 (<60%) &nbsp;&nbsp;
                    <span style="display:inline-block; width:10px; height:10px; background:#28a745; border-radius:50%;"></span> 绿色节点：掌握良好 (>85%) <br>
                    <strong>粗红线</strong> 表示“连锁崩塌”路径（前置知识点未掌握导致后继知识点崩塌）。
                </p>
                <div class="chart-container" id="item-chart-knowledge-graph" style="height: 600px;"></div>
            </div>

            </div>  <h3 style="margin-top: 40px; border-top: 2px dashed #ccc; padding-top: 20px;">⚖️ 跨考试难度加权对比 (Custom Difficulty Metric)</h3>
            <div class="main-card-wrapper" style="margin-bottom: 40px; border-left: 5px solid #d35400; background-color: #fff5e6;">
                <p style="color: #666; font-size: 0.9em;">
                    <strong>算法说明：</strong> 指标 = ∑ [ (1 - 预设难度) × 该题总得分 ] / 参考人数。<br>
                    请确保在“配置题目”中已填写难度系数（0.0~1.0，数值越小越难），否则默认难度为 0。
                </p>
                
                <div class="controls-bar" style="background: transparent; padding: 0; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <label style="font-weight:bold;">考试 A (基准):</label>
                        <select id="comp-exam-a" class="sidebar-select" style="width: 200px;"></select>
                    </div>
                    <div>
                        <label style="font-weight:bold;">考试 B (对比):</label>
                        <select id="comp-exam-b" class="sidebar-select" style="width: 200px;"></select>
                    </div>
                    <div>
                        <label style="font-weight:bold;">分析科目:</label>
                        <select id="comp-subject-select" class="sidebar-select" style="width: 120px;"></select>
                    </div>
                    <button id="btn-run-diff-compare" class="sidebar-button" style="background-color: #d35400;">📊 开始对比</button>
                </div>

                <div class="dashboard-chart-grid-2x2" style="margin-top: 20px;">
                    <div class="main-card-wrapper">
                        <h4 style="text-align:center; margin:0;">年段/班级 指标对比</h4>
                        <div class="chart-container" id="chart-diff-compare-bar" style="height: 400px;"></div>
                    </div>
                    <div class="main-card-wrapper">
                        <h4 style="text-align:center; margin:0;">指标差异 (考试 A - 考试 B)</h4>
                        <div class="chart-container" id="chart-diff-compare-diff" style="height: 400px;"></div>
                    </div>
                </div>
            </div>

        </div>
    `;

    // 2. 绑定 DOM 元素 (只绑定一次)
    const uploader = document.getElementById('item-analysis-uploader');
    const statusLabel = document.getElementById('item-analysis-status');
    const subjectSelect = document.getElementById('item-subject-select');
    const classFilter = document.getElementById('item-class-filter');
    const configBtn = document.getElementById('item-analysis-config-btn');
    const minorMetricSelect = document.getElementById('item-minor-metric-select');
    const majorMetricSelect = document.getElementById('item-major-metric-select');
    const layerGroupSelect = document.getElementById('item-layer-groups');
    const outlierTypeFilter = document.getElementById('item-outlier-type-filter');
    const outlierSortSelect = document.getElementById('item-outlier-sort');
    const outlierSearch = document.getElementById('item-outlier-search');
    const outlierTableContainer = document.getElementById('item-outlier-table-container');
    const detailTableContainer = document.getElementById('item-student-detail-container');
    const scatterQSelect = document.getElementById('item-scatter-question-select'); //    NEW   


    // 3. 辅助函数来填充UI (不变)
    const populateItemAnalysisUI = (itemData) => {
        const subjects = Object.keys(itemData);
        if (subjects.length === 0) {
            document.getElementById('item-analysis-results').style.display = 'none';
            configBtn.style.display = 'none';
            return;
        }

        document.getElementById('item-analysis-results').style.display = 'block';
        configBtn.style.display = 'inline-block';
        subjectSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');

        renderItemAnalysisCharts();
    };

    // [    ] 分层名单下拉框变更事件
    const layerListSelect = document.getElementById('item-layer-list-select');
    if (layerListSelect) {
        layerListSelect.addEventListener('change', () => {
            drawLayerStudentTable(); // 仅重绘表格
        });
    }

    // [    ] 导出按钮事件
    const exportLayerBtn = document.getElementById('btn-export-layer-list');
    if (exportLayerBtn) {
        exportLayerBtn.addEventListener('click', () => {
            const subject = document.getElementById('item-subject-select').value;
            const layerName = layerListSelect.options[layerListSelect.selectedIndex].text;
            exportLayerTableToExcel(subject, layerName);
        });
    }

    // 4. 绑定文件上传事件 (修复版：允许连续导入)
    uploader.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        statusLabel.innerText = `🔄 正在解析 ${file.name}...`;
        try {
            // [修复] 确保传递的是包含 _global_settings_ 的完整配置对象
            // 优先使用内存中的 G_ItemAnalysisConfig，如果为空则尝试从空对象开始
            let fullConfig = window.G_ItemAnalysisConfig || {};

            // [建议    ] 如果内存为空，尝试同步读取一下本地存储(虽然通常已加载，但为了保险)
            if (Object.keys(fullConfig).length === 0) {
                const stored = await localforage.getItem('G_ItemAnalysisConfig');
                if (stored) fullConfig = stored;
            }

            const itemData = await loadItemAnalysisExcel(file, fullConfig);

            G_ItemAnalysisData = itemData;
            State.itemAnalysisData = G_ItemAnalysisData;
            if (typeof window !== 'undefined') {
                window.G_ItemAnalysisData = G_ItemAnalysisData;
            }

            await localforage.setItem('G_ItemAnalysisData', itemData);
            await localforage.setItem('G_ItemAnalysisFileName', file.name);

            const subjects = Object.keys(itemData);
            if (subjects.length === 0) {
                throw new Error("在文件中未找到任何包含有效数据的工作表。");
            }
            statusLabel.innerText = `✅ 已加载: ${file.name} (共 ${subjects.length} 科)`;
            populateItemAnalysisUI(itemData);

            const saveBtn = document.getElementById('item-lib-save-current-btn');
            if (saveBtn) saveBtn.disabled = false;
        } catch (err) {
            console.error(err);
            statusLabel.innerText = `❌ 解析失败: ${err.message}`;
            alert(`解析失败: ${err.message}`);
        } finally {
            //    核心修复    无论成功或失败，都重置文件输入框的值，允许连续触发 change 事件
            event.target.value = '';
        }
    });
    // 5. 绑定下拉框切换事件 (主触发器) (不变)
    subjectSelect.addEventListener('change', () => {
        classFilter.value = 'ALL';
        layerGroupSelect.value = '10';
        minorMetricSelect.value = 'difficulty';
        majorMetricSelect.value = 'difficulty';
        outlierTypeFilter.value = 'all';
        outlierSortSelect.value = 'weakness';
        outlierSearch.value = '';
        // scatterQSelect 会在 renderItemAnalysisCharts 中被自动填充和重绘
        renderItemAnalysisCharts();
    });

    //    修正    班级筛选器 (主触发器)
    classFilter.addEventListener('change', () => {
        renderItemAnalysisCharts(); // 重绘所有 (KPIs 和  图表需要)
    });

    //    修正    (高效触发器)
    layerGroupSelect.addEventListener('change', () => {
        // 只重绘依赖分层的图表
        drawItemAnalysisLayeredChart();
        drawItemAnalysisLayeredMajorChart();
        drawItemAnalysisKnowledgeChart();
        drawItemAnalysisOutlierTable();
    });

    // 6. 绑定指标下拉框切换事件 (不变)
    minorMetricSelect.addEventListener('change', () => {
        drawItemAnalysisChart('minor');
    });
    majorMetricSelect.addEventListener('change', () => {
        drawItemAnalysisChart('major');
    });

    // 7. 绑定诊断表 (不变)
    outlierTypeFilter.addEventListener('change', () => {
        drawItemAnalysisOutlierTable();
    });
    outlierSortSelect.addEventListener('change', () => {
        drawItemAnalysisOutlierTable();
    });
    outlierSearch.addEventListener('input', () => {
        drawItemAnalysisOutlierTable();
    });

    // 8. 绑定诊断表 *点击* 事件 (不变)
    outlierTableContainer.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;

        G_ItemDetailSort = { key: 'deviation', direction: 'asc' };
        State.itemDetailSort = G_ItemDetailSort;
        if (typeof window !== 'undefined') {
            window.G_ItemDetailSort = G_ItemDetailSort;
        }
        const studentId = row.dataset.id;
        const studentName = row.dataset.name;
        const studentLayer = row.dataset.layer;
        const questionType = document.getElementById('item-outlier-type-filter').value;

        outlierTableContainer.querySelectorAll('tr.active').forEach(tr => tr.classList.remove('active'));
        row.classList.add('active');

        drawItemStudentDetailTable(studentId, studentName, studentLayer, questionType);
    });

    // 9. 绑定 *详情表* 表头点击事件 (不变)
    detailTableContainer.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort-key]');
        if (!th) return;

        const newKey = th.dataset.sortKey;
        const { key, direction } = G_ItemDetailSort;
        if (newKey === key) {
            G_ItemDetailSort.direction = (direction === 'asc') ? 'desc' : 'asc';
        } else {
            G_ItemDetailSort.key = newKey;
            G_ItemDetailSort.direction = (newKey === 'deviation' || newKey === 'studentScore') ? 'asc' : 'asc';
        }

        const activeRow = outlierTableContainer.querySelector('tr.active');
        if (!activeRow) return;

        const studentId = activeRow.dataset.id;
        const studentName = activeRow.dataset.name;
        const studentLayer = activeRow.dataset.layer;
        const questionType = document.getElementById('item-outlier-type-filter').value;

        drawItemStudentDetailTable(studentId, studentName, studentLayer, questionType);
    });

    // 10.    NEW (Feature)    绑定  散点图的下拉框
    scatterQSelect.addEventListener('change', () => {
        drawItemScatterQuadrantChart();
    });

    const itemPrintBtn = document.getElementById('item-print-btn');
    if (itemPrintBtn) {
        //    核心    按钮点击时，调用  的多功能打印函数
        itemPrintBtn.addEventListener('click', startItemDetailPrintJob);
    }

    // 11. 绑定配置按钮和模态框事件
    configBtn.addEventListener('click', populateItemAnalysisConfigModal);
    document.getElementById('item-config-modal-close-btn').addEventListener('click', () => {
        document.getElementById('item-analysis-config-modal').style.display = 'none';
    });
    document.getElementById('item-config-modal-save-btn').addEventListener('click', () => {
        saveItemAnalysisConfigFromModal();
        renderItemAnalysisCharts(); //    保存配置后重绘所有
    });

    (async () => {
        try {
            const statusLabel = document.getElementById('item-analysis-status');

            // 并行获取配置和数据
            const [storedConfig, storedData, storedFileName] = await Promise.all([
                localforage.getItem('G_ItemAnalysisConfig'),
                localforage.getItem('G_ItemAnalysisData'),
                localforage.getItem('G_ItemAnalysisFileName')
            ]);

            if (storedConfig) {
                G_ItemAnalysisConfig = storedConfig;
                State.itemAnalysisConfig = G_ItemAnalysisConfig;
                if (typeof window !== 'undefined') {
                    window.G_ItemAnalysisConfig = G_ItemAnalysisConfig;
                }
            }

            if (storedData) {
                G_ItemAnalysisData = storedData;
                State.itemAnalysisData = G_ItemAnalysisData;
                if (typeof window !== 'undefined') {
                    window.G_ItemAnalysisData = G_ItemAnalysisData;
                }

                //    如果有文件名，就显示文件名；否则显示默认提示
                if (storedFileName) {
                    statusLabel.innerText = `✅ 已加载: ${storedFileName}`;
                } else {
                    statusLabel.innerText = "✅ 已从数据库加载数据。";
                }

                populateItemAnalysisUI(G_ItemAnalysisData);

                // =================================================
                //    核心修复    自动加载成功后，必须激活“保存”按钮
                // =================================================
                const saveBtn = document.getElementById('item-lib-save-current-btn');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.style.opacity = "1"; // 确保样式也恢复
                    saveBtn.style.cursor = "pointer";
                }
                // =================================================

            } else {
                statusLabel.innerText = "请导入小题分明细 Excel。";
            }
        } catch (e) {
            console.error("加载小题分缓存失败:", e);
            const statusLabel = document.getElementById('item-analysis-status');
            if (statusLabel) statusLabel.innerText = "缓存加载失败，请重  导入。";

            // 出错时清理可能损坏的数据
            localforage.removeItem('G_ItemAnalysisData');
            localforage.removeItem('G_ItemAnalysisConfig');
        }
    })();
    // ============================================================
    // [修复] 小题分析归档库：事件绑定与渲染逻辑
    // ============================================================
    const libListContainer = document.getElementById('item-analysis-library-list');
    const libSaveBtn = document.getElementById('item-lib-save-current-btn');
    const libClearBtn = document.getElementById('item-lib-clear-btn');

    // 1. 渲染存档列表函数
    const renderLibraryList = async () => {

        const library = await localforage.getItem('G_ItemAnalysis_Library') || [];
        refreshLibraryUI(library);

        if (library.length === 0) {
            libListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">暂无存档数据</div>`;
            return;
        }

        libListContainer.innerHTML = library.map((item, index) => `
            <div class="multi-exam-item" style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <div onclick="window.loadItemFromLibrary('${item.id}')" style="flex-grow:1; cursor:pointer;">
                    <div style="font-weight:bold; color:#333;">${index + 1}. ${item.name}</div>
                    <div style="font-size:0.8em; color:#999;">📅 ${item.date} | 📚 ${item.subjects.length} 个科目</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="window.renameItemFromLibrary('${item.id}')" class="sidebar-button" 
                        style="background-color:#17a2b8; padding:2px 8px; font-size:0.8em; border:none;">
                        重命名
                    </button>
                    
                    <button onclick="window.deleteItemFromLibrary('${item.id}')" class="sidebar-button" 
                        style="background-color:#fff; color:#dc3545; border:1px solid #dc3545; padding:2px 8px; font-size:0.8em;">
                        删除
                    </button>
                </div>
            </div>
        `).join('');
    };

    // 2. 绑定“保存当前数据”点击事件
    if (libSaveBtn) {
        //    优化    直接绑定即可，不需要 cloneNode，因为 initialized 标记保证了只会执行一次
        libSaveBtn.onclick = async () => { // 使用 onclick 覆盖之前的事件，防止重复
            // 检查是否有数据
            if (!G_ItemAnalysisData || Object.keys(G_ItemAnalysisData).length === 0) {
                alert("当前没有可保存的数据！请先导入 Excel。");
                return;
            }

            // 获取文件名作为默认标题
            let defaultName = "我的小题分析";
            const storedFileName = await localforage.getItem('G_ItemAnalysisFileName');
            if (storedFileName) defaultName = storedFileName.replace(/\.xlsx|\.xls|\.csv/g, '');

            const name = prompt("请为该存档命名:", defaultName);
            if (!name) return;

            // 构建存档对象
            const record = {
                id: Date.now().toString(),
                name: name,
                date: new Date().toLocaleString(),
                data: G_ItemAnalysisData,
                config: G_ItemAnalysisConfig,
                fileName: storedFileName || name,
                subjects: Object.keys(G_ItemAnalysisData)
            };

            // 保存到 IndexedDB
            let library = await localforage.getItem('G_ItemAnalysis_Library');
            if (!Array.isArray(library)) library = []; // 确保是数组

            library.unshift(record);
            await localforage.setItem('G_ItemAnalysis_Library', library);

            alert("✅ 保存成功！您可以在下方列表中随时切换回此数据。");
            renderLibraryList(); // 刷  列表
        };
    }

    // 3. 绑定“清空库”点击事件
    if (libClearBtn) {
        // 同样做一次克隆替换，防止重复绑定
        const newClearBtn = libClearBtn.cloneNode(true);
        libClearBtn.parentNode.replaceChild(newClearBtn, libClearBtn);

        newClearBtn.addEventListener('click', async () => {
            if (confirm("⚠️ 确定要清空所有小题分析的存档吗？\n此操作不可恢复！")) {
                await localforage.removeItem('G_ItemAnalysis_Library');
                renderLibraryList();
            }
        });
    }

    // 4. 初始化时渲染列表
    renderLibraryList();
}


/**
 * [新增] 13.22. 绘制“各大题”得分率分层对比图
 * 逻辑与小题分层图类似，但针对 Major Questions
 */
function drawItemAnalysisLayeredMajorChart() {
    const chartDom = document.getElementById('item-chart-layered-major');
    if (!chartDom) return;

    if (echartsInstances['item-chart-layered-major']) {
        echartsInstances['item-chart-layered-major'].dispose();
    }
    echartsInstances['item-chart-layered-major'] = echarts.init(chartDom);

    // 1. 获取参数
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const numGroups = parseInt(document.getElementById('item-layer-groups').value);

    // 2. 获取数据源
    const rawData = G_ItemAnalysisData[subjectName];
    if (!rawData || !rawData.majorQuestions || rawData.majorQuestions.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">本科目无“大题”数据。</p>`;
        return;
    }

    const allStudents = rawData.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. 获取大题列表 (X轴)
    const qNames = rawData.majorQuestions; // 例如 ["作文", "听力", "翻译"]

    // 4. 计算分层数据
    // 复用 calculateLayeredItemStats 函数，它已经计算了 groupStats (包含了大题数据)
    const { groupStats } = calculateLayeredItemStats(subjectName, numGroups, filteredStudents);

    // 5. 获取全体平均得分率 (用于柱状图背景)
    const recalculatedStats = getRecalculatedItemStats(subjectName);
    const overallDifficulty = qNames.map(qName => {
        return recalculatedStats.majorStats[qName]?.difficulty || 0;
    });

    // 6. 准备 Series
    const series = [];
    const legendData = [];

    // (背景柱状图：全体平均)
    series.push({
        name: '全体得分率',
        type: 'bar',
        data: overallDifficulty,
        barWidth: '50%',
        itemStyle: { opacity: 0.3, color: '#909399' },
        barGap: '-100%', // 让柱子作为背景
        z: 1,
        animation: false
    });
    legendData.push('全体得分率');

    // (折线图：各层级)
    const lineColors = [
        '#007bff', '#28a745', '#17a2b8', '#ffc107', '#fd7e14',
        '#6f42c1', '#dc3545', '#e83e8c', '#6c757d', '#343a40'
    ];

    Object.keys(groupStats).sort().forEach((groupName, index) => {
        legendData.push(groupName);
        series.push({
            name: groupName,
            type: 'line',
            smooth: 0.3, // 平滑曲线
            symbol: 'circle',
            symbolSize: 6,
            // 从 groupStats 中提取对应大题的数据
            data: qNames.map(qName => groupStats[groupName][qName] || 0),
            color: lineColors[index % lineColors.length],
            z: 10
        });
    });

    // 7. ECharts 配置
    const option = {
        tooltip: { 
            trigger: 'axis', 
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                let html = `<strong>${params[0].name}</strong><br/>`;
                params.forEach(p => {
                    const val = (p.value * 100).toFixed(1) + '%';
                    html += `${p.marker} ${p.seriesName}: <strong>${val}</strong><br/>`;
                });
                return html;
            }
        },
        legend: { data: legendData, top: 0, type: 'scroll' },
        grid: { left: '3%', right: '4%', bottom: '10%', top: 40, containLabel: true },
        xAxis: {
            type: 'category',
            data: qNames,
            axisLabel: { 
                interval: 0, 
                rotate: qNames.length > 5 ? 30 : 0 // 如果题目多则倾斜
            }
        },
        yAxis: { 
            type: 'value', 
            name: '得分率', 
            min: 0, 
            max: 1,
            axisLabel: { formatter: (value) => (value * 100).toFixed(0) + '%' }
        },
        series: series
    };

    echartsInstances['item-chart-layered-major'].setOption(option, { notMerge: true });
}

// ==========================================
// [    ] 全局函数：小题库的加载与删除
// ==========================================

// 加载存档
window.loadItemFromLibrary = async (id) => {
    const library = await localforage.getItem('G_ItemAnalysis_Library') || [];
    const record = library.find(r => r.id === id);

    if (!record) { alert("未找到该记录，可能已被删除。"); return; }
    if (!confirm(`确定要加载存档：\n【${record.name}】吗？\n\n注意：当前未保存的分析界面将被覆盖。`)) return;

    // 1. 恢复全局变量
    G_ItemAnalysisData = record.data;
    if (typeof window !== 'undefined') {
        window.G_ItemAnalysisData = G_ItemAnalysisData;
    }
    State.itemAnalysisData = G_ItemAnalysisData;
    G_ItemAnalysisConfig = record.config || {};
    State.itemAnalysisConfig = G_ItemAnalysisConfig;
    if (typeof window !== 'undefined') {
        window.G_ItemAnalysisConfig = G_ItemAnalysisConfig;
    }

    // 2. 更  当前环境缓存 (保证刷  页面后还在)
    await localforage.setItem('G_ItemAnalysisData', G_ItemAnalysisData);
    await localforage.setItem('G_ItemAnalysisConfig', G_ItemAnalysisConfig);
    await localforage.setItem('G_ItemAnalysisFileName', record.fileName);

    // 3. 刷   UI
    // 这里我们模拟一次“重  选择模式”来触发刷  ，或者手动调用填充逻辑
    const subjectSelect = document.getElementById('item-subject-select');
    const statusLabel = document.getElementById('item-analysis-status');
    const saveBtn = document.getElementById('item-lib-save-current-btn');
    const configBtn = document.getElementById('item-analysis-config-btn');

    if (subjectSelect) {
        const subjects = Object.keys(G_ItemAnalysisData);
        // 填充科目下拉框
        subjectSelect.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');

        // 显示相关按钮
        document.getElementById('item-analysis-results').style.display = 'block';
        if (configBtn) configBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.disabled = false;
        if (statusLabel) statusLabel.innerText = `📂 已加载存档: ${record.name}`;

        // 触发重绘 (模拟用户切换了科目)
        renderItemAnalysisCharts();
    }
};

// ==========================================
// [    ] 全局函数：重命名存档
// ==========================================
window.renameItemFromLibrary = async (id) => {
    let library = await localforage.getItem('G_ItemAnalysis_Library') || [];
    const item = library.find(r => r.id === id);

    if (!item) return;

    // 弹出输入框
    const newName = prompt("请输入  的存档名称:", item.name);

    // 如果用户点击取消或输入为空，则不处理
    if (newName === null || newName.trim() === "") return;

    // 更  名称
    item.name = newName.trim();

    // 保存回数据库
    await localforage.setItem('G_ItemAnalysis_Library', library);

    // 刷   UI (复用下方的渲染逻辑)
    refreshLibraryUI(library);
};

// ==========================================
// [修改] 全局函数：删除存档 (更  渲染逻辑以包含重命名按钮)
// ==========================================
window.deleteItemFromLibrary = async (id) => {
    // event.stopPropagation() 不需要，因为按钮不在 onclick div 内部，而是兄弟节点
    if (!confirm("确定删除这条存档吗？此操作不可恢复。")) return;

    let library = await localforage.getItem('G_ItemAnalysis_Library') || [];
    library = library.filter(r => r.id !== id);
    await localforage.setItem('G_ItemAnalysis_Library', library);

    // 刷   UI
    refreshLibraryUI(library);
};


// [辅助函数] 用于全局刷  列表 UI (已更  ：添加“切换”按钮)
function refreshLibraryUI(library) {
    const container = document.getElementById('item-analysis-library-list');
    if (container) {
        if (library.length === 0) {
            container.innerHTML = `<div style="padding:20px; text-align:center; color:#999;">暂无存档数据</div>`;
        } else {
            container.innerHTML = library.map((item, index) => `
                <div class="multi-exam-item" style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    
                    <div onclick="window.loadItemFromLibrary('${item.id}')" style="flex-grow:1; cursor:pointer; padding-right: 10px;">
                        <div style="font-weight:bold; color:#333;">${index + 1}. ${item.name}</div>
                        <div style="font-size:0.8em; color:#999;">📅 ${item.date} | 📚 ${item.subjects.length} 个科目</div>
                    </div>

                    <div style="display:flex; gap:5px;">
                        
                        <button onclick="window.loadItemFromLibrary('${item.id}')" class="sidebar-button" 
                            style="background-color:#28a745; padding:2px 8px; font-size:0.8em; border:none;" title="加载此存档">
                            📂 切换
                        </button>

                        <button onclick="window.renameItemFromLibrary('${item.id}')" class="sidebar-button" 
                            style="background-color:#17a2b8; padding:2px 8px; font-size:0.8em; border:none;">
                            重命名
                        </button>
                        
                        <button onclick="window.deleteItemFromLibrary('${item.id}')" class="sidebar-button" 
                            style="background-color:#fff; color:#dc3545; border:1px solid #dc3545; padding:2px 8px; font-size:0.8em;">
                            删除
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
}

/**
 * 13.2. [核心] 解析小题分 Excel 文件
 *    最终完整版    支持动态跳过末尾统计行，并接收配置上下文。
 */
function loadItemAnalysisExcel(file, globalConfig = {}) { // [关键修改] 接收配置对象
    return new Promise((resolve, reject) => {

        //    内部辅助函数    (不变)
        const _calculateQuestionStats = (qNames, scoreType, processedData) => {
            const stats = {};
            for (const qName of qNames) {
                const qScores = [];
                const tScores = [];
                processedData.forEach(s => {
                    const qScore = s[scoreType][qName];
                    const tScore = s.totalScore;
                    if (typeof qScore === 'number' && !isNaN(qScore) && typeof tScore === 'number' && !isNaN(tScore)) {
                        qScores.push(qScore);
                        tScores.push(tScore);
                    }
                });
                if (qScores.length === 0) continue;
                const qAvg = qScores.reduce((a, b) => a + b, 0) / qScores.length;
                const maxQScore = Math.max(...qScores);
                const qDifficulty = (maxQScore > 0) ? (qAvg / maxQScore) : 0;
                // 假设 calculateCorrelation 已在全局定义
                const qDiscrimination = calculateCorrelation(qScores, tScores);
                stats[qName] = {
                    avg: parseFloat(qAvg.toFixed(2)),
                    maxScore: maxQScore,
                    difficulty: parseFloat(qDifficulty.toFixed(2)),
                    discrimination: parseFloat(qDiscrimination.toFixed(3))
                };
            }
            return stats;
        };

        // --- FileReader 开始 ---
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const allResults = {};

                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                    if (rawData.length < 5) {
                        console.warn(`工作表 "${sheetName}" 数据行数不足，已跳过。`);
                        continue;
                    }

                    // 1. 定位表头行
                    let keyRowIndex = -1;
                    const REQUIRED_METRICS = ["姓名", "班级", "总分"];
                    for (let i = 0; i < Math.min(rawData.length, 5); i++) {
                        const row = rawData[i].map(String).map(s => s.trim());
                        const foundCount = REQUIRED_METRICS.filter(metric => row.includes(metric)).length;
                        if (foundCount === REQUIRED_METRICS.length) {
                            keyRowIndex = i;
                            break;
                        }
                    }
                    if (keyRowIndex === -1) {
                        console.warn(`工作表 "${sheetName}" 缺少关键字段 (${REQUIRED_METRICS.join(',')}), 已跳过。`);
                        continue;
                    }

                    const keyHeader = rawData[keyRowIndex].map(String).map(s => s.trim());
                    const studentDataStartRow = keyRowIndex + 1;
                    const colMap = {};
                    const majorQuestionColumns = [];
                    const minorQuestionColumns = [];
                    const isMinorQuestion = /^\d/;
                    let foundTotalScore = false;

                    // 2. 映射列
                    for (let i = 0; i < keyHeader.length; i++) {
                        const key = keyHeader[i];
                        if (key === "") continue;
                        if (key === "考号") { colMap[i] = "id"; continue; }
                        if (key === "姓名") { colMap[i] = "name"; continue; }
                        if (key === "班级") { colMap[i] = "class"; continue; }
                        if (key === "总分") {
                            colMap[i] = "totalScore";
                            foundTotalScore = true;
                            continue;
                        }
                        const knownInfoCols = ["学校", "班级排名", "年级排名", "准考证号", "学生属性", "班次", "校次", "客观题", "主观题", "教师", "阅卷班级", "校次进退步", "班次进退步"];

                        if (foundTotalScore && !knownInfoCols.includes(key)) {
                            const qName = String(key);
                            if (isMinorQuestion.test(qName)) {
                                colMap[i] = "q_minor_" + qName;
                                minorQuestionColumns.push(qName);
                            } else {
                                colMap[i] = "q_major_" + qName;
                                majorQuestionColumns.push(qName);
                            }
                        }
                    }


                    // 3. 动态确定要跳过的行数 (健壮版)
                    const skipSetting = globalConfig._global_settings_ || {};

                    // 如果设置了值且不是NaN，则使用该值；否则使用默认值 3
                    const rowsToSkipCount = skipSetting.rowsToSkip !== undefined && !isNaN(parseInt(skipSetting.rowsToSkip)) ?
                        parseInt(skipSetting.rowsToSkip) :
                        3;

                    // 如果 rowsToSkipCount > 0, 则 slice(start, -skipCount); 否则 slice(start, end)
                    const skipSliceEnd = rowsToSkipCount > 0 ? -rowsToSkipCount : rawData.length;

                    // 4. 解析学生数据行 (使用修正后的 slice 终点)
                    const studentRows = rawData.slice(studentDataStartRow, skipSliceEnd);
                    const processedData = [];


                    for (const row of studentRows) {
                        const student = { minorScores: {}, majorScores: {} };
                        let hasName = false;
                        for (const colIndex in colMap) {
                            const key = colMap[colIndex];
                            const rawValue = row[colIndex];
                            if (key.startsWith("q_minor_")) {
                                const qName = key.substring(8);
                                const score = parseFloat(rawValue);
                                student.minorScores[qName] = isNaN(score) ? null : score;
                            } else if (key.startsWith("q_major_")) {
                                const qName = key.substring(8);
                                const score = parseFloat(rawValue);
                                student.majorScores[qName] = isNaN(score) ? null : score;
                            } else if (key === "totalScore") {
                                const score = parseFloat(rawValue);
                                student.totalScore = isNaN(score) ? null : score;
                            } else {
                                const value = String(rawValue || "").trim();
                                student[key] = value;
                                if (key === 'name' && value) hasName = true;
                            }
                        }
                        if (!student.id && student.name) student.id = student.name;

                        // 确保学生有姓名 和 有效的总分
                        if (student.id && hasName && student.totalScore !== null) {
                            processedData.push(student);
                        }
                    }

                    if (processedData.length === 0) {
                        console.warn(`工作表 "${sheetName}" 解析完成，但未找到有效学生数据。`);
                        continue;
                    }

                    // 5. 计算统计数据
                    const minorQuestionStats = _calculateQuestionStats(minorQuestionColumns, 'minorScores', processedData);
                    const majorQuestionStats = _calculateQuestionStats(majorQuestionColumns, 'majorScores', processedData);

                    allResults[sheetName] = {
                        students: processedData,
                        minorQuestions: minorQuestionColumns,
                        majorQuestions: majorQuestionColumns,
                        minorStats: minorQuestionStats,
                        majorStats: majorQuestionStats
                    };
                }
                resolve(allResults);
            } catch (err) {
                console.error(err);
                reject(new Error("文件解析失败: ".concat(err.message || "未知错误。")));
            }
        };
        reader.onerror = (err) => reject(new Error("文件读取失败: ".concat(err)));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 13.3. 渲染小题分析图表
 * *    修正版 15    - 2025-11-12
 * - (Feature) 填充 "题目-学生 诊断散点图" 的下拉框。
 * - (Feature) 调用 drawItemScatterQuadrantChart()。
 * - (Bug 修复) 修复了 subjectName is not defined 的 Bug。
 */
function renderItemAnalysisCharts() {
    const selectedSubject = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;

    const detailContainer = document.getElementById('item-student-detail-container');
    if (detailContainer) detailContainer.style.display = 'none';
    G_ItemDetailSort = { key: 'deviation', direction: 'asc' };
    State.itemDetailSort = G_ItemDetailSort;
    if (typeof window !== 'undefined') {
        window.G_ItemDetailSort = G_ItemDetailSort;
    }

    if (!G_ItemAnalysisData || !G_ItemAnalysisData[selectedSubject]) {
        // ... (错误处理) ...
        document.getElementById('item-chart-minor').innerHTML = "";
        document.getElementById('item-chart-major').innerHTML = "";
        document.getElementById('item-chart-layered').innerHTML = "";
        document.getElementById('item-chart-knowledge').innerHTML = "";
        document.getElementById('item-outlier-table-container').innerHTML = "";
        document.getElementById('item-kpi-grid').innerHTML = "";
        document.getElementById('item-chart-scatter-quadrant').innerHTML = ""; //    NEW   
        return;
    }
    const data = G_ItemAnalysisData[selectedSubject];
    const allStudents = data.students || [];

    // 1. 填充班级筛选器
    populateItemClassFilter(allStudents);

    // 2. 获取筛选后的学生
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. (不变) 计算和渲染KPIs
    const kpiContainer = document.getElementById('item-kpi-grid');
    const validStudents = filteredStudents.filter(s => typeof s.totalScore === 'number' && !isNaN(s.totalScore));
    const studentScores = validStudents.map(s => s.totalScore);

    let avgTotal = 0;
    let maxTotal = 0;
    let minTotal = 0;
    let stdDev = 0;
    if (studentScores.length > 0) {
        avgTotal = studentScores.reduce((a, b) => a + b, 0) / studentScores.length;
        maxTotal = Math.max(...studentScores);
        minTotal = Math.min(...studentScores);

        if (studentScores.length > 1) {
            const variance = studentScores.reduce((acc, score) => acc + Math.pow(score - avgTotal, 2), 0) / studentScores.length;
            stdDev = Math.sqrt(variance);
        }
    }

    const recalculatedStats = getRecalculatedItemStats(selectedSubject); //    修正 Bug   
    let fullScore = 0;
    let totalDiscrimination = 0;
    let questionCount = 0;

    // (计算小题满分)
    if (recalculatedStats.minorStats) {
        for (const qName in recalculatedStats.minorStats) {
            const stat = recalculatedStats.minorStats[qName];
            const qFull = stat.manualFullScore || stat.maxScore;
            if (qFull > 0) {
                fullScore += qFull;
            }
        }
    }

    // (计算平均区分度)
    const processDiscrimination = (statsObj) => {
        if (!statsObj) return;
        for (const qName in statsObj) {
            const stat = statsObj[qName];
            if (typeof stat.discrimination === 'number' && !isNaN(stat.discrimination)) {
                totalDiscrimination += stat.discrimination;
                questionCount++;
            }
        }
    };
    processDiscrimination(recalculatedStats.minorStats);
    processDiscrimination(recalculatedStats.majorStats);

    fullScore = parseFloat(fullScore.toFixed(1));
    const testDifficulty = (fullScore > 0) ? (avgTotal / fullScore) : 0;
    const avgDiscrimination = (questionCount > 0) ? (totalDiscrimination / questionCount) : 0;

    kpiContainer.innerHTML = `
        <div class="kpi-card"><h3>科目</h3><div class="value">${selectedSubject}</div></div>
        <div class="kpi-card"><h3>参考学生数</h3><div class="value">${validStudents.length}</div></div>
        <div class="kpi-card"><h3>平均分</h3><div class="value">${avgTotal.toFixed(2)}</div></div>
        <div class="kpi-card"><h3>最高分</h3><div class="value">${maxTotal}</div></div>
        <div class="kpi-card"><h3>最低分</h3><div class="value">${minTotal}</div></div>
        <div class="kpi-card"><h3>试卷满分 (小题和)</h3><div class="value">${fullScore}</div></div>
        <div class="kpi-card"><h3>整卷难度</h3><div class="value">${testDifficulty.toFixed(2)}</div></div>
        <div class="kpi-card"><h3>标准差</h3><div class="value">${stdDev.toFixed(2)}</div></div>
        <div class="kpi-card"><h3>平均区分度</h3><div class="value">${avgDiscrimination.toFixed(3)}</div></div>
        <div class="kpi-card"><h3>大题数量</h3><div class="value">${(data.majorQuestions || []).length}</div></div>
        <div class="kpi-card"><h3>小题数量</h3><div class="value">${(data.minorQuestions || []).length}</div></div>
    `;

    // 4.    NEW (Feature)    填充散点图的题目下拉框
    const scatterQSelect = document.getElementById('item-scatter-question-select');
    const qNamesMajor = data.majorQuestions || [];
    const qNamesMinor = data.minorQuestions || [];
    const allQNames = [...qNamesMajor, ...qNamesMinor]; // (大题在前)

    scatterQSelect.innerHTML = allQNames.map(qName => `<option value="${qName}">${qName}</option>`).join('');


    // 5. 延迟执行绘图 (不变)
    setTimeout(() => {
        drawItemAnalysisChart('major');
        drawItemAnalysisChart('minor');
        drawItemAnalysisLayeredChart();
        drawItemAnalysisLayeredMajorChart();
        drawItemAnalysisKnowledgeChart();
        drawItemAnalysisOutlierTable();
        drawItemScatterQuadrantChart(); //    NEW   
        drawItemKnowledgeGraph();
        drawLayerStudentTable();

        drawItemDifficultyPie();

        if (typeof initDiffCompareUI === 'function') {
            initDiffCompareUI();
        }
    }, 0);
}

/**
 * [修正版] 13.22. 绘制试卷难度结构饼图
 * 修复：只统计小题 (Minor)，防止叠加“客观题总分”等大题导致分值溢出
 */
function drawItemDifficultyPie() {
    const elementId = 'item-difficulty-pie-chart';
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    if (echartsInstances[elementId]) echartsInstances[elementId].dispose();
    const myChart = echarts.init(chartDom);
    echartsInstances[elementId] = myChart;

    const subjectName = document.getElementById('item-subject-select').value;
    const recalculatedStats = getRecalculatedItemStats(subjectName);

    // 1. 统计各难度分值
    let scores = { easy: 0, medium: 0, hard: 0 };
    let totalFullScore = 0;

    const processStats = (statsObj) => {
        if (!statsObj) return;
        for (const qName in statsObj) {
            const stat = statsObj[qName];
            // 优先使用手动配置的满分，或者是自动识别的最大分
            const full = stat.manualFullScore || stat.maxScore || 0;
            
            // 使用修正后的难度 (P值: 数值越小越难)
            // 注意：这里我们统计的是“难度分布”，通常按得分率(difficulty)来划分
            // >= 0.75 容易
            // 0.45 - 0.75 中档
            // < 0.45 困难
            const diff = stat.difficulty; 

            if (full > 0) {
                totalFullScore += full;
                if (diff >= 0.75) scores.easy += full;      // 容易 (得分率高)
                else if (diff >= 0.45) scores.medium += full; // 中档
                else scores.hard += full;                   // 困难 (得分率低)
            }
        }
    };

    // ✅ 核心修复：只计算“小题”(Minor)，不计算“大题”(Major)
    // 因为大题通常是小题的汇总（如“选择题总分”），一起算会导致总分翻倍。
    processStats(recalculatedStats.minorStats);
    
    // ❌ [已删除] processStats(recalculatedStats.majorStats); 
    // 如果你的 Excel 里某些题没有小题号（比如只有“作文”没有题号），
    // 可以在配置里把它改成小题，或者在这里加个判断逻辑。
    // 但对于标准阅卷数据，只算 Minor 是最准确的。

    // 2. 准备数据
    const data = [
        { value: parseFloat(scores.easy.toFixed(1)), name: '容易 (≥0.75)', itemStyle: { color: '#28a745' } },
        { value: parseFloat(scores.medium.toFixed(1)), name: '中档 (0.45-0.75)', itemStyle: { color: '#007bff' } },
        { value: parseFloat(scores.hard.toFixed(1)), name: '困难 (<0.45)', itemStyle: { color: '#dc3545' } }
    ];

    // 3. 渲染
    const option = {
        title: {
            text: `总分: ${totalFullScore.toFixed(0)}分`, // 在标题里显示一下总分，方便核对
            left: 'center',
            top: 'center',
            textStyle: { fontSize: 14, color: '#666' }
        },
        tooltip: {
            trigger: 'item',
            formatter: (p) => {
                return `<strong>${p.name}</strong><br/>分值: ${p.value}分<br/>占比: ${p.percent}%`;
            }
        },
        legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle:{fontSize:10} },
        series: [
            {
                name: '难度分布',
                type: 'pie',
                radius: ['40%', '65%'],
                center: ['50%', '45%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold',
                        formatter: '{b}\n{c}分 ({d}%)'
                    }
                },
                data: data
            }
        ]
    };

    myChart.setOption(option);
}


/**
 * 13.4. (ECharts) 渲染小题分析条形图 (带缩放)
 * *    修正版 3    - (此函数保持不变)
 * - (Bug 1)   加了对 qNames 的空值检查。
 * - (Bug 1) 修正了当 qNames.length 为 0 时，end 属性计算为 Infinity 的问题。
 */
function renderItemAnalysisBarChart(elementId, title, qNames, data, yAxisRange) {
    const chartDom = document.getElementById(elementId);
    if (!chartDom) return;

    //    修正    (Bug 1)
    if (!qNames || qNames.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">本科目无此类题目数据。</p>`;
        if (echartsInstances[elementId]) {
            echartsInstances[elementId].dispose();
        }
        return;
    }

    if (echartsInstances[elementId]) {
        echartsInstances[elementId].dispose();
    }
    echartsInstances[elementId] = echarts.init(chartDom);

    const endPercent = (qNames.length > 30) ? (30 / qNames.length * 100) : 100;

    const option = {
        title: {
            text: title,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const p = params[0];
                return `<strong>题号: ${p.name}</strong><br/>数值: ${p.value.toFixed(3)}`; //    修正错字
            }
        },
        grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
        xAxis: {
            type: 'category',
            data: qNames,
            name: '题号', //    修正错字
            axisLabel: {
                interval: 'auto',
                rotate: 30
            }
        },
        yAxis: {
            type: 'value',
            min: yAxisRange[0],
            max: yAxisRange[1]
        },
        dataZoom: [
            {
                type: 'slider',
                xAxisIndex: [0],
                start: 0,
                end: endPercent,
                bottom: 10,
                height: 20
            },
            {
                type: 'inside',
                xAxisIndex: [0]
            }
        ],
        series: [{
            name: title,
            type: 'bar',
            data: data,
            barWidth: '60%',
            itemStyle: {
                color: '#007bff'
            }
        }],
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { show: true, title: '保存为图片' }
            }
        }
    };

    echartsInstances[elementId].setOption(option);
}

// =====================================================================
//    NEW    模块十三：  功能函数 (Feature 2 & 3)
// =====================================================================

/**
 * 13.5.    (Feature 3) 
 * 获取重  计算后的统计数据 (应用了用户配置的满分)
 */
function getRecalculatedItemStats(subjectName) {
    if (!G_ItemAnalysisData || !G_ItemAnalysisData[subjectName]) {
        return { minorStats: {}, majorStats: {}, minorQuestions: [], majorQuestions: [] };
    }

    // 1. 获取原始数据和配置
    const rawData = G_ItemAnalysisData[subjectName];
    const config = G_ItemAnalysisConfig[subjectName] || {};

    // 2. 创建  的统计对象
    const newMinorStats = {};
    const newMajorStats = {};

    // 3. 循环小题 (minor)
    (rawData.minorQuestions || []).forEach(qName => {
        const rawStat = rawData.minorStats[qName];
        if (!rawStat) return;

        const qConfig = config[qName] || {};

        //    核心    满分 = 手动配置的满分 || 自动检测的满分
        const fullScore = qConfig.fullScore || rawStat.maxScore;
        const avg = rawStat.avg;

        //    核心    重  计算难度
        const newDifficulty = (fullScore > 0) ? parseFloat((avg / fullScore).toFixed(2)) : 0;

        newMinorStats[qName] = {
            ...rawStat, // 复制原始数据 (avg, maxScore, discrimination)
            difficulty: newDifficulty, // 覆盖难度
            manualFullScore: qConfig.fullScore // 存储手动满分
        };
    });

    // 4. 循环大题 (major)
    (rawData.majorQuestions || []).forEach(qName => {
        const rawStat = rawData.majorStats[qName];
        if (!rawStat) return;

        const qConfig = config[qName] || {};
        const fullScore = qConfig.fullScore || rawStat.maxScore;
        const avg = rawStat.avg;
        const newDifficulty = (fullScore > 0) ? parseFloat((avg / fullScore).toFixed(2)) : 0;

        newMajorStats[qName] = {
            ...rawStat,
            difficulty: newDifficulty,
            manualFullScore: qConfig.fullScore
        };
    });

    return {
        minorStats: newMinorStats,
        majorStats: newMajorStats,
        minorQuestions: rawData.minorQuestions || [],
        majorQuestions: rawData.majorQuestions || []
    };
}

/**
 * 13.6.    (Feature 2) 
 * 绘制单个小题/大题图表 (根据下拉框选择)
 */
function drawItemAnalysisChart(type) { // type is 'minor' or 'major'
    const subjectName = document.getElementById('item-subject-select').value;
    if (!subjectName) return;

    // 1. 获取重  计算后的统计数据 (已应用配置)
    const stats = getRecalculatedItemStats(subjectName);

    // 2. 根据类型 (minor/major) 选择数据源
    const isMinor = (type === 'minor');
    const metricSelect = document.getElementById(isMinor ? 'item-minor-metric-select' : 'item-major-metric-select');
    const chartId = isMinor ? 'item-chart-minor' : 'item-chart-major';

    const qNames = isMinor ? stats.minorQuestions : stats.majorQuestions;
    const statsData = isMinor ? stats.minorStats : stats.majorStats;

    // 3. 根据下拉框选择指标
    const metric = metricSelect.value; // 'difficulty' or 'discrimination'

    // 4. 提取数据
    const data = qNames.map(qName => {
        return (statsData[qName] && statsData[qName][metric] !== undefined) ? statsData[qName][metric] : 0;
    });

    // 5. 准备图表参数
    let title, yAxisRange;
    if (metric === 'difficulty') {
        title = `各${isMinor ? '小' : '大'}题难度 (得分率)`;
        yAxisRange = [0, 1];
    } else {
        title = `各${isMinor ? '小' : '大'}题区分度`;
        yAxisRange = [-0.2, 1];
    }

    // 6. 渲染图表
    renderItemAnalysisBarChart(chartId, title, qNames, data, yAxisRange);
}

/**
 * 13.7. [增强版] 填充配置弹窗 (支持难度系数 + 试卷文本回显)
 */
function populateItemAnalysisConfigModal() {
    const subjectName = document.getElementById('item-subject-select').value;
    if (!subjectName) { alert("无可用科目！"); return; }

    const rawData = G_ItemAnalysisData[subjectName];
    const subjectConfig = G_ItemAnalysisConfig[subjectName] || {};
    const recalculatedStats = getRecalculatedItemStats(subjectName);

    const tableBody = document.getElementById('item-config-table-body');
    const paperTextarea = document.getElementById('item-config-full-paper'); 

    // 回显设置
    const skipRowsInput = document.getElementById('item-config-skip-rows');
    const globalSettings = G_ItemAnalysisConfig._global_settings_ || {};
    skipRowsInput.value = globalSettings.rowsToSkip !== undefined ? globalSettings.rowsToSkip : 3;

    paperTextarea.value = subjectConfig['_full_paper_context_'] || "";
    const graphDefTextarea = document.getElementById('item-config-graph-def');
    graphDefTextarea.value = subjectConfig['_knowledge_graph_def_'] || "";

    let html = '';
    const createRow = (qName, type, stat) => {
        if (!stat) return '';
        const qConfig = subjectConfig[qName] || {};
        const autoFull = stat.maxScore;
        const manualFull = qConfig.fullScore || '';
        const content = qConfig.content || '';
        
        // ✅【新增】读取已保存的难度
        const difficulty = qConfig.manualDifficulty !== undefined ? qConfig.manualDifficulty : '';

        return `
            <tr data-q-name="${qName}">
                <td><strong>${qName}</strong> (${type})</td>
                <td><input type="number" class="item-config-full" placeholder="自动: ${autoFull}" value="${manualFull}" style="width: 80px;"></td>
                
                <td>
                    <input type="number" class="item-config-diff" placeholder="0.0-1.0" value="${difficulty}" step="0.01" min="0" max="1" style="width: 80px; border: 1px solid #d35400; color: #d35400; font-weight: bold;">
                </td>

                <td><input type="text" class="item-config-content" value="${content}" style="width: 100%;"></td>
            </tr>
        `;
    };

    (recalculatedStats.majorQuestions || []).forEach(qName => { html += createRow(qName, '大题', recalculatedStats.majorStats[qName]); });
    (recalculatedStats.minorQuestions || []).forEach(qName => { html += createRow(qName, '小题', recalculatedStats.minorStats[qName]); });

    tableBody.innerHTML = html;

    const modal = document.getElementById('item-analysis-config-modal');
    document.getElementById('item-config-modal-title').innerText = `配置题目详情 (科目: ${subjectName})`;
    modal.dataset.subjectName = subjectName;
    modal.style.display = 'flex';
}

/**
 * 13.8. [增强版] 保存配置弹窗 (保存难度系数)
 */
function saveItemAnalysisConfigFromModal() {
    const modal = document.getElementById('item-analysis-config-modal');
    const subjectName = modal.dataset.subjectName;
    if (!subjectName) return;

    let allConfigs = G_ItemAnalysisConfig;

    const oldSkipRows = allConfigs._global_settings_ ? allConfigs._global_settings_.rowsToSkip : 3;
    const skipRowsInput = document.getElementById('item-config-skip-rows').value;
    const newSkipRows = parseInt(skipRowsInput);

    allConfigs._global_settings_ = allConfigs._global_settings_ || {};
    allConfigs._global_settings_.rowsToSkip = isNaN(newSkipRows) ? 3 : newSkipRows;

    let subjectConfig = allConfigs[subjectName] || {};

    const fullPaperText = document.getElementById('item-config-full-paper').value;
    subjectConfig['_full_paper_context_'] = fullPaperText;

    const graphDefText = document.getElementById('item-config-graph-def').value;
    subjectConfig['_knowledge_graph_def_'] = graphDefText;

    // ✅【新增】保存难度逻辑
    const rows = document.getElementById('item-config-table-body').querySelectorAll('tr');
    rows.forEach(row => {
        const qName = row.dataset.qName;
        const manualFullInput = row.querySelector('.item-config-full').value;
        const contentInput = row.querySelector('.item-config-content').value;
        
        // 获取难度输入
        const diffInput = row.querySelector('.item-config-diff').value;
        
        const manualFull = parseFloat(manualFullInput);
        const manualDiff = parseFloat(diffInput);

        subjectConfig[qName] = {
            fullScore: (!isNaN(manualFull) && manualFull > 0) ? manualFull : undefined,
            content: contentInput || undefined,
            // 保存难度 (如果是有效数字)
            manualDifficulty: (!isNaN(manualDiff)) ? manualDiff : undefined
        };
    });

    allConfigs[subjectName] = subjectConfig;
    G_ItemAnalysisConfig = allConfigs;
    State.itemAnalysisConfig = G_ItemAnalysisConfig;
    if (typeof window !== 'undefined') {
        window.G_ItemAnalysisConfig = G_ItemAnalysisConfig;
    }

    localforage.setItem('G_ItemAnalysisConfig', allConfigs).then(() => {
        modal.style.display = 'none';
        renderItemAnalysisCharts(); 

        if (oldSkipRows !== allConfigs._global_settings_.rowsToSkip) {
            alert(`✅ 配置已保存！\n\n⚠️ 检测到您修改了“末尾跳过行数”...\n请务必【重新导入】Excel 文件！`);
        } else {
            alert("✅ 配置已保存！(难度系数已更新)");
        }
    });
}

// =====================================================================
//    NEW    模块十三：分层对比图 (Feature 4)
// =====================================================================

/**
 * 13.9. [MODIFIED] (Feature 4) 
 * 计算分层后的小题统计数据
 * *    修正版 12    - 2025-11-11
 * - (Bug 修复) 修正了 groupStats (层均分) 只计算了小题，未计算大题的问题。
 * - (Bug 修复) 这导致了学生详情表中大题的 "层均得分率" 和 "偏差" 显示为 NaN。
 */
function calculateLayeredItemStats(subjectName, numGroups, filteredStudents) {
    // 1. 获取原始学生数据 (已在外部筛选)
    if (!G_ItemAnalysisData || !G_ItemAnalysisData[subjectName]) {
        return { groupStats: {}, qNames: [], overallDifficulty: {} };
    }
    const rawData = G_ItemAnalysisData[subjectName];

    //    修正    "qNames" 仅用于小题图表X轴，保持不变
    const qNames = rawData.minorQuestions || [];

    // 2. 获取重  计算后的 "满分" 配置
    const recalculatedStats = getRecalculatedItemStats(subjectName);
    const overallDifficulty = {}; // (用于柱状图)

    // 3. 获取有效学生并按总分排序 (高 -> 低)
    const validStudents = (filteredStudents || [])
        .filter(s => typeof s.totalScore === 'number' && !isNaN(s.totalScore))
        .sort((a, b) => b.totalScore - a.totalScore);

    if (validStudents.length === 0) {
        return { groupStats: {}, qNames: qNames, overallDifficulty: {} };
    }

    // 4. 将学生分层 (G1, G2, ...)
    const groupSize = Math.ceil(validStudents.length / numGroups);
    const studentGroups = [];
    for (let i = 0; i < numGroups; i++) {
        const group = validStudents.slice(i * groupSize, (i + 1) * groupSize);
        if (group.length > 0) {
            studentGroups.push(group);
        }
    }

    // 5.    修正    (Bug 修复) 计算 *所有* 题目的层均分
    const groupStats = {};

    // (辅助函数)
    const calculateGroupRates = (qNameList, scoreType, statsType) => {
        if (!qNameList || qNameList.length === 0) return;

        qNameList.forEach(qName => {
            // (a) 获取该题的 "正确" 满分
            const stat = recalculatedStats[statsType][qName];
            if (!stat) return;

            const fullScore = stat.manualFullScore || stat.maxScore;

            if (!fullScore || fullScore === 0) {
                //    关键修复点    如果满分为0，则该题的平均得分率也必须为0，不能中断循环
                studentGroups.forEach((_, index) => {
                    const groupName = `G${index + 1}`;
                    if (!groupStats[groupName]) groupStats[groupName] = {};
                    groupStats[groupName][qName] = 0; // 确保设置为0
                });
                return;
            }

            // (b) 遍历所有层，计算该题在该层的平均得分率
            studentGroups.forEach((group, index) => {
                const groupName = `G${index + 1}`;
                if (!groupStats[groupName]) groupStats[groupName] = {};

                let totalScore = 0;
                let validCount = 0;
                group.forEach(student => {
                    const score = student[scoreType][qName]; // 'minorScores' or 'majorScores'
                    if (typeof score === 'number' && !isNaN(score)) {
                        totalScore += score;
                        validCount++;
                    }
                });
                const avgScore = (validCount > 0) ? totalScore / validCount : 0;
                const difficulty = parseFloat((avgScore / fullScore).toFixed(3));
                groupStats[groupName][qName] = difficulty;
            });
        });
    };

    //    修正    (Bug 修复) 同时计算小题和大题
    calculateGroupRates(rawData.minorQuestions, 'minorScores', 'minorStats');
    calculateGroupRates(rawData.majorQuestions, 'majorScores', 'majorStats');

    // 6.    不变    (Bug 修复)
    // "overallDifficulty" 仅用于小题对比图的柱状图，所以 *只* 计算小题
    qNames.forEach(qName => {
        overallDifficulty[qName] = recalculatedStats.minorStats[qName]?.difficulty || 0;
    });

    return { groupStats, qNames, overallDifficulty };
}

/**
 * 13.10. [MODIFIED] (Feature 4) 
 * 绘制小题得分率分层对比图
 * *    修正版 11    - 2025-11-11
 * - (Bug 修复) 在 setOption 时添加 { notMerge: true }，解决折线图不显示的 Bug。
 */
function drawItemAnalysisLayeredChart() {
    const chartDom = document.getElementById('item-chart-layered');
    if (!chartDom) return;

    if (echartsInstances['item-chart-layered']) {
        echartsInstances['item-chart-layered'].dispose();
    }
    echartsInstances['item-chart-layered'] = echarts.init(chartDom);

    // 1. 获取参数
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const numGroups = parseInt(document.getElementById('item-layer-groups').value);

    // 2. 获取筛选后的学生
    const allStudents = G_ItemAnalysisData[subjectName]?.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. [核心] 计算分层数据 (现在会返回正确的 overallDifficulty)
    const { groupStats, qNames, overallDifficulty } = calculateLayeredItemStats(subjectName, numGroups, filteredStudents);

    if (qNames.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">本科目无“小题”数据，无法生成分层图。</p>`;
        return;
    }

    // 4. 准备 ECharts Series (不变)
    const series = [];
    const legendData = [];

    series.push({
        name: '全体得分率',
        type: 'bar',
        data: qNames.map(qName => overallDifficulty[qName]),
        barWidth: '60%',
        itemStyle: { opacity: 0.6, color: '#909399' },
        z: 3
    });
    legendData.push('全体得分率');

    const lineColors = [
        '#007bff', '#28a745', '#17a2b8', '#ffc107', '#fd7e14',
        '#6f42c1', '#dc3545', '#e83e8c', '#6c757d', '#343a40'
    ];

    Object.keys(groupStats).forEach((groupName, index) => {
        legendData.push(groupName);
        series.push({
            name: groupName,
            type: 'line',
            smooth: true,
            data: qNames.map(qName => groupStats[groupName][qName] || 0),
            color: lineColors[index % lineColors.length],
            z: 10
        });
    });

    // 5. ECharts 配置 (不变)
    const option = {
        title: {
            text: '小题得分率分层对比',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: legendData, top: 30, type: 'scroll' },
        grid: { left: '3%', right: '4%', bottom: '20%', top: 70, containLabel: true },
        xAxis: {
            type: 'category',
            data: qNames,
            name: '小题题号',
            axisLabel: { interval: 'auto', rotate: 30 }
        },
        yAxis: { type: 'value', name: '得分率', min: 0, max: 1 },
        dataZoom: [
            {
                type: 'slider',
                xAxisIndex: [0],
                start: 0,
                end: (qNames.length > 30) ? (30 / qNames.length * 100) : 100,
                bottom: 10,
                height: 20
            },
            {
                type: 'inside',
                xAxisIndex: [0]
            }
        ],
        series: series
    };

    //    修正    (Bug 修复) 添加 notMerge: true
    echartsInstances['item-chart-layered'].setOption(option, { notMerge: true });
}

// =====================================================================
//    NEW    模块十三：知识点分层图 (Feature 5)
// =====================================================================

/**
 * 13.11. [FIXED & UPGRADED] 计算分层后的知识点统计数据
 *        ：统计每个知识点对应的题目题号
 */
function calculateLayeredKnowledgeStats(subjectName, numGroups, filteredStudents, questionType = 'all') {
    // 1. 获取基础数据
    if (!G_ItemAnalysisData || !G_ItemAnalysisData[subjectName]) {
        return { groupStats: {}, knowledgePoints: [], studentsWithRates: [], displayLabels: [] };
    }
    const rawData = G_ItemAnalysisData[subjectName];
    const subjectConfig = G_ItemAnalysisConfig[subjectName] || {};

    // 2. [核心] 构建知识点列表 & 题目映射关系
    const knowledgeSet = new Set();
    const kpToQuestionsMap = {}; // { "牛顿定律": ["1", "3"], "速度": ["4"] }

    // 辅助：收集题号到知识点的映射
    const collectQuestionInfo = (qList) => {
        if (!qList) return;
        qList.forEach(qName => {
            const content = subjectConfig[qName]?.content;
            if (content) {
                // 支持中文分号和英文分号
                const kps = content.split(/[;；]/).map(k => k.trim()).filter(k => k);
                kps.forEach(k => {
                    knowledgeSet.add(k);
                    
                    if (!kpToQuestionsMap[k]) kpToQuestionsMap[k] = [];
                    // 避免重复添加 (虽然逻辑上不会，但为了保险)
                    if (!kpToQuestionsMap[k].includes(qName)) {
                        kpToQuestionsMap[k].push(qName);
                    }
                });
            }
        });
    };

    // 根据筛选类型收集题目信息
    if (questionType === 'all' || questionType === 'minor') collectQuestionInfo(rawData.minorQuestions);
    if (questionType === 'all' || questionType === 'major') collectQuestionInfo(rawData.majorQuestions);

    const knowledgePoints = Array.from(knowledgeSet).sort();

    //            生成用于图表显示的标签数组 (与 knowledgePoints 一一对应)
    const displayLabels = knowledgePoints.map(kp => {
        const qList = kpToQuestionsMap[kp] || [];
        // 对题号进行简单排序 (数字排序)
        qList.sort((a, b) => {
            const numA = parseFloat(a) || 0;
            const numB = parseFloat(b) || 0;
            return numA - numB;
        });
        
        // 如果题目太多，换行显示，避免挤在一起
        const qStr = qList.join(',');
        return `${kp}\n(题${qStr})`; // 例如：速度\n(题4,12)
    });

    if (knowledgePoints.length === 0) {
        return { groupStats: {}, knowledgePoints: [], studentsWithRates: [], displayLabels: [] };
    }

    // 3. 获取重  计算后的满分
    const recalculatedStats = getRecalculatedItemStats(subjectName);

    // 4. 获取排序后的学生
    const validStudents = (filteredStudents || [])
        .filter(s => typeof s.totalScore === 'number' && !isNaN(s.totalScore))
        .sort((a, b) => b.totalScore - a.totalScore);

    if (validStudents.length === 0) {
        return { groupStats: {}, knowledgePoints: knowledgePoints, studentsWithRates: [], displayLabels: displayLabels };
    }

    // 5. 计算每个学生在每个知识点上的得分率
    validStudents.forEach(student => {
        student.knowledgeRates = {};
        const aggregates = {};
        knowledgePoints.forEach(kp => { aggregates[kp] = { totalGot: 0, totalPossible: 0 }; });

        const processQuestion = (qName, statsType, scoreType) => {
            const qContent = subjectConfig[qName]?.content || "";
            const qKps = qContent.split(/[;；]/).map(k => k.trim()).filter(k => k);

            if (qKps.length > 0) {
                const stat = recalculatedStats[statsType][qName];
                const score = student[scoreType][qName];
                const fullScore = stat?.manualFullScore || stat?.maxScore;

                if (typeof score === 'number' && !isNaN(score) && fullScore > 0) {
                    qKps.forEach(targetKp => {
                        if (aggregates[targetKp]) {
                            aggregates[targetKp].totalGot += score;
                            aggregates[targetKp].totalPossible += fullScore;
                        }
                    });
                }
            }
        };

        if (questionType === 'all' || questionType === 'minor') {
            (rawData.minorQuestions || []).forEach(qName => processQuestion(qName, 'minorStats', 'minorScores'));
        }
        if (questionType === 'all' || questionType === 'major') {
            (rawData.majorQuestions || []).forEach(qName => processQuestion(qName, 'majorStats', 'majorScores'));
        }

        for (const kp in aggregates) {
            const agg = aggregates[kp];
            student.knowledgeRates[kp] = (agg.totalPossible > 0) ? (agg.totalGot / agg.totalPossible) : null;
        }
    });

    // 6. 将学生分层
    const groupSize = Math.ceil(validStudents.length / numGroups);
    const studentGroups = [];
    for (let i = 0; i < numGroups; i++) {
        const group = validStudents.slice(i * groupSize, (i + 1) * groupSize);
        if (group.length > 0) studentGroups.push(group);
    }

    // 7. 计算每层平均得分率
    const groupStats = {};
    studentGroups.forEach((group, index) => {
        const groupName = `G${index + 1}`;
        groupStats[groupName] = {};
        knowledgePoints.forEach(kp => {
            let totalRate = 0;
            let validCount = 0;
            group.forEach(student => {
                const rate = student.knowledgeRates[kp];
                if (rate !== null && !isNaN(rate)) {
                    totalRate += rate;
                    validCount++;
                }
            });
            groupStats[groupName][kp] = (validCount > 0) ? (totalRate / validCount) : 0;
        });
    });

    //    修改    返回 displayLabels
    return { groupStats, knowledgePoints, studentsWithRates: validStudents, displayLabels };
}


/**
 * 13.12. [MODIFIED] (Feature 5) 
 * 绘制知识点掌握情况分组柱状图
 */
function drawItemAnalysisKnowledgeChart() {
    const chartDom = document.getElementById('item-chart-knowledge');
    if (!chartDom) return;

    if (echartsInstances['item-chart-knowledge']) {
        echartsInstances['item-chart-knowledge'].dispose();
    }
    echartsInstances['item-chart-knowledge'] = echarts.init(chartDom);

    // 1. 获取参数
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const numGroups = parseInt(document.getElementById('item-layer-groups').value);

    // 2. 获取筛选后的学生
    const allStudents = G_ItemAnalysisData[subjectName]?.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. [核心] 计算分层数据
    //    解构出 displayLabels
    const { groupStats, knowledgePoints, displayLabels } = calculateLayeredKnowledgeStats(subjectName, numGroups, filteredStudents);

    if (knowledgePoints.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">未找到已配置“考查内容”的题目，请先点击“配置题目”。</p>`;
        return;
    }

    // 4. 准备 ECharts Series
    const series = [];
    const legendData = Object.keys(groupStats);
    const lineColors = [
        '#007bff', '#28a745', '#17a2b8', '#ffc107', '#fd7e14',
        '#6f42c1', '#dc3545', '#e83e8c', '#6c757d', '#343a40'
    ];

    legendData.forEach((groupName, index) => {
        series.push({
            name: groupName,
            type: 'bar',
            barGap: 0,
            emphasis: { focus: 'series' },
            // 数据依然使用 knowledgePoints (原始key) 来索引 groupStats
            data: knowledgePoints.map(kp => {
                return parseFloat((groupStats[groupName][kp] || 0).toFixed(3));
            }),
            color: lineColors[index % lineColors.length]
        });
    });

    // 5. ECharts 配置
    const option = {
        title: {
            text: '知识点掌握情况 (按总分分层)',
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: { 
            trigger: 'axis', 
            axisPointer: { type: 'shadow' },
            // [可选] Tooltip 格式化，让浮层也显示题目
            formatter: (params) => {
                // params[0].name 已经是带换行符的 displayLabel 了
                // 我们可以把它处理一下，让它在 tooltip 里显示得更好看
                const title = params[0].name.replace('\n', ' '); 
                let html = `<strong>${title}</strong><br/>`;
                params.forEach(p => {
                    html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
                });
                return html;
            }
        },
        legend: { data: legendData, top: 30, type: 'scroll' },
        grid: { left: '3%', right: '4%', bottom: '20%', top: 70, containLabel: true },
        xAxis: {
            type: 'category',
            //    核心修改    这里使用 displayLabels 而不是 knowledgePoints
            data: displayLabels, 
            name: '知识点 (含题号)',
            axisLabel: { 
                interval: 0, // 强制显示所有标签
                rotate: 30,  // 旋转以防重叠
                fontSize: 11,
                // 如果标签太长，ECharts 会自动处理换行，因为我们加了 \n
                lineHeight: 14 
            }
        },
        yAxis: { type: 'value', name: '得分率', min: 0, max: 1 },
        dataZoom: [
            {
                type: 'slider',
                xAxisIndex: [0],
                start: 0,
                // 动态调整显示范围，防止柱子太细
                end: (knowledgePoints.length > 15) ? (15 / knowledgePoints.length * 100) : 100,
                bottom: 10,
                height: 20
            },
            {
                type: 'inside',
                xAxisIndex: [0]
            }
        ],
        series: series
    };

    echartsInstances['item-chart-knowledge'].setOption(option, { notMerge: true });
}

// =====================================================================
//    NEW    模块十三：学生个体诊断表 (Feature 6)
// =====================================================================

/**
 * 13.13. [MODIFIED] (Feature 6) 
 * 计算学生知识点偏差（短板/亮点）
 * *    修正版 12    - 2025-11-11
 * - (Feature) 签名变更，接收 studentsWithRates。
 * - (Refactor) 移除了重复的学生获取和得分率计算。
 */
function calculateStudentKnowledgeOutliers(subjectName, numGroups, groupStats, knowledgePoints, studentsWithRates, questionType = 'all') {
    // 1. 获取基础数据 (已在外部筛选)
    if (!G_ItemAnalysisData || !G_ItemAnalysisData[subjectName]) {
        return [];
    }

    // 2.    修正    (Refactor) 直接使用传入的 studentsWithRates
    const validStudents = studentsWithRates;

    if (validStudents.length === 0 || knowledgePoints.length === 0) {
        return [];
    }

    // (健壮性检查)
    if (!validStudents[0] || !validStudents[0].knowledgeRates) {
        console.error("calculateStudentKnowledgeOutliers: 依赖的学生知识点得分率未计算。");
        return [];
    }

    // 3. 将学生分层 (G1, G2, ...)
    const groupSize = Math.ceil(validStudents.length / numGroups);
    const outlierList = [];

    for (let i = 0; i < validStudents.length; i++) {
        const student = validStudents[i];

        // (a) 确定学生所在的层
        const groupIndex = Math.floor(i / groupSize);
        const groupName = `G${groupIndex + 1}`;
        const layerAverages = groupStats[groupName];

        if (!layerAverages) continue;

        let worstDeviation = 0;
        let worstKP = 'N/A';
        let bestDeviation = 0;
        let bestKP = 'N/A';

        // (b) 遍历所有知识点，计算偏差
        knowledgePoints.forEach(kp => {
            const studentRate = student.knowledgeRates[kp];
            const layerRate = layerAverages[kp];

            //    修正    只有当学生和层级都有有效得分率时才比较
            if (studentRate !== null && typeof studentRate === 'number' && typeof layerRate === 'number' && layerRate > 0) {
                const deviation = studentRate - layerRate;

                if (deviation < worstDeviation) {
                    worstDeviation = deviation;
                    worstKP = kp;
                }
                if (deviation > bestDeviation) {
                    bestDeviation = deviation;
                    bestKP = kp;
                }
            }
        });

        // (c) 存入列表
        outlierList.push({
            name: student.name,
            id: student.id,
            totalScore: student.totalScore,
            layer: groupName,
            worstKP: worstKP,
            worstDeviation: worstDeviation,
            bestKP: bestKP,
            bestDeviation: bestDeviation
        });
    }

    return outlierList;
}
/**
 * 13.14. [MODIFIED] (Feature 6) 
 * 绘制学生个体知识点诊断表
 * *    修正版 12    - 2025-11-11
 * - (Feature)     读取 "题目类型" (questionType) 筛选器。
 * - (Feature) 将 questionType 传递给计算函数。
 */
function drawItemAnalysisOutlierTable() {
    const tableContainer = document.getElementById('item-outlier-table-container');
    if (!tableContainer) return;

    const detailContainer = document.getElementById('item-student-detail-container');
    if (detailContainer) detailContainer.style.display = 'none';

    //         (One Button)    重置打印按钮
    const printBtn = document.getElementById('item-print-btn');
    if (printBtn) {
        // (获取当前筛选的文本)
        const classFilterSelect = document.getElementById('item-class-filter');
        const classFilterText = classFilterSelect.value === 'ALL' ? '全体' : classFilterSelect.options[classFilterSelect.selectedIndex].text;

        printBtn.innerText = `🖨️ 打印当前筛选 (${classFilterText})`;
        printBtn.dataset.printTarget = 'filter'; // 设为"筛选"模式
        printBtn.dataset.studentId = ''; // 清空学生ID
    }

    // 1. 获取参数
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const numGroups = parseInt(document.getElementById('item-layer-groups').value);
    const sortType = document.getElementById('item-outlier-sort').value;
    const searchQuery = document.getElementById('item-outlier-search').value.toLowerCase();
    const questionType = document.getElementById('item-outlier-type-filter').value; //    NEW   

    // 2. 获取筛选后的学生
    const allStudents = G_ItemAnalysisData[subjectName]?.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. [核心] 先调用知识点分层统计
    //    修正    传递 questionType
    const { groupStats, knowledgePoints, studentsWithRates } = calculateLayeredKnowledgeStats(subjectName, numGroups, filteredStudents, questionType);

    if (knowledgePoints.length === 0) {
        tableContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 20px;">未找到已配置“考察内容”的题目，无法生成诊断表。</p>`;
        G_ItemOutlierList = [];
        State.itemOutlierList = G_ItemOutlierList;
        if (typeof window !== 'undefined') {
            window.G_ItemOutlierList = G_ItemOutlierList;
        }
        return;
    }

    // 4. [核心] 再调用偏差计算
    //    修正    传递 questionType 和 studentsWithRates
    G_ItemOutlierList = calculateStudentKnowledgeOutliers(subjectName, numGroups, groupStats, knowledgePoints, studentsWithRates, questionType);
    State.itemOutlierList = G_ItemOutlierList;
    if (typeof window !== 'undefined') {
        window.G_ItemOutlierList = G_ItemOutlierList;
    }

    // 5. 根据搜索框过滤
    const searchedList = (searchQuery)
        ? G_ItemOutlierList.filter(s =>
            s.name.toLowerCase().includes(searchQuery) ||
            String(s.id).toLowerCase().includes(searchQuery)
        )
        : G_ItemOutlierList;

    // 6. 根据下拉框排序
    if (sortType === 'weakness') {
        searchedList.sort((a, b) => a.worstDeviation - b.worstDeviation);
    } else {
        searchedList.sort((a, b) => b.bestDeviation - a.bestDeviation);
    }

    // 7. 渲染表格 HTML (不变)
    let html = ``;
    if (searchedList.length === 0) {
        html = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">未找到符合条件的学生。</p>`;
    } else {
        html = `
            <table>
                <thead>
                    <tr>
                        <th>姓名</th>
                        <th>层级</th>
                        <th>总分</th>
                        <th>最大短板 (知识点)</th>
                        <th>短板偏差</th>
                        <th>最大亮点 (知识点)</th>
                        <th>亮点偏差</th>
                    </tr>
                </thead>
                <tbody>
                    ${searchedList.map(s => `
                        <tr data-id="${s.id}" data-name="${s.name}" data-layer="${s.layer}" style="cursor: pointer;">
                            <td>${s.name}</td>
                            <td><strong>${s.layer}</strong></td>
                            <td>${s.totalScore}</td>
                            
                            <td>${s.worstKP}</td>
                            <td>
                                ${s.worstDeviation < 0
                ? `<strong class="regress">▼ ${s.worstDeviation.toFixed(2)}</strong>`
                : s.worstDeviation.toFixed(2)
            }
                            </td>
                            
                            <td>${s.bestKP}</td>
                            <td>
                                ${s.bestDeviation > 0
                ? `<strong class="progress">▲ ${s.bestDeviation.toFixed(2)}</strong>`
                : s.bestDeviation.toFixed(2)
            }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    tableContainer.innerHTML = html;
}

// =====================================================================
//    NEW    模块十三：班级筛选辅助函数 (Feature 1)
// =====================================================================

/**
 * 13.15.    (Feature 1) 
 * 填充模块十三的班级筛选器
 */
function populateItemClassFilter(allStudents) {
    const classFilterSelect = document.getElementById('item-class-filter');
    if (!classFilterSelect) return;

    // 1. 获取当前选中的值 (以便在刷  时保留)
    const oldValue = classFilterSelect.value;

    // 2. 从学生列表中提取班级
    const classes = [...new Set(allStudents.map(s => s.class))].sort();

    // 3. 生成 HTML
    let html = `<option value="ALL">-- 全体 --</option>`;
    html += classes.map(c => `<option value="${c}">${c}</option>`).join('');

    classFilterSelect.innerHTML = html;

    // 4. 尝试恢复旧值
    if (oldValue && classFilterSelect.querySelector(`option[value="${oldValue}"]`)) {
        classFilterSelect.value = oldValue;
    } else {
        classFilterSelect.value = 'ALL';
    }
}

// =====================================================================
//    NEW    模块十三：学生个体-题目详情表 (Feature 7)
// =====================================================================

/**
 * 13.16. [MODIFIED] (Feature 7) 
 * 绘制学生个体-题目详情表
 * *    修正版 14    - 2025-11-11
 * - (Feature) 应用 G_ItemDetailSort 排序。
 * - (Feature) 渲染 <th> 上的 data-sort-key 属性和排序样式类。
 * - (Bug 修复保持) 确保了对 calculateLayeredItemStats 的正确调用。
 */
function drawItemStudentDetailTable(studentId, studentName, studentLayer, questionType = 'all') {
    const detailContainer = document.getElementById('item-student-detail-container');
    if (!detailContainer) return;

    // 1. 获取参数
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const numGroups = parseInt(document.getElementById('item-layer-groups').value);

    // 2. 获取筛选后的学生
    const allStudents = G_ItemAnalysisData[subjectName]?.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. 获取学生对象
    const student = filteredStudents.find(s => String(s.id) === String(studentId));
    if (!student) {
        detailContainer.innerHTML = `<p>未找到学生 ${studentName} 的数据。</p>`;
        return;
    }

    // 4. (不变) 获取层均分
    const { groupStats } = calculateLayeredItemStats(subjectName, numGroups, filteredStudents);
    const layerAvgRates = groupStats[studentLayer];

    // 5. (不变) 获取题目满分
    const recalculatedStats = getRecalculatedItemStats(subjectName);
    const { minorStats, majorStats, minorQuestions, majorQuestions } = recalculatedStats;

    if (!layerAvgRates) {
        detailContainer.innerHTML = `<p>无法计算 ${studentLayer} 的层级平均数据。</p>`;
        return;
    }

    // 6. (不变) 遍历所有题目，计算偏差
    const allQuestionDetails = [];
    const processQuestion = (qName, stat, studentScore) => {
        if (!stat) return;
        const fullScore = stat.manualFullScore || stat.maxScore;
        const studentRate = (fullScore > 0 && typeof studentScore === 'number') ? (studentScore / fullScore) : null;
        const layerRate = layerAvgRates[qName];
        const deviation = (studentRate !== null && typeof layerRate === 'number') ? (studentRate - layerRate) : null;
        const kp = (G_ItemAnalysisConfig[subjectName] && G_ItemAnalysisConfig[subjectName][qName]) ? G_ItemAnalysisConfig[subjectName][qName].content : '';
        const studentOutlierData = G_ItemOutlierList.find(s => String(s.id) === String(studentId));
        const worstKP = studentOutlierData ? studentOutlierData.worstKP : null;
        const bestKP = studentOutlierData ? studentOutlierData.bestKP : null;
        let kpClass = '';
        if (kp && kp === worstKP) kpClass = 'regress';
        if (kp && kp === bestKP) kpClass = 'progress';

        allQuestionDetails.push({
            qName: qName,
            kp: kp || 'N/A', //    修正    确保N/A
            studentScore: studentScore ?? 'N/A',
            fullScore: fullScore,
            studentRate: studentRate,
            layerRate: layerRate,
            deviation: deviation,
            kpClass: kpClass
        });
    };
    if (questionType === 'all' || questionType === 'minor') {
        (minorQuestions || []).forEach(qName => {
            processQuestion(qName, minorStats[qName], student.minorScores[qName]);
        });
    }
    if (questionType === 'all' || questionType === 'major') {
        (majorQuestions || []).forEach(qName => {
            processQuestion(qName, majorStats[qName], student.majorScores[qName]);
        });
    }

    // 7.    修正 (Feature)    按 G_ItemDetailSort 排序
    allQuestionDetails.sort((a, b) => {
        const { key, direction } = G_ItemDetailSort;
        let valA = a[key];
        let valB = b[key];

        // 处理 'N/A' 和 null
        if (valA === 'N/A' || valA === null || valA === undefined) valA = (direction === 'asc' ? Infinity : -Infinity);
        if (valB === 'N/A' || valB === null || valB === undefined) valB = (direction === 'asc' ? Infinity : -Infinity);

        if (key === 'qName' || key === 'kp') {
            // 字符串排序
            return direction === 'asc'
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        } else {
            // 数字排序
            return direction === 'asc' ? valA - valB : valB - valA;
        }
    });

    // 8. 渲染表格
    const typeText = (questionType === 'minor') ? ' (仅小题)' : (questionType === 'major') ? ' (仅大题)' : ' (全部题目)';
    detailContainer.innerHTML = `
        <h4>${studentName} (${studentLayer}层) - 题目详情${typeText} (按短板排序)</h4>
        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
            <table>
                <thead>
                    <tr>
                        <th data-sort-key="qName">题号</th>
                        <th data-sort-key="kp">知识点</th>
                        <th data-sort-key="studentScore">学生得分</th>
                        <th data-sort-key="fullScore">满分</th>
                        <th data-sort-key="studentRate">学生得分率</th>
                        <th data-sort-key="layerRate">层均得分率</th>
                        <th data-sort-key="deviation">得分率偏差</th>
                    </tr>
                </thead>
                <tbody>
                    ${allQuestionDetails.map(q => `
                        <tr>
                            <td><strong>${q.qName}</strong></td>
                            <td class="${q.kpClass}">
                                <strong>${q.kp}</strong>
                            </td>
                            <td>${q.studentScore}</td>
                            <td>${q.fullScore}</td>
                            <td>${q.studentRate !== null ? (q.studentRate * 100).toFixed(1) + '%' : 'N/A'}</td>
                            <td>${(q.layerRate !== null && q.layerRate !== undefined) ? (q.layerRate * 100).toFixed(1) + '%' : 'N/A'}</td>
                            <td>
                                ${(q.deviation !== null && q.deviation !== undefined)
            ? (q.deviation > 0
                ? `<strong class="progress">▲ ${(q.deviation * 100).toFixed(1)}%</strong>`
                : (q.deviation < 0
                    ? `<strong class="regress">▼ ${(q.deviation * 100).toFixed(1)}%</strong>`
                    : `0.0%`))
            : 'N/A'
        }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // 9.    NEW (Feature)    应用排序样式
    const th = detailContainer.querySelector(`th[data-sort-key="${G_ItemDetailSort.key}"]`);
    if (th) {
        th.classList.add(G_ItemDetailSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }

    // 10. (显示)
    detailContainer.style.display = 'block';

    //    在这里添加第 3 个代码片段
    // 11.    修改 (One Button)    更  打印按钮状态
    const printBtn = document.getElementById('item-print-btn');
    if (printBtn) {
        printBtn.innerText = `🖨️ 打印 ${studentName}`;
        printBtn.dataset.printTarget = 'current'; // 设为"当前"模式
        printBtn.dataset.studentId = studentId; // 存储ID
    }
}

// =====================================================================
//    NEW    模块十三：题目-学生 四象限图 (Feature 8)
// =====================================================================

/**
 * 13.17.    (Feature 8) 
 * 绘制 题目-学生 诊断散点图 (四象限图)
 */
function drawItemScatterQuadrantChart() {
    const chartDom = document.getElementById('item-chart-scatter-quadrant');
    if (!chartDom) return;

    if (echartsInstances['item-chart-scatter-quadrant']) {
        echartsInstances['item-chart-scatter-quadrant'].dispose();
    }
    const myChart = echarts.init(chartDom);
    echartsInstances['item-chart-scatter-quadrant'] = myChart;

    // 1. 获取参数
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const qName = document.getElementById('item-scatter-question-select').value;

    if (!qName) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">请选择一道题目。</p>`;
        return;
    }

    // 2. 获取筛选后的学生
    const allStudents = G_ItemAnalysisData[subjectName]?.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    // 3. 获取题目统计数据
    const recalculatedStats = getRecalculatedItemStats(subjectName);
    const stat = recalculatedStats.minorStats[qName] || recalculatedStats.majorStats[qName];
    if (!stat) {
        chartDom.innerHTML = `<p>无法加载题目 ${qName} 的数据。</p>`;
        return;
    }
    const qFullScore = stat.manualFullScore || stat.maxScore;
    const isMinor = (recalculatedStats.minorStats[qName] != null);

    // 4.    核心    计算 *筛选后学生* 的平均题分和平均总分
    const qScores = [];
    const tScores = [];
    const scatterData = [];

    filteredStudents.forEach(s => {
        const tScore = s.totalScore;
        const qScore = isMinor ? s.minorScores[qName] : s.majorScores[qName];

        if (typeof tScore === 'number' && !isNaN(tScore) && typeof qScore === 'number' && !isNaN(qScore)) {
            tScores.push(tScore);
            qScores.push(qScore);
            scatterData.push([qScore, tScore, s.name]); // [X, Y, Name]
        }
    });

    if (scatterData.length === 0) {
        chartDom.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding-top: 50px;">当前筛选下无有效学生数据。</p>`;
        return;
    }

    const avgTotal = tScores.reduce((a, b) => a + b, 0) / tScores.length;
    const avgQScore = qScores.reduce((a, b) => a + b, 0) / qScores.length;

    // 5.    核心    计算 Y 轴最大值 (卷面总分)
    let totalFullScore = 0;
    // (用户规则: 卷面总分 = 小题满分之和)
    if (recalculatedStats.minorStats) {
        for (const qn in recalculatedStats.minorStats) {
            const s = recalculatedStats.minorStats[qn];
            totalFullScore += (s.manualFullScore || s.maxScore);
        }
    }
    if (totalFullScore === 0) totalFullScore = Math.max(...tScores) * 1.1; // (备用)

    // 6. 将数据分为四个象限
    const qTR = [], qBR = [], qTL = [], qBL = [];
    // 颜色定义 (参考您的图片)
    const colors = {
        TR: '#f56c6c', // (右上) 尖子生 - (重点关注) ->    (您的图片中，右上是“短板”，但逻辑上应是右下)
        BR: '#dc3545', // (右下) 高总分, 低题分 ->    (这才是“短板”，标红)
        TL: '#E6A23C', // (左上) 低总分, 高题分 -> "低分高能"
        BL: '#409EFF'  // (左下)
    };

    scatterData.forEach(d => {
        const qScore = d[0];
        const tScore = d[1];
        if (tScore >= avgTotal && qScore >= avgQScore) qTR.push(d); // 高总分, 高题分
        else if (tScore >= avgTotal && qScore < avgQScore) qBR.push(d); // 高总分, 低题分 (短板!)
        else if (tScore < avgTotal && qScore >= avgQScore) qTL.push(d); // 低总分, 高题分
        else qBL.push(d); // 低总分, 低题分
    });

    // 7. 渲染 ECharts
    const option = {
        title: {
            text: `“${qName}” 题目-学生 诊断图`,
            subtext: `(班级: ${selectedClass})`,
            left: 'center',
            textStyle: { fontSize: 16, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const data = params.data;
                return `<strong>${data[2]} (${params.seriesName})</strong><br/>` +
                    `卷面总分: ${data[1]}<br/>` +
                    `本题得分: ${data[0]}`;
            }
        },
        grid: { left: '10%', right: '10%', bottom: '10%', top: '15%' },
        xAxis: {
            type: 'value',
            name: `题目 “${qName}” 得分`,
            nameLocation: 'middle',
            nameGap: 30,
            min: 0,
            max: qFullScore,
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: '卷面总分',
            nameLocation: 'middle',
            nameGap: 40,
            min: 0,
            max: totalFullScore,
            splitLine: { show: false }
        },
        //    核心    十字象限线 和 标签
        series: [
            { name: '高总分-高题分 (已掌握)', type: 'scatter', data: qTR, itemStyle: { color: colors.TR, opacity: 0.7 } },
            { name: '高总分-低题分 (短板!!)', type: 'scatter', data: qBR, itemStyle: { color: colors.BR, opacity: 0.7 } },
            { name: '低总分-高题分 (亮点)', type: 'scatter', data: qTL, itemStyle: { color: colors.TL, opacity: 0.7 } },
            { name: '低总分-低题分', type: 'scatter', data: qBL, itemStyle: { color: colors.BL, opacity: 0.7 } },
            {
                // (这个空 series 专门用于画线)
                type: 'scatter',
                data: [],
                markLine: {
                    silent: true, animation: false,
                    label: { position: 'end' },
                    lineStyle: { type: 'dashed', color: 'red' },
                    data: [
                        { xAxis: avgQScore, name: `题均分(${avgQScore.toFixed(1)})` },
                        { yAxis: avgTotal, name: `总均分(${avgTotal.toFixed(1)})` }
                    ]
                }
            }
        ]
    };

    // 8.    核心    动态添加象限标签
    // (必须在 setOption 后调用)
    myChart.setOption(option);

    setTimeout(() => {
        const graphicElements = [
            { type: 'text', right: '12%', top: '18%', style: { text: '高总分\n高题分', fill: colors.TR, fontWeight: 'bold' } },
            { type: 'text', right: '12%', bottom: '12%', style: { text: '低总分\n高题分 (亮点)', fill: colors.BR, fontWeight: 'bold' } },
            { type: 'text', left: '12%', top: '18%', style: { text: '高总分\n低题分 (短板)', fill: colors.TL, fontWeight: 'bold' } },
            { type: 'text', left: '12%', bottom: '12%', style: { text: '低总分\n低题分', fill: colors.BL, fontWeight: 'bold' } }
        ];
        myChart.setOption({ graphic: graphicElements });
    }, 0);
}



// =====================================================================
//    NEW (Print Feature)    模块二：打印引擎
// =====================================================================

/**
 * 1. [打印引擎-核心] 启动打印作业 (修复版)
 * *    修正版 23 (数据读取修复)   
 * - (    ) 改为 async 函数，优先从 localforage 读取文件名，解决文件上传后打印显示 N/A 的问题。
 * - (保留) 所有的布局样式修复 (修正版 22)。
 */
async function startPrintJob(studentIds) {
    if (!studentIds || studentIds.length === 0) {
        alert("没有可打印的学生。");
        return;
    }

    // 1.    核心修复    获取考试信息
    // 优先从 localforage (IndexedDB) 读取，如果为空则降级读取 localStorage
    // 这样无论是“文件上传”还是“列表导入”，都能正确显示文件名
    let mainFile = await localforage.getItem('G_MainFileName');
    if (!mainFile) mainFile = localStorage.getItem('G_MainFileName') || '本次成绩';

    let compareFile = await localforage.getItem('G_CompareFileName');
    if (!compareFile) compareFile = localStorage.getItem('G_CompareFileName') || 'N/A';

    // (页眉的 HTML 内容)
    const headerHtml = `
        <h2>学生个体报告</h2>
        <p style="text-align: left; margin: 5px 0;"><strong>本次成绩:</strong> ${mainFile}</p>
        <p style="text-align: left; margin: 5px 0;"><strong>对比成绩:</strong> ${compareFile}</p>
    `;

    // 2. [核心] 生成打印页面的完整 HTML (样式保持您的修正版 22 不变)
    let html = `
        <html>
        <head>
            <title>学生个体报告</title>
            <style>
                /*    (Bug Fix)    
                   (将关键布局样式内置，防止加载延迟) 
                */
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .student-card {
                    display: grid;
                    /*    修复 2    强制5列布局 */
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    padding: 20px;
                    border: 1px solid #EEE;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .student-card div {
                    padding: 10px;
                    border-radius: 8px;
                }
                .student-card div span { display: block; font-size: 0.9em; color: #6c757d; }
                .student-card div strong { font-size: 1.5em; color: #333; }
                
                /* (复制 style.css 中的颜色定义) */
                .student-card .sc-name { background-color: rgba(0, 123, 255, 0.1); }
                .student-card .sc-name strong { color: #007bff; }
                .student-card .sc-id { background-color: rgba(108, 117, 125, 0.1); }
                .student-card .sc-id strong { color: #6c757d; }
                .student-card .sc-total { background-color: rgba(40, 167, 69, 0.1); }
                .student-card .sc-total strong { color: #28a745; }
                .student-card .sc-rank { background-color: rgba(253, 126, 20, 0.1); }
                .student-card .sc-rank strong { color: #fd7e14; }
                .student-card .sc-grade-rank { background-color: rgba(111, 66, 193, 0.1); }
                .student-card .sc-grade-rank strong { color: #6f42c1; }
                
                .progress { color: #00a876 !important; }
                .regress { color: #e53935 !important; }
                
                .table-container { width: 100%; margin-top: 15px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { 
                    border: 1px solid #999; 
                    padding: 10px; 
                    text-align: center; 
                    font-size: 0.9em;
                }
                th { background-color: #f0f0f0; }
                /*    关键样式结束    */


                /* --- 打印机设置 --- */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 2cm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        /*    修复 1    移除了 padding-top: 130px; */
                    }
                    
                    /*    修复 1    移除了 .print-header-fixed 规则 */
                    
                    .print-header-preview {
                        /*    修复 1    让它在打印时显示 */
                        display: block !important;
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .print-page-break {
                        page-break-before: always;
                    }
                    .print-page-container {
                        box-shadow: none;
                        margin: 0;
                        padding: 0;
                        width: auto;
                        min-height: auto;
                    }
                    .student-card {
                        box-shadow: none;
                        border: 1px solid #ccc;
                    }
                }
                
                /* --- 打印预览设置 --- */
                @media screen {
                    body {
                        background-color: #EEE;
                    }
                    .print-header-fixed {
                        /* (这个在预览时也不需要了) */
                        display: none;
                    }
                    .print-page-container {
                        background-color: #FFF;
                        width: 210mm;
                        min-height: 297mm;
                        margin: 20px auto;
                        padding: 2cm;
                        box-shadow: 0 0 10px rgba(0,0,0,0.2);
                        box-sizing: border-box;
                    }
                    .print-header-preview {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                }
            </style>
        </head>
        <body>
            
            <main class="print-content-wrapper">
    `;

    // 3. 循环生成每个学生的报告
    for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        const student = G_StudentsData.find(s => String(s.id) === String(studentId));
        if (!student) continue;

        const pageBreakClass = (i === 0) ? '' : 'print-page-break';

        html += `
            <div class="print-page-container ${pageBreakClass}">
            
                <div class="print-header-preview">
                    ${headerHtml}
                </div>

                ${generateStudentReportHTML(student)}

            </div>
        `;
    }

    // 4. 关闭 HTML
    html += `
            </main>
        </body>
        </html>
    `;

    // 5. 打开  窗口并打印 (保持1秒延迟)
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

/**
 * 2. [打印引擎-辅助] 为单个学生生成报告的 HTML
 * (这是 renderStudent 中 showReport 的无图表、返回字符串版本)
 * @param {Object} student - 要打印的学生对象
 * @returns {string} - 该学生报告的 HTML
 */
/**
 * (修改后) 2. [打印引擎-辅助] 为单个学生生成报告的 HTML
 *    最终同步版 - 支持隐藏排名   
 */
function generateStudentReportHTML(student) {
    if (!student) return '';

    // [    ] 掩码辅助函数 (与界面保持一致)
    const maskRank = (val) => window.G_HideRank ? '***' : val;
    const maskDiff = (diffVal, diffText) => window.G_HideRank ? '' : (diffVal !== 'N/A' ? diffText : '');

    // 1. 查找对比数据
    let oldStudent = null;
    let scoreDiff = 'N/A', rankDiff = 'N/A', gradeRankDiff = 'N/A';

    if (G_CompareData && G_CompareData.length > 0) {
        oldStudent = G_CompareData.find(s => String(s.id) === String(student.id));
    }

    if (oldStudent) {
        scoreDiff = (student.totalScore - oldStudent.totalScore).toFixed(2);
        rankDiff = oldStudent.rank - student.rank;
        gradeRankDiff = (oldStudent.gradeRank && student.gradeRank) ? oldStudent.gradeRank - student.gradeRank : 'N/A';
    }

    // 2. 生成学生卡片 HTML
    // 注意：排名的显示应用了 maskRank 和 maskDiff
    const cardHtml = `
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
    `;

    // 3. 生成表格行 HTML
    const tableRowsHtml = G_DynamicSubjectList.map(subject => {
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

        const config = G_SubjectConfigs[subject] || {};
        const isAssignedSubject = config.isAssigned === true;
        let rankBasedScoreDisplay = '';

        if (isAssignedSubject) {
            const allScoresForSubject = G_StudentsData.map(s => s.scores[subject]);
            const fujianScore = calculateFujianAssignedScore(student.scores[subject], allScoresForSubject);
            rankBasedScoreDisplay = `<div style="font-size:0.85em; color:#6f42c1; margin-top:4px; font-weight:bold;">赋分: ${fujianScore}</div>`;
        } else {
            rankBasedScoreDisplay = `<div style="font-size:0.8em; color:#aaa; margin-top:4px;">(原始分)</div>`;
        }

        const tScore = (student.tScores && student.tScores[subject]) ? student.tScores[subject] : 'N/A';
        let tScoreDiffHtml = '';

        if (oldStudent && oldStudent.tScores && oldStudent.tScores[subject]) {
            const oldTScore = oldStudent.tScores[subject];
            if (tScore !== 'N/A' && oldTScore !== undefined && oldTScore !== null) {
                const diff = tScore - oldTScore;
                const diffAbs = Math.abs(diff).toFixed(1);
                if (diff > 0) tScoreDiffHtml = `<span class="progress" style="font-size:0.9em; margin-left:4px;">(▲${diffAbs})</span>`;
                else if (diff < 0) tScoreDiffHtml = `<span class="regress" style="font-size:0.9em; margin-left:4px;">(▼${diffAbs})</span>`;
            }
        }

        // 表格中的排名也应用 Mask 逻辑
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
    }).join('');

    const tableHtml = `
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
                    ${tableRowsHtml}
                </tbody>
            </table>
        </div>
    `;

    return cardHtml + tableHtml;
}


// =====================================================================
//    NEW (Feature)    模块十三：打印引擎 (One Button 完整版)
// =====================================================================

/**
 * [修复版] 13.18. 启动“小题分析-学生诊断表”的打印作业
 * - 修复：同时计算“知识点统计”和“小题统计”
 * - 解决：打印报告中“层均得分率”和“偏差”显示 N/A 的问题
 */
function startItemDetailPrintJob() {
    // 1. 找到打印按钮自己
    const printBtn = document.getElementById('item-print-btn');
    if (!printBtn) {
        alert("打印按钮未找到！");
        return;
    }

    // 2. 检查按钮的模式
    const target = printBtn.dataset.printTarget;
    let studentIdsToPrint = [];

    if (target === 'current') {
        const studentId = printBtn.dataset.studentId;
        if (studentId) studentIdsToPrint = [studentId];
    } else {
        // 模式B: 打印当前筛选的列表 (从 DOM 或 缓存读取)
        // 如果 G_ItemOutlierList 为空，说明还没计算过，需要先计算
        if (!G_ItemOutlierList || G_ItemOutlierList.length === 0) {
             // 尝试根据筛选条件现场计算名单
             // (为了代码简洁，这里建议用户先看表再打印，或者复用下方逻辑)
             // 如果这里为空，下面的逻辑会重新计算一遍
        } else {
             studentIdsToPrint = G_ItemOutlierList.map(s => s.id);
        }
    }

    if (studentIdsToPrint.length === 0) {
        // 如果全局列表为空，尝试从筛选条件全量计算
        // (下面的逻辑会覆盖这种情况)
    }

    if (studentIdsToPrint.length > 20 && !confirm(`即将打印 ${studentIdsToPrint.length} 份报告，是否继续？`)) {
        return;
    }

    // 3. 获取所有计算所需的上下文
    const subjectName = document.getElementById('item-subject-select').value;
    const selectedClass = document.getElementById('item-class-filter').value;
    const numGroups = parseInt(document.getElementById('item-layer-groups').value);
    const questionType = document.getElementById('item-outlier-type-filter').value;

    // 4. 获取筛选后的学生
    const allStudents = G_ItemAnalysisData[subjectName]?.students || [];
    const filteredStudents = (selectedClass === 'ALL')
        ? allStudents
        : allStudents.filter(s => s.class === selectedClass);

    if (filteredStudents.length === 0) {
        alert("当前筛选范围内无学生数据。");
        return;
    }

    // ============================================================
    // 🔥🔥🔥 核心修复区域 🔥🔥🔥
    // ============================================================
    
    const recalculatedStats = getRecalculatedItemStats(subjectName);

    // A. 计算【知识点】统计 (目的是为了获得 studentsWithRates 和 计算分层归属)
    const knowledgeResult = calculateLayeredKnowledgeStats(subjectName, numGroups, filteredStudents, questionType);
    
    // B. 计算【小题】统计 (这是打印表中 "层均得分率" 真正需要的数据源！)
    const itemResult = calculateLayeredItemStats(subjectName, numGroups, filteredStudents);

    // C. 重新生成一份临时的 OutlierList，确保能找到每个学生对应的层级 (G1/G2...)
    // (必须用 knowledgeResult 来生成，因为分层逻辑在那里)
    const tempOutlierList = calculateStudentKnowledgeOutliers(
        subjectName, 
        numGroups, 
        knowledgeResult.groupStats, 
        knowledgeResult.knowledgePoints, 
        knowledgeResult.studentsWithRates, 
        questionType
    );

    // 如果之前没选中学生，默认打印所有筛选出的学生
    if (studentIdsToPrint.length === 0) {
        studentIdsToPrint = tempOutlierList.map(s => s.id);
    }
    
    if (studentIdsToPrint.length === 0) {
         alert("没有可打印的学生。"); return;
    }
    // ============================================================

    // 6. 构建打印 HTML
    let html = `
        <html>
        <head>
            <title>${subjectName} - 学生知识点诊断</title>
            <style>
                body { font-family: "Segoe UI", sans-serif; padding: 2cm; color: #333; }
                .print-page-container { padding: 0; page-break-after: always; }
                .table-container { width: 100%; margin-top: 15px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { border: 1px solid #999; padding: 8px; text-align: center; }
                th { background-color: #f0f0f0; }
                .progress { color: #00a876 !important; font-weight: bold; }
                .regress { color: #e53935 !important; font-weight: bold; }
                @media print { 
                    .print-page-break { page-break-before: always; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <main class="print-content-wrapper">
    `;

    // 7. 循环生成
    let printedCount = 0;
    for (let i = 0; i < studentIdsToPrint.length; i++) {
        const studentId = studentIdsToPrint[i];

        // 找到学生对象 (用 knowledgeResult 里的，因为包含了一些预计算属性，或者直接用 filteredStudents 也可以)
        const student = knowledgeResult.studentsWithRates.find(s => String(s.id) === String(studentId));
        
        // 找到学生的分层 (从 tempOutlierList 找)
        const outlierData = tempOutlierList.find(s => String(s.id) === String(studentId));

        if (!student || !outlierData) continue;

        const studentLayer = outlierData.layer; // e.g., "G1", "G8"
        const pageBreakClass = (printedCount === 0) ? '' : 'print-page-break';

        html += `
            <div class="print-page-container ${pageBreakClass}">
                ${generateItemDetailReportHTML(
                    student, 
                    studentLayer, 
                    subjectName, 
                    questionType, 
                    itemResult.groupStats, // ✅ 修复：传入小题维度的层级统计数据
                    recalculatedStats
                )}
            </div>
        `;
        printedCount++;
    }

    html += `</main></body></html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 1000);
}


/**
 * 13.19.    (打印辅助函数) 生成单个学生的诊断报告HTML
 * (这是 drawItemStudentDetailTable 的 "返回字符串" 版本)
 * @returns {string} - 该学生报告的 HTML
 */
function generateItemDetailReportHTML(student, studentLayer, subjectName, questionType, groupStats, recalculatedStats) {
    // 1. 获取上下文
    const studentName = student.name;
    const typeText = (questionType === 'minor') ? ' (仅小题)' : (questionType === 'major') ? ' (仅大题)' : ' (全部题目)';

    // 2. 获取层均分
    const layerAvgRates = groupStats[studentLayer];

    // 3. 获取题目满分
    const { minorStats, majorStats, minorQuestions, majorQuestions } = recalculatedStats;

    if (!layerAvgRates) {
        return `<h4>${studentName} - 无法计算 ${studentLayer} 的层级平均数据。</h4>`;
    }

    // 4. 遍历所有题目，计算偏差
    const allQuestionDetails = [];
    const processQuestion = (qName, stat, studentScore) => {
        if (!stat) return;
        const fullScore = stat.manualFullScore || stat.maxScore;
        const studentRate = (fullScore > 0 && typeof studentScore === 'number') ? (studentScore / fullScore) : null;
        const layerRate = layerAvgRates[qName];
        const deviation = (studentRate !== null && typeof layerRate === 'number') ? (studentRate - layerRate) : null;
        const kp = (G_ItemAnalysisConfig[subjectName] && G_ItemAnalysisConfig[subjectName][qName]) ? G_ItemAnalysisConfig[subjectName][qName].content : '';

        allQuestionDetails.push({
            qName: qName,
            kp: kp || 'N/A',
            studentScore: studentScore ?? 'N/A',
            fullScore: fullScore,
            studentRate: studentRate,
            layerRate: layerRate,
            deviation: deviation
        });
    };

    if (questionType === 'all' || questionType === 'minor') {
        (minorQuestions || []).forEach(qName => {
            processQuestion(qName, minorStats[qName], student.minorScores[qName]);
        });
    }
    if (questionType === 'all' || questionType === 'major') {
        (majorQuestions || []).forEach(qName => {
            processQuestion(qName, majorStats[qName], student.majorScores[qName]);
        });
    }

    // 5. 排序 (打印时默认按“短板”排序)
    allQuestionDetails.sort((a, b) => {
        const valA = (a.deviation === null) ? Infinity : a.deviation;
        const valB = (b.deviation === null) ? Infinity : b.deviation;
        return valA - valB;
    });

    // 6. 渲染表格
    let tableHtml = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>题号</th>
                        <th>知识点</th>
                        <th>学生得分</th>
                        <th>满分</th>
                        <th>学生得分率</th>
                        <th>层均得分率</th>
                        <th>得分率偏差</th>
                    </tr>
                </thead>
                <tbody>
                    ${allQuestionDetails.map(q => `
                        <tr>
                            <td><strong>${q.qName}</strong></td>
                            <td>${q.kp}</td>
                            <td>${q.studentScore}</td>
                            <td>${q.fullScore}</td>
                            <td>${q.studentRate !== null ? (q.studentRate * 100).toFixed(1) + '%' : 'N/A'}</td>
                            <td>${(q.layerRate !== null && q.layerRate !== undefined) ? (q.layerRate * 100).toFixed(1) + '%' : 'N/A'}</td>
                            <td>
                                ${(q.deviation !== null && q.deviation !== undefined)
            ? (q.deviation > 0
                ? `<strong class="progress">▲ ${(q.deviation * 100).toFixed(1)}%</strong>`
                : (q.deviation < 0
                    ? `<strong class="regress">▼ ${(q.deviation * 100).toFixed(1)}%</strong>`
                    : `0.0%`))
            : 'N/A'
        }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // 7. 渲染页眉
    let headerHtml = `
        <div class="print-header" style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
            <h2>${subjectName} - 学生知识点诊断</h2>
            <p style="text-align: left; margin: 5px 0;"><strong>学生:</strong> ${studentName} (${studentLayer}层)</p>
            <p style="text-align: left; margin: 5px 0;"><strong>题目范围:</strong> ${typeText}</p>
        </div>
    `;

    return headerHtml + tableHtml;
}

if (typeof window !== 'undefined') {
    window.renderItemAnalysis = renderItemAnalysis;
}

