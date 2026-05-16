import React, { useState, useCallback } from 'react';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import { useTranslation } from 'react-i18next';
import './index.scss';

export interface CountdownButtonProps extends ButtonProps {
  /** 倒计时时长（秒） */
  duration?: number;
  /** 点击发送验证码的回调 */
  onSendCode?: () => Promise<boolean> | boolean;
  /** 是否自动开始倒计时 */
  autoStart?: boolean;
  /** 倒计时结束后的文本 */
  defaultText?: string;
  /** 倒计时进行中的文本模板 */
  countingText?: string;
}

/**
 * 倒计时按钮组件
 * 用于发送验证码场景
 */
const CountdownButton: React.FC<CountdownButtonProps> = ({
  duration = 60,
  onSendCode,
  autoStart = false,
  defaultText,
  countingText,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isCounting, setIsCounting] = useState(autoStart);

  // 开始倒计时
  const startCountdown = useCallback(() => {
    setIsCounting(true);
    setCountdown(duration);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCounting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration]);

  // 处理点击事件
  const handleClick = async () => {
    if (isCounting || loading || disabled) {
      return;
    }

    if (onSendCode) {
      setLoading(true);
      try {
        const result = await onSendCode();
        setLoading(false);
        if (result) {
          startCountdown();
        }
      } catch {
        setLoading(false);
      }
    } else {
      startCountdown();
    }
  };

  // 获取按钮文本
  const getButtonText = () => {
    if (isCounting) {
      const template = countingText || '{{seconds}}s';
      return template.replace('{{seconds}}', countdown.toString());
    }
    if (defaultText) {
      return defaultText;
    }
    return children || t('common.sendCode');
  };

  return (
    <Button
      className={`countdown-button ${className}`}
      onClick={handleClick}
      disabled={disabled || isCounting}
      loading={loading}
      {...props}
    >
      {getButtonText()}
    </Button>
  );
};

export default CountdownButton;