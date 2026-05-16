import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PasswordInput from '../../common/PasswordInput';
import PasswordStrength from './PasswordStrength';
import './index.scss';

// 表单验证schema
const registerSchema = z
  .object({
    username: z
      .string()
      .min(2, 'usernameLength')
      .max(20, 'usernameLength')
      .regex(/^[a-zA-Z0-9_]+$/, 'usernameRegex'),
    email: z.string().email('emailInvalid'),
    password: z.string().min(6, 'passwordMinLength'),
    confirmPassword: z.string().min(1, 'confirmPasswordRequired'),
    agreement: z.boolean().refine((val) => val === true, 'agreementRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'confirmPasswordMismatch',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export interface RegisterFormProps {
  /** 注册成功回调 */
  onRegisterSuccess?: () => void;
}

/**
 * 注册表单组件
 */
const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 使用react-hook-form管理表单
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      agreement: false,
    },
  });

  // 监听密码字段
  const passwordValue = watch('password');

  // 处理提交
  const handleFinish = async (values: RegisterFormData) => {
    try {
      // TODO: 调用注册API
      console.log('Register:', values);
      message.success(t('register.success'));
      onRegisterSuccess?.();
      // 跳转到登录页
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  // 获取用户名的错误信息
  const getUsernameError = () => {
    if (errors.username) {
      const errorKey = errors.username.message;
      if (errorKey?.includes('Length')) return t('register.errors.usernameLength');
      if (errorKey?.includes('Regex')) return t('register.errors.usernameRegex');
      if (errorKey?.includes('Required')) return t('register.errors.usernameRequired');
    }
    return undefined;
  };

  // 获取邮箱的错误信息
  const getEmailError = () => {
    if (errors.email) {
      const errorKey = errors.email.message;
      if (errorKey?.includes('email')) return t('register.errors.emailInvalid');
      if (errorKey?.includes('Required')) return t('register.errors.emailRequired');
    }
    return undefined;
  };

  // 获取密码的错误信息
  const getPasswordError = () => {
    if (errors.password) {
      return t('register.errors.passwordMinLength');
    }
    return undefined;
  };

  // 获取确认密码的错误信息
  const getConfirmPasswordError = () => {
    if (errors.confirmPassword) {
      const errorKey = errors.confirmPassword.message;
      if (errorKey?.includes('Mismatch')) return t('register.errors.confirmPasswordMismatch');
      if (errorKey?.includes('Required')) return t('register.errors.confirmPasswordRequired');
    }
    return undefined;
  };

  // 获取协议的错误信息
  const getAgreementError = () => {
    if (errors.agreement) {
      return t('register.errors.agreementRequired');
    }
    return undefined;
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(handleFinish)} className="register-form">
      {/* 标题区域 */}
      <div className="register-form-header">
        <h1 className="register-form-title">{t('register.title')}</h1>
        <p className="register-form-subtitle">{t('register.subtitle')}</p>
      </div>

      {/* 用户名 */}
      <Form.Item
        label={t('common.username')}
        validateStatus={errors.username ? 'error' : ''}
        help={getUsernameError()}
      >
        <Input
          {...register('username')}
          placeholder={t('register.usernamePlaceholder')}
          size="large"
          prefix={<UserOutlined />}
        />
      </Form.Item>

      {/* 邮箱 */}
      <Form.Item
        label={t('common.email')}
        validateStatus={errors.email ? 'error' : ''}
        help={getEmailError()}
      >
        <Input
          {...register('email')}
          placeholder={t('register.emailPlaceholder')}
          size="large"
          prefix={<MailOutlined />}
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
          placeholder={t('register.passwordPlaceholder')}
          size="large"
        />
      </Form.Item>

      {/* 密码强度指示 */}
      <PasswordStrength password={passwordValue || ''} />

      {/* 确认密码 */}
      <Form.Item
        label={t('common.confirmPassword')}
        validateStatus={errors.confirmPassword ? 'error' : ''}
        help={getConfirmPasswordError()}
      >
        <PasswordInput
          {...register('confirmPassword')}
          placeholder={t('register.confirmPasswordPlaceholder')}
          size="large"
        />
      </Form.Item>

      {/* 用户协议 */}
      <Form.Item help={getAgreementError()}>
        <Checkbox {...register('agreement')}>
          {t('common.agree')}
          <a>{t('common.userAgreement')}</a>
          {t('common.and')}
          <a>{t('common.privacyPolicy')}</a>
        </Checkbox>
      </Form.Item>

      {/* 提交按钮 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block>
          {t('common.register')}
        </Button>
      </Form.Item>

      {/* 登录链接 */}
      <div className="register-form-footer">
        <span>{t('common.hasAccount')}</span>
        <a onClick={() => navigate('/login')}>{t('common.switchToLogin')}</a>
      </div>
    </Form>
  );
};

export default RegisterForm;