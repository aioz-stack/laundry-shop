import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { api, toApiError, type ApiError } from './api';

/** Ported from the Baseplate template: run handler on outside click. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, handler: (e: Event) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onPointerDown = (event: Event) => {
      if (ref.current && !ref.current.contains(event.target as Node)) handler(event);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [ref, handler, enabled]);
}

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Query<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/**
 * GET a resource; refetches when url or params change. Stale responses from
 * earlier requests are ignored.
 */
export function useApiQuery<T>(url: string | null, params?: Record<string, unknown>, select?: (raw: any) => T): Query<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [tick, setTick] = useState(0);
  const requestId = useRef(0);
  const paramsKey = JSON.stringify(params ?? {});
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    if (url === null) return;
    const id = ++requestId.current;
    setLoading(true);
    api
      .get(url, { params: JSON.parse(paramsKey) })
      .then((res) => {
        if (id !== requestId.current) return;
        setData(selectRef.current ? selectRef.current(res.data) : (res.data.data ?? res.data));
        setError(null);
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        setError(toApiError(e));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [url, paramsKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

/** Keyboard shortcut helper (ignores keystrokes while typing unless allowed). */
export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, options: { allowInInputs?: boolean } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if (typing && !options.allowInInputs) return;
      if (e.key === key) handlerRef.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, options.allowInInputs]);
}
