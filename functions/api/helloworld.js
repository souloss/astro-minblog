export function onRequest(context) {
  // 获取环境变量
  const aiBaseUrl = context.env.AI_BASE_URL || 'not set';
  const aiModel = context.env.AI_MODEL || 'not set';

  // 打印到响应中
  const envInfo = {
    message: "Hello, world!",
    env: {
      AI_BASE_URL: aiBaseUrl,
      AI_MODEL: aiModel
    }
  };
  
  return new Response(JSON.stringify(envInfo, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}