import { useEffect, useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import {
  isParameterized,
  mergeBuiltins,
  type Template,
  type TemplateActivation,
  templateActivationsItem,
  templatesItem,
} from '@/lib/templates';

export const TemplateChips = () => {
  const [stored, setStored] = useStorage(templatesItem);
  const [activations, setActivations] = useStorage(templateActivationsItem);
  const [reconciled, setReconciled] = useState(false);

  // One-shot reconcile with current builtins (add new, refresh names/patterns)
  useEffect(() => {
    if (reconciled) return;
    const merged = mergeBuiltins(stored);
    if (JSON.stringify(merged) !== JSON.stringify(stored)) {
      setStored(merged);
    }
    setReconciled(true);
  }, [reconciled, stored, setStored]);

  const visible = stored.filter((t) => t.enabled);

  if (visible.length === 0) {
    return (
      <div className="mt-2 text-gray-500 text-xs">
        テンプレート未設定 — Options から有効化できます
      </div>
    );
  }

  const toggle = (id: string) => {
    const current = activations[id];
    const next: TemplateActivation = { ...current, active: !current?.active };
    setActivations({ ...activations, [id]: next });
  };

  const updateArg = (id: string, value: string) => {
    const current = activations[id];
    setActivations({ ...activations, [id]: { ...current, argValue: value } });
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {visible.map((t) => (
        <Chip
          key={t.id}
          template={t}
          activation={activations[t.id]}
          onToggle={() => toggle(t.id)}
          onArgChange={(v) => updateArg(t.id, v)}
        />
      ))}
    </div>
  );
};

type ChipProps = {
  template: Template;
  activation?: TemplateActivation;
  onToggle: () => void;
  onArgChange: (value: string) => void;
};

const Chip = ({ template, activation, onToggle, onArgChange }: ChipProps) => {
  const active = activation?.active ?? false;
  const argValue = activation?.argValue ?? '';
  const needsArg = isParameterized(template.pattern);
  const missing = active && needsArg && argValue.trim() === '';

  return (
    <span
      className={`inline-flex items-center text-xs rounded-full border px-2 py-0.5 ${
        active
          ? missing
            ? 'border-amber-500 bg-amber-900/40 text-amber-100'
            : 'border-blue-400 bg-blue-900/60 text-blue-100'
          : 'border-gray-600 bg-gray-800 text-gray-300'
      }`}
    >
      <button type="button" onClick={onToggle} className="focus:outline-none">
        {active ? '✓ ' : ''}
        {template.name}
        {missing ? ' ⚠' : ''}
      </button>
      {active && needsArg && (
        <input
          type="text"
          value={argValue}
          onChange={(e) => onArgChange(e.target.value)}
          placeholder="value"
          className="ml-1 w-20 bg-transparent border-b border-current text-current text-xs px-1 focus:outline-none"
          aria-label={`${template.name} value`}
        />
      )}
    </span>
  );
};
