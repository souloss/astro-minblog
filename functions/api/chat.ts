/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Workers AI Chat API
 * 使用 GLM-4.7-Flash 模型（支持中文和 100+ 语言）
 * 
 * 调用方式: POST /api/chat
 * Body: { "message": "你的问题", "systemPrompt": "可选的系统提示" }
 */
interface Env {
  souloss: Ai;
}

interface ChatRequest {
  message: string;
  systemPrompt?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // 只允许 POST 请求
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 解析请求体
    const body = await context.request.json() as ChatRequest;
    
    if (!body.message) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 构建消息
    const systemPrompt = body.systemPrompt || '你是一个友好的中文助手，请用中文回答问题。';
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.message },
    ];

    // 调用 Workers AI - 使用 GLM-4.7-Flash 模型（支持中文）
    // 使用类型断言因为新模型可能不在类型定义中
    const response = await context.env.souloss.run(
      '@cf/zai-org/glm-4.7-flash' as keyof AiModels,
      {
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }
    );

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};