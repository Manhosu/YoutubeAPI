const Fallback = () => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      backgroundColor: '#f9fafb', 
      color: '#1f2937'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        YouTube Playlist Analyzer
      </h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
        Carregando aplicação...
      </p>
      <div style={{ 
        width: '50px', 
        height: '50px', 
        border: '5px solid #e5e7eb',
        borderTopColor: '#ef4444',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Fallback; 