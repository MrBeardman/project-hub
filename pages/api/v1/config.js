import { kv } from '@vercel/kv';

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
    // Get project data from KV store
    const project = await kv.get(`project:${key}`);
    
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

    // Log the request for monitoring
    await kv.lpush(`logs:${key}`, {
      ts: Date.now(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      ua: req.headers['user-agent']
    });
    
    // Keep only last 100 logs
    await kv.ltrim(`logs:${key}`, 0, 99);

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
