import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, Input, Checkbox, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PasswordInput from '../../common/PasswordInput';
import './index.scss';

// 表单验证schema
const passwordLoginSchema = z.object({
  username: z.string().min(1, 'usernameRequired').or(z.string().email('usernameInvalid')),
  password: z.string().min(6, 'passwordMinLength'),
  remember: z.boolean().optional(),
});

type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;

export interface PasswordLoginProps {
  /** 提交回调 */
  onSubmit: (data: PasswordLoginFormData) => Promise<void>;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 账号密码登录表单
 */
const PasswordLogin: React.FC<PasswordLoginProps> = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation();

  // 使用react-hook-form管理表单
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordLoginFormData>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: {
      remember: false,
    },
  });

  // 处理提交
  const handleFinish = async (values: PasswordLoginFormData) => {
    await onSubmit(values);
  };

  // 获取用户名的错误信息
  const getUsernameError = () => {
    if (errors.username) {
      const errorKey = errors.username.message;
      if (errorKey && errorKey.includes('Required')) {
        return t('login.errors.usernameRequired');
      }
      if (errorKey && errorKey.includes('email')) {
        return t('login.errors.usernameInvalid');
      }
    }
    return undefined;
  };

  // 获取密码的错误信息
  const getPasswordError = () => {
    if (errors.password) {
      return t('login.errors.passwordMinLength');
    }
    return undefined;
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(handleFinish)} className="password-login-form">
      {/* 用户名/邮箱 */}
      <Form.Item
        label={t('common.username')}
        validateStatus={errors.username ? 'error' : ''}
        help={getUsernameError()}
      >
        <Input
          {...register('username')}
          placeholder={t('login.usernamePlaceholder')}
          size="large"
          prefix={<UserOutlined />}
        />
      </Form.Item>

      {/* 密码 */}
      <Form.Item
        label={t('common.password')}
        validateStatus={errors.password ? 'error' : ''}
        help={getPasswordError()}
      >
        <PasswordInput
          {...register('password')}
          placeholder={t('login.passwordPlaceholder')}
          size="large"
        />
      </Form.Item>

      {/* 记住我和忘记密码 */}
      <div className="password-login-options">
        <Form.Item>
          <Checkbox {...register('remember')}>{t('common.rememberMe')}</Checkbox>
        </Form.Item>
        <a className="forgot-password">{t('common.forgetPassword')}</a>
      </div>

      {/* 提交按钮 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {t('common.login')}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default PasswordLogin;