import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './index.scss';

/**
 * 密码强度指示组件
 */
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const { t } = useTranslation();

  // 计算密码强度
  const { level, label } = useMemo(() => {
    if (!password) {
      return { level: '', label: '' };
    }

    let score = 0;

    // 长度检查
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;

    // 包含数字
    if (/\d/.test(password)) score++;

    // 包含小写字母
    if (/[a-z]/.test(password)) score++;

    // 包含大写字母
    if (/[A-Z]/.test(password)) score++;

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 2) {
      return { level: 'weak', label: t('register.strengthWeak') };
    }
    if (score <= 4) {
      return { level: 'medium', label: t('register.strengthMedium') };
    }
    return { level: 'strong', label: t('register.strengthStrong') };
  }, [password, t]);

  // 如果密码为空，不显示
  if (!password) {
    return null;
  }

  return (
    <div className="password-strength">
      <div className="password-strength-label">
        <span>{t('register.passwordStrength')}</span>
        <span className={`strength-text level-${level}`}>{label}</span>
      </div>
      <div className="password-strength-bar">
        {['weak', 'medium', 'strong'].map((item) => (
          <div
            key={item}
            className={`strength-segment segment-${item} ${
              (level === 'weak' && item === 'weak') ||
              (level === 'medium' && (item === 'weak' || item === 'medium')) ||
              (level === 'strong' && item !== '')
                ? 'active'
                : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;