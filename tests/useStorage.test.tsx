import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStorage } from '@/hooks/useStorage';

type Watcher<T> = (next: T, prev: T) => void;

const createMockItem = <T,>(initial: T) => {
  let stored: T = initial;
  const watchers = new Set<Watcher<T>>();

  return {
    fallback: initial,
    getValue: vi.fn(async () => stored),
    setValue: vi.fn(async (next: T) => {
      const prev = stored;
      stored = next;
      for (const cb of watchers) cb(next, prev);
    }),
    watch: vi.fn((cb: Watcher<T>) => {
      watchers.add(cb);
      return () => watchers.delete(cb);
    }),
    _emit: (next: T) => {
      const prev = stored;
      stored = next;
      for (const cb of watchers) cb(next, prev);
    },
    _peek: () => stored,
  };
};

const Probe = ({ item }: { item: ReturnType<typeof createMockItem<string>> }) => {
  const [value, setValue] = useStorage(item);
  return (
    <>
      <span data-testid="value">{value}</span>
      <button type="button" onClick={() => setValue('updated')}>
        update
      </button>
    </>
  );
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders fallback synchronously then hydrates from storage', async () => {
    const item = createMockItem('stored-value');
    render(<Probe item={item} />);

    expect(screen.getByTestId('value').textContent).toBe('stored-value');

    await flush();

    expect(screen.getByTestId('value').textContent).toBe('stored-value');
    expect(item.getValue).toHaveBeenCalledTimes(1);
  });

  it('optimistically updates and persists via setValue', async () => {
    const item = createMockItem('initial');
    render(<Probe item={item} />);
    await flush();

    await act(async () => {
      screen.getByText('update').click();
    });

    expect(screen.getByTestId('value').textContent).toBe('updated');
    expect(item.setValue).toHaveBeenCalledWith('updated');
  });

  it('absorbs the watcher echo from a local write (no oscillation)', async () => {
    const item = createMockItem('initial');
    render(<Probe item={item} />);
    await flush();

    const valueEl = screen.getByTestId('value');
    const observed: string[] = [valueEl.textContent ?? ''];
    const observer = new MutationObserver(() => {
      observed.push(valueEl.textContent ?? '');
    });
    observer.observe(valueEl, { characterData: true, childList: true, subtree: true });

    await act(async () => {
      screen.getByText('update').click();
    });
    await flush();
    observer.disconnect();

    expect(item.setValue).toHaveBeenCalledTimes(1);
    expect(valueEl.textContent).toBe('updated');
    // The watcher's echo of our own write must NOT cause a redundant render
    // (i.e. we should not see 'updated' appear, then disappear, then reappear).
    const updatedAppearances = observed.filter((v) => v === 'updated').length;
    expect(updatedAppearances).toBe(1);
  });

  it('reflects external storage changes via watch', async () => {
    const item = createMockItem('initial');
    render(<Probe item={item} />);
    await flush();

    await act(async () => {
      item._emit('external');
    });

    expect(screen.getByTestId('value').textContent).toBe('external');
  });

  it('resets state and re-subscribes when the item identity changes', async () => {
    const itemA = createMockItem('A');
    const itemB = createMockItem('B');

    const { rerender } = render(<Probe item={itemA} />);
    await flush();
    expect(screen.getByTestId('value').textContent).toBe('A');

    rerender(<Probe item={itemB} />);
    expect(screen.getByTestId('value').textContent).toBe('B');

    await flush();
    expect(screen.getByTestId('value').textContent).toBe('B');
    expect(itemB.getValue).toHaveBeenCalled();
  });

  it('unsubscribes the watcher on unmount', async () => {
    const item = createMockItem('initial');
    const unwatch = vi.fn();
    item.watch = vi.fn(() => unwatch);

    const { unmount } = render(<Probe item={item} />);
    await flush();

    unmount();
    expect(unwatch).toHaveBeenCalledTimes(1);
  });
});
