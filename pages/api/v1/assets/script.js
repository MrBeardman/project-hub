import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// In-memory cache to reduce database calls
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCached(key, fetcher) {
  const now = Date.now();
  const cached = cache.get(key);
  
  if (cached && (now - cached.time) < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, time: now });
  return data;
}

// This endpoint serves JavaScript files
// When project is inactive, returns empty/no-op JS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min browser cache
  
  const { key } = req.query;
  
  if (!key) {
    return res.status(200).send('// Invalid request');
  }

  // Referer check - only allow requests from legitimate sources
  const referer = req.headers.referer || req.headers.origin || '';
  const isDirectAccess = !referer || referer.includes('vercel.app');

  try {
    const project = await getCached(`project:${key}`, () => redis.get(`project:${key}`));
    
    if (!project || !project.active) {
      return res.status(200).send('// Service temporarily unavailable');
    }

    // Check referer if domains are configured
    if (project.domains && project.domains.length > 0 && isDirectAccess) {
      const isAllowed = project.domains.some(domain => referer.includes(domain));
      if (!isAllowed && !referer.includes('localhost')) {
        return res.status(200).send('// Unauthorized access');
      }
    }

    // Get the JS content (cached)
    const js = await getCached(`js:${key}`, () => redis.get(`js:${key}`));
    
    if (!js) {
      return res.status(200).send('// No scripts configured');
    }

    // Add version header
    const version = project.jsVersion || '1.0';
    res.setHeader('X-Asset-Version', version);

    // Log access (fire and forget)
    redis.hincrby(`stats:${key}`, 'js_requests', 1).catch(() => {});

    return res.status(200).send(js);

  } catch (error) {
    console.error('JS API error:', error);
    return res.status(200).send('// Service error');
  }
}
