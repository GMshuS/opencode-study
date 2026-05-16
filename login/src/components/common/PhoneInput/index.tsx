import React from 'react';
import { Input, Select } from 'antd';
import type { InputProps } from 'antd';
import './index.scss';

export interface PhoneInputProps extends Omit<InputProps, 'prefix'> {
  /** 输入框尺寸 */
  size?: 'large' | 'middle' | 'small';
  /** 是否显示区号选择器 */
  showAreaCode?: boolean;
  /** 默认区号 */
  defaultAreaCode?: string;
  /** 区号选项 */
  areaCodes?: { value: string; label: string }[];
  /** 区号变更回调 */
  onAreaCodeChange?: (code: string) => void;
}

// 国家/地区区号配置
const defaultAreaCodes = [
  { value: '+86', label: '+86 中国' },
  { value: '+852', label: '+852 香港' },
  { value: '+853', label: '+853 澳门' },
  { value: '+886', label: '+886 台湾' },
  { value: '+1', label: '+1 美国' },
  { value: '+44', label: '+44 英国' },
  { value: '+81', label: '+81 日本' },
  { value: '+82', label: '+82 韩国' },
];

/**
 * 手机号输入框组件
 * 支持带区号选择
 */
const PhoneInput: React.FC<PhoneInputProps> = ({
  size = 'middle',
  showAreaCode = true,
  defaultAreaCode = '+86',
  areaCodes = defaultAreaCodes,
  onAreaCodeChange,
  className = '',
  ...props
}) => {
  const [areaCode, setAreaCode] = React.useState(defaultAreaCode);

  const handleAreaCodeChange = (value: string) => {
    setAreaCode(value);
    onAreaCodeChange?.(value);
  };

  return (
    <Input.Group compact className={`phone-input ${className}`}>
      {showAreaCode && (
        <Select
          className="phone-input-area-code"
          value={areaCode}
          onChange={handleAreaCodeChange}
          options={areaCodes}
          size={size}
        />
      )}
      <Input
        className="phone-input-number"
        size={size}
        {...props}
      />
    </Input.Group>
  );
};

export default PhoneInput;