/**
 * OptionSelector - 选项选择器组件
 * 
 * 展示 Brainstorm 阶段的澄清选项，支持：
 * - 单选/多选
 * - 选项对比（成本、复杂度）
 * - 选项影响说明
 * - 禁用状态
 */

import React, { useState, useCallback } from 'react';
import { ClarificationOption } from '../mcp/types';

interface OptionSelectorProps {
  options: ClarificationOption[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  multiSelect?: boolean;
  disabled?: boolean;
}

// 成本颜色
const getCostColor = (cost: string): string => {
  switch (cost) {
    case 'low': return '#d4edda';
    case 'medium': return '#fff3cd';
    case 'high': return '#f8d7da';
    default: return '#e0e0e0';
  }
};

// 复杂度颜色
const getComplexityColor = (complexity: string): string => {
  switch (complexity) {
    case 'simple': return '#d4edda';
    case 'moderate': return '#fff3cd';
    case 'complex': return '#f8d7da';
    default: return '#e0e0e0';
  }
};

// 时间颜色
const getTimeColor = (time: string): string => {
  switch (time) {
    case 'short': return '#d4edda';
    case 'medium': return '#fff3cd';
    case 'long': return '#f8d7da';
    default: return '#e0e0e0';
  }
};

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  options,
  selectedIds,
  onSelectionChange,
  multiSelect = false,
  disabled = false
}) => {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const handleSelect = useCallback((optionId: string) => {
    if (disabled) return;

    if (multiSelect) {
      // 多选模式
      const isSelected = selectedIds.includes(optionId);
      const newSelectedIds = isSelected
        ? selectedIds.filter(id => id !== optionId)
        : [...selectedIds, optionId];
      onSelectionChange(newSelectedIds);
    } else {
      // 单选模式
      const isSelected = selectedIds.includes(optionId);
      onSelectionChange(isSelected ? [] : [optionId]);
    }
  }, [selectedIds, multiSelect, disabled, onSelectionChange]);

  const isSelected = (optionId: string): boolean => {
    return selectedIds.includes(optionId);
  };

  if (options.length === 0) {
    return (
      <div className="option-selector empty">
        <p>暂无选项</p>
      </div>
    );
  }

  return (
    <div className="option-selector">
      {options.map(option => {
        const selected = isSelected(option.id);
        const isDisabled = option.disabled || disabled;

        return (
          <div
            key={option.id}
            className={`option-item ${selected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={() => handleSelect(option.id)}
            onMouseEnter={() => setHoveredOption(option.id)}
            onMouseLeave={() => setHoveredOption(null)}
          >
            {/* 选项主体 */}
            <div className="option-main">
              <div className="option-label">
                {selected && <span className="checkmark">✓</span>}
                <span>{option.label}</span>
              </div>

              {option.description && (
                <div className="option-description">
                  {option.description}
                </div>
              )}
            </div>
            
            {/* 元数据标签 */}
            <div className="option-tags">
              {option.cost && (
                <span 
                  className="tag cost-tag"
                  style={{ background: getCostColor(option.cost) }}
                >
                  {option.cost === 'low' ? '低成本' : option.cost === 'medium' ? '中等成本' : '高成本'}
                </span>
              )}
              {option.complexity && (
                <span 
                  className="tag complexity-tag"
                  style={{ background: getComplexityColor(option.complexity) }}
                >
                  {option.complexity === 'simple' ? '简单' : option.complexity === 'moderate' ? '中等' : '复杂'}
                </span>
              )}
              {option.time && (
                <span 
                  className="tag time-tag"
                  style={{ background: getTimeColor(option.time) }}
                >
                  {option.time === 'short' ? '快速' : option.time === 'medium' ? '中等时间' : '较长时间'}
                </span>
              )}
            </div>
            
            {/* Hover 时显示详细信息 */}
            {hoveredOption === option.id && !isDisabled && (
              <div className="option-tooltip">
                <div className="tooltip-header">
                  选择 "{option.label}"
                </div>
                <div className="tooltip-content">
                  {option.implications && option.implications.length > 0 && (
                    <div className="implications">
                      <span className="label">影响:</span>
                      <ul>
                        {option.implications.map((imp, index) => (
                          <li key={index}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button 
                    className="tooltip-action"
                    onClick={() => handleSelect(option.id)}
                  >
                    {selected ? '取消选择' : '选择此选项'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OptionSelector;
