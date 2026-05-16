import React from 'react';
import { Dropdown, Button, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import './index.scss';

/**
 * 语言切换器组件
 */
const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  // 语言选项
  const items: MenuProps['items'] = [
    {
      key: 'zh-CN',
      label: '简体中文',
      onClick: () => i18n.changeLanguage('zh-CN'),
    },
    {
      key: 'en',
      label: 'English',
      onClick: () => i18n.changeLanguage('en'),
    },
  ];

  // 获取当前语言标签
  const currentLanguage = i18n.language === 'zh-CN' ? '中文' : 'EN';

  return (
    <Dropdown
      menu={{ items }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button type="text" className="language-switcher">
        <Space>
          <GlobalOutlined />
          <span className="language-label">{currentLanguage}</span>
        </Space>
      </Button>
    </Dropdown>
  );
};

export default LanguageSwitcher;