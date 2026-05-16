import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../common/LanguageSwitcher';
import './index.scss';

export interface AuthLayoutProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 是否显示语言切换器 */
  showLanguageSwitcher?: boolean;
  /** 左侧背景图片 */
  backgroundImage?: string;
  /** 背景色 */
  backgroundColor?: string;
  /** 附加类名 */
  className?: string;
}

/**
 * 认证页面布局组件
 * 包含左右分栏布局：左侧品牌展示，右侧表单
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  showLanguageSwitcher = true,
  backgroundImage,
  backgroundColor,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div className={`auth-layout ${className}`}>
      {/* 语言切换器 */}
      {showLanguageSwitcher && (
        <div className="auth-layout-header">
          <LanguageSwitcher />
        </div>
      )}

      {/* 主内容区域 */}
      <div className="auth-layout-main">
        {/* 左侧品牌展示区 */}
        <div className="auth-layout-left">
          <div
            className="auth-layout-left-content"
            style={{
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
              backgroundColor: backgroundColor || undefined,
            }}
          >
            <div className="auth-layout-brand">
              <div className="auth-layout-logo">
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <rect width="64" height="64" rx="16" fill="#1677ff" />
                  <text
                    x="32"
                    y="42"
                    textAnchor="middle"
                    fill="white"
                    fontSize="24"
                    fontWeight="bold"
                  >
                    R
                  </text>
                </svg>
              </div>
              <h1 className="auth-layout-title">{t('app.name')}</h1>
              <p className="auth-layout-description">
                Professional • Efficient • Secure
              </p>
            </div>
          </div>
        </div>

        {/* 右侧表单区 */}
        <div className="auth-layout-right">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;