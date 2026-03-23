export interface ResponseTemplate {
  zh: string[];
  en: string[];
}

export const PRIVACY_REFUSAL_TEMPLATES: Record<string, ResponseTemplate> = {
  address: {
    zh: [
      '具体住址是私人信息，未在博客中公开。',
      '关于住址信息，博客中没有相关内容。',
      '这个信息涉及隐私，博主没有在博客中分享。',
    ],
    en: [
      'Address is private and not disclosed on the blog.',
      'The blogger has not shared address information publicly.',
      'This is private information that is not available on the blog.',
    ],
  },
  income: {
    zh: [
      '收入信息未在博客中公开。',
      '关于收入，博客中没有相关内容。',
      '这个信息属于隐私范畴，博主没有公开。',
    ],
    en: [
      'Income information is not disclosed on the blog.',
      'The blogger has not shared income details publicly.',
      'This is private financial information not available on the blog.',
    ],
  },
  family: {
    zh: [
      '家人信息未在博客中公开。',
      '关于家人，博客中没有详细介绍。',
      '这属于私人生活范畴，博主选择不公开。',
    ],
    en: [
      'Family information is not disclosed on the blog.',
      'The blogger keeps family matters private.',
      'Details about family members are not shared publicly.',
    ],
  },
  phone: {
    zh: [
      '联系电话未在博客中公开。',
      '博主的联系方式没有在博客中分享。',
      '电话号码属于隐私信息，无法提供。',
    ],
    en: [
      'Phone number is not disclosed on the blog.',
      'Contact details are not shared publicly on the blog.',
      'Phone numbers are private information not available here.',
    ],
  },
  id: {
    zh: [
      '身份证件信息未在博客中公开。',
      '这属于敏感个人信息，博主没有公开。',
      '身份证件信息受保护，不在博客内容中。',
    ],
    en: [
      'ID information is not disclosed on the blog.',
      'Identity document details are private and not shared.',
      'This is sensitive personal information not available publicly.',
    ],
  },
  age: {
    zh: [
      '年龄信息未在博客中公开。',
      '关于年龄，博客中没有明确提及。',
      '这个信息博主没有在博客中分享。',
    ],
    en: [
      'Age information is not disclosed on the blog.',
      'The blogger has not shared age details publicly.',
      'Age is not mentioned in the blog content.',
    ],
  },
};

export const UNKNOWN_REFUSAL_TEMPLATES: ResponseTemplate = {
  zh: [
    '这个信息未在博客中公开。',
    '这类私人信息博主没有公开分享。',
    '抱歉，这个信息不在博客内容范围内。',
  ],
  en: [
    'This information is not disclosed on the blog.',
    'The blogger has not shared this private information.',
    'Sorry, this information is not available in the blog.',
  ],
};

export const NO_ARTICLE_TEMPLATES: ResponseTemplate = {
  zh: [
    '根据博客内容搜索，目前没有找到与这个主题直接相关的文章。你可以尝试用其他关键词搜索，或者问我其他问题。',
    '我在博客中没有找到相关的内容。试试换个方式提问，或者浏览其他话题。',
    '抱歉，博客里暂时没有涉及这个话题的文章。你可以问我其他问题，我尽力帮你找答案。',
  ],
  en: [
    'No articles directly related to this topic were found. Try different keywords or ask another question.',
    'I could not find relevant content in the blog. Try rephrasing your question or exploring other topics.',
    'Sorry, there are no articles on this topic in the blog. Feel free to ask about something else.',
  ],
};

export const ARTICLE_COUNT_TEMPLATES: ResponseTemplate = {
  zh: [
    '根据我检索到的信息，当前共找到 {count} 篇相关文章。',
    '搜索结果显示，有 {count} 篇文章与你的问题相关。',
    '我找到了 {count} 篇可能对你有帮助的文章。',
  ],
  en: [
    'Based on my search, I found {count} related articles.',
    'The search returned {count} articles that may be relevant.',
    'I discovered {count} articles related to your query.',
  ],
};

/**
 * Randomly selects a template from the available options.
 */
export function pickTemplate(templates: ResponseTemplate, lang: string): string {
  const options = lang === 'en' ? templates.en : templates.zh;
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

/**
 * Picks a template and interpolates variables.
 */
export function pickTemplateWithVars(
  templates: ResponseTemplate,
  lang: string,
  vars: Record<string, string | number>,
): string {
  let text = pickTemplate(templates, lang);
  for (const [key, value] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return text;
}