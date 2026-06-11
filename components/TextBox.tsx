import type { ChangeEvent, KeyboardEvent } from 'react';
import { useId } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { storageItemByHolder } from '@/lib/storage';

type Props = {
  label: string;
  placeholder?: string;
  holder: keyof typeof storageItemByHolder;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
};

export const TextBox = ({ label, placeholder, holder, onChange, onSubmit }: Props) => {
  const item = storageItemByHolder[holder];
  const [value, setValue] = useStorage(item);
  const inputId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    onChange?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    if (event.nativeEvent.isComposing) return; // skip while IME is composing
    if (!onSubmit) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <>
      <div className="mt-2 mb-0.5 text-gray-400 text-xs">
        <label htmlFor={inputId}>{label ?? 'ラベル'}</label>
      </div>
      <div>
        <input
          id={inputId}
          type="text"
          placeholder={placeholder ?? ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          value={value ?? ''}
          className="w-full px-4 py-1 text-white focus:text-black rounded-lg border border-gray-600 bg-gray-800 focus:bg-gray-200 focus:outline-none"
        />
      </div>
    </>
  );
};
