import { kv } from '@vercel/kv';

// Admin API for managing projects
// Protected by ADMIN_SECRET environment variable

export default async function handler(req, res) {
  // Check admin authentication
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.authorization;
  
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET - List all projects or get specific project
async function handleGet(req, res) {
  const { key } = req.query;
  
  if (key) {
    // Get specific project
    const project = await kv.get(`project:${key}`);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get logs and stats
    const logs = await kv.lrange(`logs:${key}`, 0, 19);
    const stats = await kv.hgetall(`stats:${key}`);
    
    return res.status(200).json({ 
      project, 
      logs: logs || [],
      stats: stats || {}
    });
  }
  
  // List all projects
  const keys = await kv.keys('project:*');
  const projects = [];
  
  for (const k of keys) {
    const project = await kv.get(k);
    const projectKey = k.replace('project:', '');
    const stats = await kv.hgetall(`stats:${projectKey}`);
    projects.push({ 
      key: projectKey, 
      ...project,
      stats: stats || {}
    });
  }
  
  return res.status(200).json({ projects });
}

// POST - Create new project
async function handlePost(req, res) {
  const { key, name, client, type, active = true } = req.body;
  
  if (!key || !name) {
    return res.status(400).json({ error: 'Key and name are required' });
  }
  
  // Check if project already exists
  const existing = await kv.get(`project:${key}`);
  if (existing) {
    return res.status(409).json({ error: 'Project already exists' });
  }
  
  const project = {
    key,
    name,
    client: client || '',
    type: type || 'app', // 'app', 'css', 'js', 'bundle'
    active,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await kv.set(`project:${key}`, project);
  
  return res.status(201).json({ project });
}

// PUT - Update project (toggle active, update CSS/JS, etc.)
async function handlePut(req, res) {
  const { key } = req.query;
  const updates = req.body;
  
  if (!key) {
    return res.status(400).json({ error: 'Project key is required' });
  }
  
  const project = await kv.get(`project:${key}`);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Handle special updates (CSS/JS content)
  if (updates.css !== undefined) {
    await kv.set(`css:${key}`, updates.css);
    delete updates.css;
  }
  
  if (updates.js !== undefined) {
    await kv.set(`js:${key}`, updates.js);
    delete updates.js;
  }
  
  // Update project metadata
  const updatedProject = {
    ...project,
    ...updates,
    updatedAt: Date.now()
  };
  
  await kv.set(`project:${key}`, updatedProject);
  
  return res.status(200).json({ project: updatedProject });
}

// DELETE - Remove project
async function handleDelete(req, res) {
  const { key } = req.query;
  
  if (!key) {
    return res.status(400).json({ error: 'Project key is required' });
  }
  
  // Delete all related data
  await kv.del(`project:${key}`);
  await kv.del(`css:${key}`);
  await kv.del(`js:${key}`);
  await kv.del(`logs:${key}`);
  await kv.del(`stats:${key}`);
  
  return res.status(200).json({ deleted: true });
}
