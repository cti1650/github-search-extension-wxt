import { useCallback, useEffect, useRef, useState } from 'react';

type StorageItemLike<T> = {
  fallback: T;
  getValue(): Promise<T>;
  setValue(value: T): Promise<void>;
  watch(callback: (newValue: T, oldValue: T) => void): () => void;
};

export function useStorage<T>(item: StorageItemLike<T>): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(item.fallback);
  const pendingWrites = useRef<T[]>([]);

  const [currentItem, setCurrentItem] = useState(item);
  if (currentItem !== item) {
    setCurrentItem(item);
    setValue(item.fallback);
    pendingWrites.current = [];
  }

  useEffect(() => {
    let mounted = true;
    item.getValue().then((v) => {
      if (mounted) setValue(v);
    });
    const unwatch = item.watch((next) => {
      if (!mounted) return;
      if (pendingWrites.current.length > 0 && pendingWrites.current[0] === next) {
        pendingWrites.current.shift();
        return;
      }
      pendingWrites.current = [];
      setValue(next);
    });
    return () => {
      mounted = false;
      unwatch();
    };
  }, [item]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      pendingWrites.current.push(next);
      void item.setValue(next);
    },
    [item],
  );

  return [value, update];
}
