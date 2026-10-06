"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state">
      <h1>Não foi possível carregar esta página</h1>
      <p>Verifique a configuração do serviço e tente novamente.</p>
      <button className="primary-btn" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
