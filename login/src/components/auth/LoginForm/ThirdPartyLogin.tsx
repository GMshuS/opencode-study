import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { GithubOutlined, GoogleOutlined, WechatOutlined } from '@ant-design/icons';
import './index.scss';

// 第三方登录平台配置
type ThirdPartyPlatform = 'wechat' | 'github' | 'google';

interface ThirdPartyConfig {
  key: ThirdPartyPlatform;
  icon: React.ReactNode;
  labelKey: string;
  color: string;
}

const thirdPartyConfigs: ThirdPartyConfig[] = [
  {
    key: 'wechat',
    icon: <WechatOutlined />,
    labelKey: 'thirdParty.wechat',
    color: '#07c160',
  },
  {
    key: 'github',
    icon: <GithubOutlined />,
    labelKey: 'thirdParty.github',
    color: '#24292e',
  },
  {
    key: 'google',
    icon: <GoogleOutlined />,
    labelKey: 'thirdParty.google',
    color: '#4285f4',
  },
];

/**
 * 第三方登录组件
 */
const ThirdPartyLogin: React.FC = () => {
  const { t } = useTranslation();

  // 处理第三方登录点击
  const handleThirdPartyClick = (platform: ThirdPartyPlatform) => {
    // TODO: 实现第三方登录逻辑
    console.log('Third party login:', platform);
  };

  return (
    <div className="third-party-login">
      <div className="third-party-login-divider">
        <span>{t('login.dividerText')}</span>
      </div>
      <div className="third-party-login-buttons">
        {thirdPartyConfigs.map((config) => (
          <Button
            key={config.key}
            size="large"
            icon={config.icon}
            onClick={() => handleThirdPartyClick(config.key)}
            className="third-party-button"
            style={{ '--platform-color': config.color } as React.CSSProperties}
          >
            {t(config.labelKey)}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ThirdPartyLogin;