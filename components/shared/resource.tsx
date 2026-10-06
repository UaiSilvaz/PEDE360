"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ClientError } from "@/lib/client";
export function useResource<T>(url: string | null, poll = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ClientError>();
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!url) return;
    try {
      const result = await api<T>(url);
      setData(result);
      setError(undefined);
    } catch (e) {
      setError(
        e instanceof ClientError
          ? e
          : new ClientError("Não foi possível carregar.", 503),
      );
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    const load = async () => {
      try {
        const result = await api<T>(url);
        if (alive) {
          setData(result);
          setError(undefined);
        }
      } catch (e) {
        if (alive)
          setError(
            e instanceof ClientError
              ? e
              : new ClientError("Não foi possível carregar.", 503),
          );
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const timer = poll ? setInterval(load, poll) : undefined;
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, poll]);
  return { data, setData, error, loading, refresh };
}
export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: Error;
  retry?: () => void;
}) {
  if (error)
    return (
      <div className="empty-state" role="alert">
        <strong>
          {error instanceof ClientError && error.status === 403
            ? "Sem permissão"
            : "Não foi possível carregar"}
        </strong>
        <p>{error.message}</p>
        {retry && (
          <button className="outline-btn" onClick={retry}>
            Tentar novamente
          </button>
        )}
      </div>
    );
  if (loading)
    return (
      <div className="skeleton-stack" aria-label="Carregando" role="status">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  return null;
}

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
