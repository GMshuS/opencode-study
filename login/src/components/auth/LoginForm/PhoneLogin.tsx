import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import PhoneInput from '../../common/PhoneInput';
import CountdownButton from '../../common/CountdownButton';
import './PhoneLogin.scss';

// 表单验证schema
const phoneLoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'phoneInvalid'),
  code: z.string().length(6, 'codeLength'),
});

type PhoneLoginFormData = z.infer<typeof phoneLoginSchema>;

export interface PhoneLoginProps {
  /** 提交回调 */
  onSubmit: (data: PhoneLoginFormData) => Promise<void>;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 手机验证码登录表单
 */
const PhoneLogin: React.FC<PhoneLoginProps> = ({ onSubmit, loading = false }) => {
  const { t } = useTranslation();
  const [phoneValue, setPhoneValue] = useState('');

  // 使用react-hook-form管理表单
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
  });

  // 处理手机号变化
  const handlePhoneChange = (value: string) => {
    setPhoneValue(value);
  };

  // 处理发送验证码
  const handleSendCode = async () => {
    // TODO: 调用发送验证码API
    console.log('Send code to:', phoneValue);
    return true;
  };

  // 处理提交
  const handleFinish = async (values: PhoneLoginFormData) => {
    await onSubmit(values);
  };

  // 获取手机号错误信息
  const getPhoneError = () => {
    if (errors.phone) {
      return t('login.errors.phoneRequired');
    }
    return undefined;
  };

  // 获取验证码错误信息
  const getCodeError = () => {
    if (errors.code) {
      return t('login.errors.codeRequired');
    }
    return undefined;
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(handleFinish)} className="phone-login-form">
      {/* 手机号 */}
      <Form.Item
        label={t('common.phone')}
        validateStatus={errors.phone ? 'error' : ''}
        help={getPhoneError()}
      >
        <PhoneInput
          placeholder={t('login.phonePlaceholder')}
          size="large"
          onChange={(e) => handlePhoneChange(e.target.value)}
          onBlur={(e) => handlePhoneChange(e.target.value)}
        />
      </Form.Item>

      {/* 验证码 */}
      <Form.Item
        label={t('common.verificationCode')}
        validateStatus={errors.code ? 'error' : ''}
        help={getCodeError()}
      >
        <div className="phone-login-code">
          <Input
            {...register('code')}
            placeholder={t('login.codePlaceholder')}
            size="large"
            maxLength={6}
          />
          <CountdownButton
            onSendCode={handleSendCode}
            disabled={!phoneValue || phoneValue.length !== 11}
          />
        </div>
      </Form.Item>

      {/* 提交按钮 */}
      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={loading}>
          {t('common.login')}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default PhoneLogin;