import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ key: '', name: '', client: '', type: 'app' });
  const [editingAssets, setEditingAssets] = useState(null);
  const [assetContent, setAssetContent] = useState({ css: '', js: '' });

  useEffect(() => {
    // Check for saved secret in sessionStorage
    const savedSecret = sessionStorage.getItem('admin_secret');
    if (savedSecret) {
      setSecret(savedSecret);
      setAuthenticated(true);
      fetchProjects(savedSecret);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProjects = async (adminSecret) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/projects', {
        headers: { 'Authorization': `Bearer ${adminSecret}` }
      });
      
      if (res.status === 401) {
        setAuthenticated(false);
        sessionStorage.removeItem('admin_secret');
        setError('Invalid admin secret');
        return;
      }
      
      const data = await res.json();
      setProjects(data.projects || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    sessionStorage.setItem('admin_secret', secret);
    setAuthenticated(true);
    fetchProjects(secret);
  };

  const toggleProject = async (key, currentStatus) => {
    try {
      await fetch(`/api/admin/projects?key=${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !currentStatus })
      });
      fetchProjects(secret);
    } catch (err) {
      setError('Failed to update project');
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProject)
      });
      
      if (res.ok) {
        setShowNewProject(false);
        setNewProject({ key: '', name: '', client: '', type: 'app' });
        fetchProjects(secret);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create project');
    }
  };

  const deleteProject = async (key) => {
    if (!confirm(`Delete project "${key}"? This cannot be undone.`)) return;
    
    try {
      await fetch(`/api/admin/projects?key=${key}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      fetchProjects(secret);
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const loadAssets = async (key) => {
    try {
      const res = await fetch(`/api/admin/projects?key=${key}`, {
        headers: { 'Authorization': `Bearer ${secret}` }
      });
      const data = await res.json();
      
      // Fetch CSS and JS content separately
      const cssRes = await fetch(`/api/v1/assets/style?key=${key}`);
      const jsRes = await fetch(`/api/v1/assets/script?key=${key}`);
      
      setAssetContent({
        css: await cssRes.text(),
        js: await jsRes.text()
      });
      setEditingAssets(key);
    } catch (err) {
      setError('Failed to load assets');
    }
  };

  const saveAssets = async () => {
    try {
      await fetch(`/api/admin/projects?key=${editingAssets}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          css: assetContent.css,
          js: assetContent.js
        })
      });
      setEditingAssets(null);
      fetchProjects(secret);
    } catch (err) {
      setError('Failed to save assets');
    }
  };

  // Login screen
  if (!authenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <h1 style={styles.title}>Project Hub</h1>
          <p style={styles.subtitle}>Configuration Management</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Admin Secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button}>
              Access Dashboard
            </button>
          </form>
          {error && <p style={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  // Asset editor modal
  if (editingAssets) {
    return (
      <div style={styles.container}>
        <div style={styles.dashboard}>
          <div style={styles.header}>
            <h1 style={styles.title}>Edit Assets: {editingAssets}</h1>
            <button onClick={() => setEditingAssets(null)} style={styles.buttonSecondary}>
              Cancel
            </button>
          </div>
          
          <div style={styles.assetEditor}>
            <div style={styles.assetSection}>
              <h3>CSS</h3>
              <textarea
                value={assetContent.css}
                onChange={(e) => setAssetContent({ ...assetContent, css: e.target.value })}
                style={styles.textarea}
                placeholder="/* Custom CSS */"
              />
            </div>
            
            <div style={styles.assetSection}>
              <h3>JavaScript</h3>
              <textarea
                value={assetContent.js}
                onChange={(e) => setAssetContent({ ...assetContent, js: e.target.value })}
                style={styles.textarea}
                placeholder="// Custom JavaScript"
              />
            </div>
          </div>
          
          <button onClick={saveAssets} style={styles.button}>
            Save Assets
          </button>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div style={styles.container}>
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Project Hub</h1>
          <button onClick={() => setShowNewProject(!showNewProject)} style={styles.button}>
            {showNewProject ? 'Cancel' : '+ New Project'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {showNewProject && (
          <form onSubmit={createProject} style={styles.newProjectForm}>
            <input
              placeholder="Project Key (e.g., gold-eshop-1)"
              value={newProject.key}
              onChange={(e) => setNewProject({ ...newProject, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
              style={styles.input}
              required
            />
            <input
              placeholder="Project Name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              style={styles.input}
              required
            />
            <input
              placeholder="Client Name"
              value={newProject.client}
              onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
              style={styles.input}
            />
            <select
              value={newProject.type}
              onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
              style={styles.input}
            >
              <option value="app">Application (API check)</option>
              <option value="css">CSS Only</option>
              <option value="js">JS Only</option>
              <option value="bundle">CSS + JS Bundle</option>
            </select>
            <button type="submit" style={styles.button}>Create Project</button>
          </form>
        )}

        {loading ? (
          <p style={styles.loading}>Loading projects...</p>
        ) : (
          <div style={styles.projectList}>
            {projects.length === 0 ? (
              <p style={styles.empty}>No projects yet. Create your first project above.</p>
            ) : (
              projects.map((project) => (
                <div key={project.key} style={styles.projectCard}>
                  <div style={styles.projectHeader}>
                    <div>
                      <h3 style={styles.projectName}>{project.name}</h3>
                      <p style={styles.projectMeta}>
                        {project.client && <span>{project.client} • </span>}
                        <code style={styles.code}>{project.key}</code>
                        <span style={styles.typeBadge}>{project.type}</span>
                      </p>
                    </div>
                    <div style={styles.projectActions}>
                      <button
                        onClick={() => toggleProject(project.key, project.active)}
                        style={{
                          ...styles.toggle,
                          backgroundColor: project.active ? '#10b981' : '#ef4444'
                        }}
                      >
                        {project.active ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </div>
                  </div>
                  
                  <div style={styles.projectDetails}>
                    <div style={styles.endpoints}>
                      <p><strong>Config API:</strong></p>
                      <code style={styles.endpoint}>/api/v1/config?key={project.key}</code>
                      
                      {(project.type === 'css' || project.type === 'bundle') && (
                        <>
                          <p><strong>CSS:</strong></p>
                          <code style={styles.endpoint}>/api/v1/assets/style?key={project.key}</code>
                        </>
                      )}
                      
                      {(project.type === 'js' || project.type === 'bundle') && (
                        <>
                          <p><strong>JS:</strong></p>
                          <code style={styles.endpoint}>/api/v1/assets/script?key={project.key}</code>
                        </>
                      )}
                    </div>
                    
                    {project.stats && (
                      <div style={styles.stats}>
                        <span>CSS: {project.stats.css_requests || 0}</span>
                        <span>JS: {project.stats.js_requests || 0}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.projectFooter}>
                    {(project.type === 'css' || project.type === 'js' || project.type === 'bundle') && (
                      <button onClick={() => loadAssets(project.key)} style={styles.buttonSmall}>
                        Edit Assets
                      </button>
                    )}
                    <button onClick={() => deleteProject(project.key)} style={styles.buttonDanger}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loginBox: {
    maxWidth: '400px',
    margin: '100px auto',
    padding: '40px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    textAlign: 'center'
  },
  dashboard: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#f8fafc'
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '30px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    backgroundColor: '#334155',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#f8fafc',
    marginBottom: '15px',
    boxSizing: 'border-box'
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  buttonSecondary: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#475569',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  buttonSmall: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#475569',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  buttonDanger: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  error: {
    color: '#f87171',
    backgroundColor: '#7f1d1d33',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  loading: {
    textAlign: 'center',
    color: '#94a3b8'
  },
  empty: {
    textAlign: 'center',
    color: '#64748b',
    padding: '60px 20px'
  },
  newProjectForm: {
    backgroundColor: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px'
  },
  projectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  projectCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155'
  },
  projectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  projectName: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    fontWeight: '600'
  },
  projectMeta: {
    margin: 0,
    fontSize: '14px',
    color: '#94a3b8'
  },
  code: {
    backgroundColor: '#334155',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px'
  },
  typeBadge: {
    marginLeft: '10px',
    padding: '2px 8px',
    backgroundColor: '#7c3aed33',
    color: '#a78bfa',
    borderRadius: '4px',
    fontSize: '12px',
    textTransform: 'uppercase'
  },
  toggle: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    minWidth: '100px'
  },
  projectDetails: {
    borderTop: '1px solid #334155',
    paddingTop: '15px',
    marginBottom: '15px'
  },
  endpoints: {
    fontSize: '13px'
  },
  endpoint: {
    display: 'block',
    backgroundColor: '#0f172a',
    padding: '8px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '12px',
    marginBottom: '10px',
    wordBreak: 'break-all'
  },
  stats: {
    display: 'flex',
    gap: '20px',
    marginTop: '10px',
    fontSize: '13px',
    color: '#94a3b8'
  },
  projectFooter: {
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid #334155',
    paddingTop: '15px'
  },
  assetEditor: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  assetSection: {
    backgroundColor: '#1e293b',
    padding: '15px',
    borderRadius: '8px'
  },
  textarea: {
    width: '100%',
    height: '400px',
    padding: '12px',
    fontSize: '13px',
    fontFamily: 'monospace',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    resize: 'vertical',
    boxSizing: 'border-box'
  }
};
