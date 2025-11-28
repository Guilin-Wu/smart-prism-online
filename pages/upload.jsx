import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('仅支持 Excel 文件 (.xlsx, .xls)');
        return;
      }
      setFile(selectedFile);
      setError('');
      // 自动填充考试名称
      if (!examName) {
        setExamName(selectedFile.name.replace(/\.(xlsx|xls)$/i, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('请选择文件');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('examName', examName || file.name);
      if (examDate) {
        formData.append('examDate', examDate);
      }

      const res = await fetch('/api/exams/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '上传失败');
        return;
      }

      setSuccess('上传成功！');
      setTimeout(() => {
        router.push(`/dashboard?examId=${data.examId}`);
      }, 1500);
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>上传数据 - 智慧棱镜系统</title>
      </Head>
      <div className="upload-container">
        <div className="upload-card">
          <h1>上传考试数据</h1>
          <p className="upload-description">
            请上传 Excel 格式的考试成绩文件。文件应包含学号、姓名、班级、各科成绩等列。
          </p>

          <form onSubmit={handleSubmit} className="upload-form">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
              <label htmlFor="file">选择文件 *</label>
              <input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                required
              />
              {file && (
                <div className="file-info">
                  已选择: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="examName">考试名称</label>
              <input
                id="examName"
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="例如：2024年第一次月考"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="examDate">考试日期</label>
              <input
                id="examDate"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="submit-button" disabled={loading || !file}>
              {loading ? '上传中...' : '上传'}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .upload-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          padding: 20px;
        }

        .upload-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 40px;
          width: 100%;
          max-width: 600px;
        }

        .upload-card h1 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .upload-description {
          color: #666;
          margin: 0 0 30px 0;
          line-height: 1.6;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .form-group input[type="file"] {
          padding: 12px;
          border: 2px dashed #ddd;
          border-radius: 6px;
          cursor: pointer;
        }

        .form-group input[type="file"]:hover {
          border-color: #667eea;
        }

        .form-group input[type="text"],
        .form-group input[type="date"] {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .file-info {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }

        .error-message {
          background-color: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .success-message {
          background-color: #efe;
          color: #3c3;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .submit-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}

