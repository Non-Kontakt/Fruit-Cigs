import { useRef, useEffect } from "react";

/**
 * Mirrors a value into a ref that always holds the latest render's value,
 * for reading inside async/closure callbacks that would otherwise capture
 * a stale value. Updated via effect — NOT synchronous with the render that
 * produced the value, so it isn't suitable where a caller (e.g. a save
 * path) needs the fresh value visible before the next paint.
 */
export function useLatestRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}
