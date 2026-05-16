import React, { useState } from 'react';
import { Tabs, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PasswordLogin from './PasswordLogin';
import PhoneLogin from './PhoneLogin';
import ThirdPartyLogin from './ThirdPartyLogin';
import './index.scss';

export type LoginMethod = 'password' | 'phone';

export interface LoginFormProps {
  /** 登录成功回调 */
  onLoginSuccess?: () => void;
}

/**
 * 登录表单容器组件
 * 管理登录方式切换
 */
const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [loading, setLoading] = useState(false);

  // 处理账号密码登录提交
  const handlePasswordLogin = async (data: { username: string; password: string }) => {
    setLoading(true);
    try {
      // TODO: 调用登录API
      console.log('Password login:', data);
      message.success(t('login.success'));
      onLoginSuccess?.();
      // 登录成功后跳转到首页
      navigate('/');
    } catch (error) {
      // 错误处理
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 处理手机验证码登录提交
  const handlePhoneLogin = async (data: { phone: string; code: string }) => {
    setLoading(true);
    try {
      // TODO: 调用登录API
      console.log('Phone login:', data);
      message.success(t('login.success'));
      onLoginSuccess?.();
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Tab配置
  const tabItems = [
    {
      key: 'password',
      label: t('login.passwordLogin'),
      children: (
        <PasswordLogin
          onSubmit={handlePasswordLogin}
          loading={loading}
        />
      ),
    },
    {
      key: 'phone',
      label: t('login.phoneLogin'),
      children: (
        <PhoneLogin
          onSubmit={handlePhoneLogin}
          loading={loading}
        />
      ),
    },
  ];

  return (
    <div className="login-form">
      {/* 标题区域 */}
      <div className="login-form-header">
        <h1 className="login-form-title">{t('login.title')}</h1>
        <p className="login-form-subtitle">{t('login.subtitle')}</p>
      </div>

      {/* Tab切换 */}
      <Tabs
        activeKey={loginMethod}
        onChange={(key) => setLoginMethod(key as LoginMethod)}
        items={tabItems}
        className="login-form-tabs"
      />

      {/* 第三方登录 */}
      <ThirdPartyLogin />

      {/* 注册链接 */}
      <div className="login-form-footer">
        <span>{t('common.noAccount')}</span>
        <a onClick={() => navigate('/register')}>{t('common.signupNow')}</a>
      </div>
    </div>
  );
};

export default LoginForm;