/**
 * Brainstorm Panel - Brainstorm 面板
 * 
 * 管理整个 Brainstorm 流程的主面板
 */

import React, { useState } from 'react';
import { ClarificationQuestion, BrainstormState } from '../brainstorm/types';
import { ClarificationSession } from '../mcp/types';
import { ClarificationInput } from './ClarificationInput';

interface BrainstormPanelProps {
  session: ClarificationSession | null;
  state: BrainstormState;
  pendingQuestions: ClarificationQuestion[];
  onAnswer: (questionId: string, selectedOptionIds: string[]) => void;
  onSkip: (questionId: string) => void;
  onComplete: () => void;
  onClose: () => void;
}

export const BrainstormPanel: React.FC<BrainstormPanelProps> = ({
  session,
  state,
  pendingQuestions,
  onAnswer,
  onSkip,
  onComplete,
  onClose
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // 计算进度
  const totalQuestions = session?.questions.length || 0;
  const answeredQuestions = session?.questions.filter(q => q.status === 'answered').length || 0;
  const skippedQuestions = session?.questions.filter(q => q.status === 'skipped').length || 0;
  const progress = totalQuestions > 0 
    ? Math.round(((answeredQuestions + skippedQuestions) / totalQuestions) * 100)
    : 0;
  
  // 获取当前问题
  const currentQuestion = pendingQuestions[currentQuestionIndex];
  
  // 检查是否完成
  const isComplete = pendingQuestions.length === 0 && answeredQuestions > 0;
  
  const handleAnswer = (selectedOptionIds: string[]) => {
    if (currentQuestion) {
      onAnswer(currentQuestion.id, selectedOptionIds);
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const handleSkip = () => {
    if (currentQuestion) {
      onSkip(currentQuestion.id);
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const getStateLabel = (state: BrainstormState): string => {
    const labels: Record<BrainstormState, string> = {
      INIT: '初始化',
      ANALYZE: '分析需求',
      CLARIFY: '澄清问题',
      BUILD: '构建图',
      GENERATE: '生成代码'
    };
    return labels[state] || state;
  };
  
  const getStateColor = (state: BrainstormState): string => {
    const colors: Record<BrainstormState, string> = {
      INIT: '#6b7280',
      ANALYZE: '#3b82f6',
      CLARIFY: '#f59e0b',
      BUILD: '#10b981',
      GENERATE: '#8b5cf6'
    };
    return colors[state] || '#6b7280';
  };
  
  return (
    <div className="brainstorm-panel">
      {/* 头部 */}
      <div className="brainstorm-header">
        <div className="header-title">
          <h2>Brainstorm</h2>
          <span 
            className="state-badge"
            style={{ background: getStateColor(state) }}
          >
            {getStateLabel(state)}
          </span>
        </div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      {/* 进度条 */}
      <div className="brainstorm-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text">
          <span>{answeredQuestions + skippedQuestions}/{totalQuestions}</span>
          <span>{progress}%</span>
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="brainstorm-stats">
        <div className="stat-item">
          <span className="stat-value">{answeredQuestions}</span>
          <span className="stat-label">已回答</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{skippedQuestions}</span>
          <span className="stat-label">已跳过</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{pendingQuestions.length}</span>
          <span className="stat-label">待回答</span>
        </div>
      </div>
      
      {/* 问题内容 */}
      <div className="brainstorm-content">
        {isComplete ? (
          // 完成状态
          <div className="completion-screen">
            <div className="completion-icon">✓</div>
            <h3>澄清完成！</h3>
            <p>所有问题已回答，可以开始生成代码。</p>
            <div className="completion-actions">
              <button className="btn btn-primary" onClick={onComplete}>
                生成代码
              </button>
              <button className="btn btn-secondary" onClick={onClose}>
                稍后再说
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          // 问题展示
          <ClarificationInput
            question={currentQuestion}
            onSubmit={handleAnswer}
            onSkip={handleSkip}
          />
        ) : (
          // 加载状态
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>正在分析需求...</p>
          </div>
        )}
      </div>
      
      {/* 问题导航 */}
      {pendingQuestions.length > 1 && (
        <div className="question-nav">
          <button 
            className="nav-btn"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            ← 上一题
          </button>
          <span className="nav-info">
            {currentQuestionIndex + 1} / {pendingQuestions.length}
          </span>
          <button 
            className="nav-btn"
            onClick={() => setCurrentQuestionIndex(prev => Math.min(pendingQuestions.length - 1, prev + 1))}
            disabled={currentQuestionIndex === pendingQuestions.length - 1}
          >
            下一题 →
          </button>
        </div>
      )}
      
      {/* 问题列表预览 */}
      <div className="question-preview">
        <h4>问题列表</h4>
        <div className="question-list">
          {session?.questions.map((q, index) => (
            <div 
              key={q.id}
              className={`question-item ${q.status}`}
            >
              <span className="question-index">{index + 1}</span>
              <span className="question-text">{q.question}</span>
              <span className="question-status">
                {q.status === 'answered' ? '✓' : 
                 q.status === 'skipped' ? '⊘' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
