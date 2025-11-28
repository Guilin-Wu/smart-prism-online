/* eslint-disable no-undef */
'use strict';

/**
 * Excel 数据解析模块
 * 处理 Excel/CSV 文件的解析和数据转换
 */

/**
 * 读取 Excel/CSV 文件 (智能解析器 - 动态识别表头行和科目)
 * @param {File} file - 用户上传的Excel或CSV文件对象
 * @returns {Promise<Object>} - 包含 { processedData, dynamicSubjectList } 的对象
 */
export function loadExcelData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // 1. 读取工作簿
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (rawData.length < 2) {
                    return reject(new Error("文件数据不完整，至少需要1行表头和1行数据。"));
                }

                // --- 智能定位表头行 ---
                let keyRowIndex = -1;
                const REQUIRED_METRICS = ["姓名", "班级"];

                for (let i = 0; i < Math.min(rawData.length, 5); i++) {
                    const row = rawData[i].map(String).map(s => s.trim());
                    const foundCount = REQUIRED_METRICS.filter(metric => row.includes(metric)).length;

                    if (foundCount === 2) {
                        keyRowIndex = i;
                        break;
                    }
                }

                if (keyRowIndex === -1) {
                    return reject(new Error("无法自动识别指标行。请确保表头包含 '姓名' 和 '班级' 字段。"));
                }

                const subjectRowIndex = keyRowIndex - 1;
                const studentDataStartRow = keyRowIndex + 1;

                const subjectHeader = (subjectRowIndex >= 0) ?
                    rawData[subjectRowIndex].map(String).map(s => s.trim()) :
                    [];
                const keyHeader = rawData[keyRowIndex].map(String).map(s => s.trim());

                const colMap = {};
                let currentSubject = "";
                const headerLength = keyHeader.length;
                const dynamicSubjectList = [];

                // 核心：动态构建列映射
                for (let i = 0; i < headerLength; i++) {
                    const subject = String(subjectHeader[i] || "").trim();
                    const key = keyHeader[i];

                    // A. 识别固定字段
                    if (key === "自定义考号") { colMap[i] = "id"; continue; }
                    if (key === "姓名") { colMap[i] = "name"; continue; }
                    if (key === "班级") { colMap[i] = "class"; continue; }
                    if (key === "班次") { colMap[i] = "rank"; continue; }
                    if (key === "校次") { colMap[i] = "gradeRank"; continue; }

                    // B. 追踪科目名
                    if (subject !== "") {
                        currentSubject = subject;
                    }

                    // C. 识别总分
                    if (currentSubject === "总分" && key === "得分") {
                        colMap[i] = "totalScore";
                    } else if (key === "总分") {
                        colMap[i] = "totalScore";
                    }
                    // D. 识别各科得分
                    else if (key === "得分" && currentSubject !== "" && currentSubject !== "总分") {
                        colMap[i] = `scores.${currentSubject}`;
                        if (!dynamicSubjectList.includes(currentSubject)) {
                            dynamicSubjectList.push(currentSubject);
                        }
                    } else if (key !== "" &&
                        !["自定义考号", "姓名", "班级", "班次", "校次", "得分", "准考证号", "学生属性", "序号", "校次进退步", "班次进退步"].includes(key) &&
                        !key.includes("总分")) {
                        const subjectName = key;
                        colMap[i] = `scores.${subjectName}`;
                        if (!dynamicSubjectList.includes(subjectName)) {
                            dynamicSubjectList.push(subjectName);
                        }
                    }
                }

                // 校验关键字段
                const requiredKeys = ["name", "class"];
                const foundKeys = Object.values(colMap);
                const missingKeys = requiredKeys.filter(key => !foundKeys.includes(key));

                if (missingKeys.length > 0) {
                    return reject(new Error(`无法自动解析表头。文件缺少关键字段: ${missingKeys.join(', ')}。请确保表头包含 '姓名' 和 '班级'。`));
                }

                // 处理数据行
                const studentRows = rawData.slice(studentDataStartRow);
                const processedData = [];

                for (const row of studentRows) {
                    if (!String(row[Object.keys(colMap)[0]] || "").trim() && !String(row[Object.keys(colMap)[1]] || "").trim()) continue;

                    const student = { scores: {} };

                    for (const colIndex in colMap) {
                        const key = colMap[colIndex];
                        const rawValue = row[colIndex];

                        if (key.startsWith("scores.")) {
                            const subjectName = key.split('.')[1];
                            const cleanScore = parseFloat(rawValue);
                            student.scores[subjectName] = isNaN(cleanScore) ? null : cleanScore;
                        } else if (key === "totalScore") {
                            const cleanTotal = parseFloat(rawValue);
                            student.totalScore = isNaN(cleanTotal) ? null : cleanTotal;
                        } else if (key === "rank" || key === "gradeRank") {
                            const cleanRank = parseInt(rawValue);
                            student[key] = isNaN(cleanRank) ? null : cleanRank;
                        } else {
                            student[key] = String(rawValue || "").trim();
                        }
                    }

                    // 自动计算总分
                    let calculatedTotal = 0;
                    let hasValidScores = false;

                    for (const subject of dynamicSubjectList) {
                        const score = student.scores[subject];
                        if (typeof score === 'number' && !isNaN(score)) {
                            calculatedTotal += score;
                            hasValidScores = true;
                        }
                    }
                    student.totalScore = hasValidScores ? parseFloat(calculatedTotal.toFixed(2)) : null;

                    // ID回退
                    if (!student.id && student.name) {
                        student.id = student.name;
                    }

                    if (student.id) {
                        processedData.push(student);
                    }
                }

                if (processedData.length === 0) {
                    return reject(new Error("文件解析成功，但没有找到有效的学生数据行。"));
                }

                resolve({ processedData: processedData, dynamicSubjectList: dynamicSubjectList });

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
 * 为数据添加单科排名 (班排 & 年排)
 * @param {Array<Object>} studentsData
 * @param {Array<string>} subjectList - 科目列表
 * @returns {Array<Object>}
 */
