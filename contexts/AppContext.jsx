import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [studentsData, setStudentsData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [compareStatistics, setCompareStatistics] = useState({});
  const [dynamicSubjectList, setDynamicSubjectList] = useState([]);
  const [subjectConfigs, setSubjectConfigs] = useState({});
  const [currentClassFilter, setCurrentClassFilter] = useState('ALL');
  const [currentExamId, setCurrentExamId] = useState(null);
  const [loading, setLoading] = useState(false);

  // 从 API 加载考试数据
  const loadExamData = async (examId) => {
    if (!examId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/data`);
      if (res.ok) {
        const data = await res.json();
        setStudentsData(data.students || []);
        setDynamicSubjectList(data.subjects || []);
        setCurrentExamId(examId);
        
        // 计算统计数据（需要调用统计函数）
        // 这里暂时留空，后续会实现
      }
    } catch (err) {
      console.error('加载考试数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 根据班级筛选数据
  const getFilteredData = () => {
    if (currentClassFilter === 'ALL') {
      return studentsData;
    }
    return studentsData.filter(s => s.class === currentClassFilter);
  };

  // 获取班级列表
  const getClassList = () => {
    const classes = new Set(studentsData.map(s => s.class).filter(Boolean));
    return Array.from(classes).sort();
  };

  const value = {
    // 数据
    studentsData,
    compareData,
    statistics,
    compareStatistics,
    dynamicSubjectList,
    subjectConfigs,
    currentClassFilter,
    currentExamId,
    loading,
    
    // 方法
    setStudentsData,
    setCompareData,
    setStatistics,
    setCompareStatistics,
    setDynamicSubjectList,
    setSubjectConfigs,
    setCurrentClassFilter,
    setCurrentExamId,
    loadExamData,
    getFilteredData,
    getClassList,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

