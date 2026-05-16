import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

// 语言资源
const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  en: {
    translation: en,
  },
};

// i18next配置
i18n
  // 语言检测器
  .use(LanguageDetector)
  // react-i18next配置
  .use(initReactI18next)
  .init({
    resources,
    // 默认语言
    fallbackLng: 'zh-CN',
    // 默认命名空间
    defaultNS: 'translation',
    // 命名空间列表
    ns: ['translation'],
    // 语言检测配置
    detection: {
      // 检测顺序
      order: ['localStorage', 'navigator', 'htmlTag'],
      // 缓存用户选择的语言
      caches: ['localStorage'],
      // localStorage键名
      lookupLocalStorage: 'language',
    },
    // 插值配置
    interpolation: {
      // React已经安全处理了JSX
      escapeValue: false,
    },
    // 开发环境显示缺失的key
    debug: false,
  });

export default i18n;