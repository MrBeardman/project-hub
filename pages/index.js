export default function Home() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Project Configuration Service</h1>
        <p style={styles.text}>API service for application configuration management.</p>
        <div style={styles.endpoints}>
          <code>GET /api/v1/config?key=YOUR_KEY</code>
        </div>
        <p style={styles.version}>v1.0.0</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  content: {
    textAlign: 'center',
    color: '#94a3b8'
  },
  title: {
    fontSize: '24px',
    color: '#f8fafc',
    marginBottom: '10px'
  },
  text: {
    marginBottom: '30px'
  },
  endpoints: {
    backgroundColor: '#1e293b',
    padding: '15px 25px',
    borderRadius: '8px',
    marginBottom: '30px'
  },
  version: {
    fontSize: '12px',
    color: '#64748b'
  }
};
