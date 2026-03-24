import { ActionQueue } from './queue';
import { URLHandler } from './url-handler';
import './executor'; // 确保 executor 被加载并注册到 window

export function initActionSystem(): void {
  ActionQueue.cleanup();
  URLHandler.executeOnLoad();

  document.addEventListener('astro:page-load', () => {
    URLHandler.executeOnLoad();
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initActionSystem);
  } else {
    initActionSystem();
  }
}