export function addSubjectRanksToData(studentsData, subjectList) {
    if (!studentsData || studentsData.length === 0) return [];

    const dataWithRanks = [...studentsData];
    const classes = [...new Set(dataWithRanks.map(s => s.class))];

    // 动态扫描所有出现的科目
    const allSubjects = new Set();
    if (subjectList && subjectList.length > 0) {
        subjectList.forEach(s => allSubjects.add(s));
    }
    dataWithRanks.forEach(s => {
        if (s.scores) Object.keys(s.scores).forEach(k => allSubjects.add(k));
    });
    const finalSubjectList = Array.from(allSubjects);

    // 计算年级总分排名 (如果缺失)
    if (!dataWithRanks[0].gradeRank) {
        dataWithRanks.sort((a, b) => (b.totalScore || -Infinity) - (a.totalScore || -Infinity));
        dataWithRanks.forEach((student, index) => { student.gradeRank = index + 1; });
    }

    // 计算班级总分排名 (如果缺失)
    if (!dataWithRanks[0].rank) {
        classes.forEach(className => {
            const classStudents = dataWithRanks.filter(s => s.class === className);
            classStudents.sort((a, b) => (b.totalScore || -Infinity) - (a.totalScore || -Infinity));
            classStudents.forEach((student, index) => { student.rank = index + 1; });
        });
    }

    // 计算单科排名 (年级 & 班级)
    finalSubjectList.forEach(subjectName => {
        const validStudents = dataWithRanks.filter(s => typeof s.scores[subjectName] === 'number');
        validStudents.sort((a, b) => b.scores[subjectName] - a.scores[subjectName]);

        validStudents.forEach((student, index) => {
            if (!student.gradeRanks) student.gradeRanks = {};
            student.gradeRanks[subjectName] = index + 1;
        });

        classes.forEach(className => {
            const classStudents = validStudents.filter(s => s.class === className);
            classStudents.sort((a, b) => b.scores[subjectName] - a.scores[subjectName]);

            classStudents.forEach((student, index) => {
                if (!student.classRanks) student.classRanks = {};
                student.classRanks[subjectName] = index + 1;
            });
        });
    });

    // 恢复默认排序 (按班级总分排名)
    return dataWithRanks.sort((a, b) => a.rank - b.rank);
}

