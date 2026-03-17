export default function RankingPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: 40, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64 }}>🏆</div>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Ranking de Pescadores</h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400 }}>
        Os maiores pescadores da comunidade WikiFish. Conquiste seu lugar no topo!
      </p>
      <a href="/" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
        ← Voltar ao Mapa
      </a>
    </div>
  )
}
