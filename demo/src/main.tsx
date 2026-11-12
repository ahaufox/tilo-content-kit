import React from 'react';
import { createRoot } from 'react-dom/client';
// SDK 随包样式：文档站内容区直接消费 @tilo-ui/content-kit 的排版基线
import '@tilo-ui/content-kit/styles.css';
import './site.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
