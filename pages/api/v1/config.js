import { Redis } from '@upstash/redis';

// Initialize Redis client
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

// This endpoint looks like a normal config/analytics service
// Client apps call this to "load configuration"
// In reality, it controls whether the app runs

export default async function handler(req, res) {
  // Set CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key } = req.query;
  
  if (!key) {
    return res.status(400).json({ error: 'Missing configuration key' });
  }

  try {
    // Get project data from Redis (cached)
    const project = await getCached(`project:${key}`, () => redis.get(`project:${key}`));
    
    if (!project) {
      // Unknown project - return default "inactive" response
      // This looks like a normal config response
      return res.status(200).json({
        v: '1.0',
        ts: Date.now(),
        config: {
          analytics: { enabled: false },
          features: { core: false, extended: false },
          sync: { interval: 0 }
        }
      });
    }

    // Log the request for monitoring (fire and forget)
    redis.lpush(`logs:${key}`, JSON.stringify({
      ts: Date.now(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      ua: req.headers['user-agent']
    })).catch(() => {});
    
    // Keep only last 100 logs (fire and forget)
    redis.ltrim(`logs:${key}`, 0, 99).catch(() => {});

    // Return config based on project status
    const isActive = project.active === true;
    
    return res.status(200).json({
      v: '1.0',
      ts: Date.now(),
      config: {
        analytics: { enabled: isActive },
        features: { 
          core: isActive,
          extended: isActive 
        },
        sync: { 
          interval: isActive ? 3600 : 0 
        }
      }
    });

  } catch (error) {
    console.error('Config API error:', error);
    // On error, return "maintenance" response
    return res.status(200).json({
      v: '1.0',
      ts: Date.now(),
      config: {
        analytics: { enabled: false },
        features: { core: false, extended: false },
        sync: { interval: 0 },
        maintenance: true
      }
    });
  }
}
