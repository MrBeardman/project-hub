import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// This endpoint serves CSS files
// When project is inactive, returns empty/minimal CSS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
  
  const { key } = req.query;
  
  if (!key) {
    return res.status(200).send('/* Invalid request */');
  }

  try {
    const project = await redis.get(`project:${key}`);
    
    if (!project || !project.active) {
      // Return empty CSS when inactive
      return res.status(200).send('/* Service temporarily unavailable */');
    }

    // Get the CSS content
    const css = await redis.get(`css:${key}`);
    
    if (!css) {
      return res.status(200).send('/* No styles configured */');
    }

    // Log access
    await redis.hincrby(`stats:${key}`, 'css_requests', 1);

    return res.status(200).send(css);

  } catch (error) {
    console.error('CSS API error:', error);
    return res.status(200).send('/* Service error */');
  }
}
