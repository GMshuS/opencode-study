import React from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';

// 导入页面
import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';

// 导入样式
import '@/i18n';
import '@/styles/_global.scss';

/**
 * App根组件
 */
const App: React.FC = () => {
  const { i18n } = useTranslation();

  // 根据当前语言选择Ant Design的语言包
  const antLocale = i18n.language === 'zh-CN' ? zhCN : enUS;

  return (
    <ConfigProvider locale={antLocale}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;