import type { Action } from './types';
import { ActionQueue } from './queue';
import { ActionExecutor } from './executor';

const ACTIONS_PARAM = 'ai_actions';
const THEME_PARAM = 'theme';
const SECTION_PARAM = 'section';

export const URLHandler = {
  parseActionsFromURL(): Action[] {
    const params = new URLSearchParams(window.location.search);
    const actions: Action[] = [];

    const theme = params.get(THEME_PARAM);
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      actions.push({
        type: 'toggle-theme',
        payload: { theme: theme as 'light' | 'dark' | 'system' },
      });
    }

    const section = params.get(SECTION_PARAM);
    if (section && /^[\w\u4e00-\u9fff-]+$/.test(section)) {
      actions.push({
        type: 'scroll-to-section',
        payload: { sectionId: section, highlight: true },
      });
    }

    const token = params.get(ACTIONS_PARAM);
    if (token) {
      const queuedActions = ActionQueue.dequeue(token);
      if (queuedActions) {
        actions.push(...queuedActions);
      }
    }

    return actions;
  },

  buildURL(slug: string, actions: Action[], options?: { lang?: string }): string {
    const lang = options?.lang || 'zh';
    const url = new URL(window.location.origin);
    url.pathname = `/${lang}/posts/${slug}`;

    const simpleActions = actions.filter(
      a =>
        (a.type === 'toggle-theme' && !a.payload.animate) ||
        a.type === 'scroll-to-section'
    );

    const complexActions = actions.filter(a => !simpleActions.includes(a));

    simpleActions.forEach(action => {
      if (action.type === 'toggle-theme') {
        url.searchParams.set(THEME_PARAM, action.payload.theme as string);
      } else if (action.type === 'scroll-to-section') {
        url.searchParams.set(SECTION_PARAM, action.payload.sectionId as string);
      }
    });

    if (complexActions.length > 0) {
      const token = ActionQueue.enqueue(complexActions);
      url.searchParams.set(ACTIONS_PARAM, token);
    }

    return url.toString();
  },

  cleanURL(): void {
    const url = new URL(window.location.href);

    [ACTIONS_PARAM, THEME_PARAM, SECTION_PARAM].forEach(param => {
      url.searchParams.delete(param);
    });

    window.history.replaceState({}, '', url.toString());
  },

  async executeOnLoad(): Promise<void> {
    const actions = this.parseActionsFromURL();

    if (actions.length === 0) return;

    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));

    await ActionExecutor.executeAll(actions);

    this.cleanURL();
  },
};