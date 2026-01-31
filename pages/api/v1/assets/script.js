import { kv } from '@vercel/kv';

// This endpoint serves JavaScript files
// When project is inactive, returns empty/no-op JS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
  
  const { key } = req.query;
  
  if (!key) {
    return res.status(200).send('// Invalid request');
  }

  try {
    const project = await kv.get(`project:${key}`);
    
    if (!project || !project.active) {
      // Return no-op JS when inactive
      return res.status(200).send('// Service temporarily unavailable\nconsole.log("Config service: maintenance mode");');
    }

    // Get the JS content
    const js = await kv.get(`js:${key}`);
    
    if (!js) {
      return res.status(200).send('// No scripts configured');
    }

    // Log access
    await kv.hincrby(`stats:${key}`, 'js_requests', 1);

    return res.status(200).send(js);

  } catch (error) {
    console.error('JS API error:', error);
    return res.status(200).send('// Service error');
  }
}
