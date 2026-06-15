/**
 * ClarificationInput - 澄清问题输入组件
 * 
 * 展示 Brainstorm 阶段的澄清问题，支持：
 * - 问题上下文说明
 * - 单选/多选选项
 * - 跳过问题
 * - 提交答案
 */

import React, { useState, useCallback } from 'react';
import { ClarificationQuestion } from '../mcp/types';
import { OptionSelector } from './OptionSelector';

interface ClarificationInputProps {
  question: ClarificationQuestion;
  onSubmit: (selectedIds: string[]) => void;
  onSkip: () => void;
  disabled?: boolean;
}

export const ClarificationInput: React.FC<ClarificationInputProps> = ({
  question,
  onSubmit,
  onSkip,
  disabled = false
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedIds.length === 0) return;
    onSubmit(selectedIds);
  }, [selectedIds, onSubmit]);

  const canSubmit = selectedIds.length > 0;

  return (
    <div className="clarification-input">
      {/* 头部 */}
      <div className="clarification-header">
        <div className="header-left">
          <span className="question-badge">
            问题 #{question.id.slice(-4)}
          </span>
        </div>
        {question.context && (
          <button 
            className="info-btn"
            onClick={() => setShowExplanation(!showExplanation)}
          >
            ?
          </button>
        )}
      </div>
      
      {/* 问题内容 */}
      <div className="clarification-content">
        <h3 className="question-text">{question.question}</h3>
        
        {showExplanation && question.context && (
          <div className="context-explanation">
            <strong>为什么需要问这个问题？</strong>
            <p>{question.context}</p>
          </div>
        )}
        
        {!question.multiSelect && (
          <p className="hint">请选择一个选项</p>
        )}
        {question.multiSelect && (
          <p className="hint">可选择多个选项</p>
        )}
      </div>
      
      {/* 选项选择器 */}
      <div className="options-container">
        <OptionSelector
          options={question.options}
          multiSelect={question.multiSelect || false}
          selectedIds={selectedIds}
          onSelectionChange={handleSelect}
          disabled={disabled}
        />
      </div>
      
      {/* 操作按钮 */}
      <div className="clarification-actions">
        <button 
          className="btn btn-secondary"
          onClick={onSkip}
          disabled={disabled}
        >
          跳过
        </button>
        <button 
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || disabled}
        >
          确认选择
        </button>
      </div>
    </div>
  );
};

export default ClarificationInput;
