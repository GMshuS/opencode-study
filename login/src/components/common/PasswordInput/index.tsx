import React, { useState } from 'react';
import { Input, InputProps } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import './index.scss';

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  /** 输入框尺寸 */
  size?: 'large' | 'middle' | 'small';
  /** 是否显示切换密码可见性按钮 */
  toggleVisibility?: boolean;
}

/**
 * 密码输入框组件
 * 支持显示/隐藏密码切换
 */
const PasswordInput: React.FC<PasswordInputProps> = ({
  size = 'middle',
  toggleVisibility = true,
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <Input.Password
      className={`password-input ${className}`}
      size={size}
      iconRender={(visible) =>
        visible ? (
          <EyeOutlined onClick={handleToggleVisibility} />
        ) : (
          <EyeInvisibleOutlined onClick={handleToggleVisibility} />
        )
      }
      {...props}
    />
  );
};

export default PasswordInput;