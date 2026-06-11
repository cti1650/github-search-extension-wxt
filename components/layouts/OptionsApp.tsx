import { useId, useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { SEARCH_TYPES, type SearchType } from '@/lib/githubSearch';
import {
  type DisplayMode,
  displayModeItem,
  type QuickSearchConfig,
  quickSearchItem,
  scopeOrgsItem,
  scopeReposItem,
  scopeUsersItem,
} from '@/lib/preferences';
import {
  generateCustomId,
  mergeBuiltins,
  resetTemplatesToDefault,
  type Template,
  templatesItem,
} from '@/lib/templates';

type Tab = 'search' | 'settings';

export default function OptionsApp() {
  const [tab, setTab] = useState<Tab>('search');
  const [stored, setStored] = useStorage(templatesItem);
  const [displayMode, setDisplayMode] = useStorage(displayModeItem);
  const [orgs, setOrgs] = useStorage(scopeOrgsItem);
  const [users, setUsers] = useStorage(scopeUsersItem);
  const [repos, setRepos] = useStorage(scopeReposItem);
  const [quickSearch, setQuickSearch] = useStorage(quickSearchItem);
  const templates = mergeBuiltins(stored);

  const setEnabled = (id: string, enabled: boolean) => {
    setStored(templates.map((t) => (t.id === id ? { ...t, enabled } : t)));
  };

  const updateTemplate = (id: string, patch: Partial<Pick<Template, 'name' | 'pattern'>>) => {
    setStored(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTemplate = (id: string) => {
    setStored(templates.filter((t) => t.id !== id));
  };

  const addTemplate = (name: string, pattern: string) => {
    setStored([
      ...templates,
      {
        id: generateCustomId(),
        name,
        pattern,
        enabled: true,
        builtin: false,
      },
    ]);
  };

  const resetBuiltins = async () => {
    if (!confirm('組み込みテンプレートを初期状態に戻します（カスタムは保持）。よろしいですか？'))
      return;
    await resetTemplatesToDefault();
  };

  const builtins = templates.filter((t) => t.builtin);
  const customs = templates.filter((t) => !t.builtin);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">GitHub Search Extension — Options</h1>

        <Tabs current={tab} onChange={setTab} />

        {tab === 'search' && (
          <>
            <Section title="Scope（検索範囲）">
              <p className="text-xs text-gray-400 mb-3">
                コンマ区切りで複数指定可能。Side Panel の Scope ボタンで切り替えます。
              </p>
              <ScopeInput label="Org" value={orgs} onChange={setOrgs} placeholder="apache,google" />
              <ScopeInput
                label="User"
                value={users}
                onChange={setUsers}
                placeholder="torvalds,gaearon"
              />
              <ScopeInput
                label="Repo"
                value={repos}
                onChange={setRepos}
                placeholder="vercel/next.js,facebook/react"
              />
            </Section>

            <Section
              title="組み込みテンプレート"
              right={
                <button
                  type="button"
                  onClick={resetBuiltins}
                  className="text-xs text-amber-300 hover:text-amber-200 focus:outline-none"
                >
                  初期化
                </button>
              }
            >
              <ul className="divide-y divide-gray-800">
                {builtins.map((t) => (
                  <BuiltinRow
                    key={t.id}
                    template={t}
                    onToggle={(enabled) => setEnabled(t.id, enabled)}
                  />
                ))}
              </ul>
            </Section>

            <Section title="カスタムテンプレート">
              <p className="text-xs text-gray-400 mb-3">
                <code className="px-1.5 py-0.5 rounded bg-gray-800 text-blue-300">%s</code>{' '}
                プレースホルダや
                <code className="mx-1 px-1.5 py-0.5 rounded bg-gray-800 text-blue-300">
                  {'{{Nd}}'}
                </code>
                （N 日前の日付に展開）が利用できます。
              </p>
              {customs.length === 0 ? (
                <p className="text-sm text-gray-500">まだカスタムテンプレートはありません</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {customs.map((t) => (
                    <CustomRow
                      key={t.id}
                      template={t}
                      onToggle={(enabled) => setEnabled(t.id, enabled)}
                      onUpdate={(patch) => updateTemplate(t.id, patch)}
                      onRemove={() => removeTemplate(t.id)}
                    />
                  ))}
                </ul>
              )}
              <AddTemplateForm onAdd={addTemplate} />
            </Section>
          </>
        )}

        {tab === 'settings' && (
          <>
            <Section title="表示モード">
              <DisplayModePicker value={displayMode} onChange={setDisplayMode} />
            </Section>

            <Section title="クイック検索（コンテキストメニュー / オムニボックス）">
              <p className="text-xs text-gray-400 mb-3">
                右クリック → "GitHub Search" や、アドレスバーで{' '}
                <code className="px-1.5 py-0.5 rounded bg-gray-800 text-blue-300">
                  gse &lt;キーワード&gt;
                </code>{' '}
                を入力したときの挙動です。
              </p>
              <QuickSearchEditor value={quickSearch} onChange={setQuickSearch} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

const Tabs = ({ current, onChange }: { current: Tab; onChange: (next: Tab) => void }) => {
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'search', label: '検索オプション' },
    { id: 'settings', label: '設定' },
  ];
  return (
    <div className="flex border-b border-gray-800 mb-6">
      {tabs.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 text-sm font-medium focus:outline-none border-b-2 ${
              active
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

const ScopeInput = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) => {
  const id = useId();
  return (
    <div className="flex items-center gap-3 mb-2">
      <label htmlFor={id} className="w-12 text-sm text-gray-300 font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-gray-900 border border-gray-700 rounded px-2 py-1 font-mono focus:outline-none focus:border-blue-400"
      />
    </div>
  );
};

const DisplayModePicker = ({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (next: DisplayMode) => void;
}) => {
  const options: Array<{ value: DisplayMode; label: string; hint: string }> = [
    { value: 'popup', label: 'Popup', hint: 'ツールバーアイコンクリックで小さなポップアップ' },
    {
      value: 'sidepanel',
      label: 'Side Panel',
      hint: 'ブラウザ右側のサイドパネルに常駐表示（Chrome のみ）',
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
              active
                ? 'border-blue-400 bg-blue-900/30'
                : 'border-gray-700 bg-gray-900 hover:border-gray-500'
            }`}
          >
            <input
              type="radio"
              name="display-mode"
              checked={active}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-blue-500"
            />
            <div>
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{opt.hint}</div>
            </div>
          </label>
        );
      })}
    </div>
  );
};

const QuickSearchEditor = ({
  value,
  onChange,
}: {
  value: QuickSearchConfig;
  onChange: (next: QuickSearchConfig) => void;
}) => {
  const typeId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label htmlFor={typeId} className="w-24 text-sm text-gray-300 font-medium">
          検索対象
        </label>
        <select
          id={typeId}
          value={value.searchType}
          onChange={(e) => onChange({ ...value, searchType: e.target.value as SearchType })}
          className="text-sm bg-gray-900 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
        >
          {SEARCH_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <Toggle
        label="Scope を適用"
        hint="設定済みの Org / User / Repo モードを検索クエリに付与"
        checked={value.applyScope}
        onChange={(applyScope) => onChange({ ...value, applyScope })}
      />
      <Toggle
        label="アクティブなテンプレートを適用"
        hint="Side Panel でトグル ON のテンプレートを検索クエリに付与"
        checked={value.applyTemplates}
        onChange={(applyTemplates) => onChange({ ...value, applyTemplates })}
      />
    </div>
  );
};

const Toggle = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) => {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-blue-500"
      />
      <div>
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
};

const Section = ({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) => (
  <section className="mb-8">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {right}
    </div>
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">{children}</div>
  </section>
);

const BuiltinRow = ({
  template,
  onToggle,
}: {
  template: Template;
  onToggle: (enabled: boolean) => void;
}) => {
  const id = useId();
  return (
    <li className="flex items-center justify-between py-2">
      <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={template.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="accent-blue-500"
        />
        <span className="font-medium text-sm">{template.name}</span>
      </label>
      <code className="text-xs text-blue-300 bg-gray-900 px-2 py-0.5 rounded">
        {template.pattern}
      </code>
    </li>
  );
};

const CustomRow = ({
  template,
  onToggle,
  onUpdate,
  onRemove,
}: {
  template: Template;
  onToggle: (enabled: boolean) => void;
  onUpdate: (patch: Partial<Pick<Template, 'name' | 'pattern'>>) => void;
  onRemove: () => void;
}) => {
  const enabledId = useId();
  return (
    <li className="flex items-center gap-3 py-2">
      <input
        id={enabledId}
        type="checkbox"
        checked={template.enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="accent-blue-500"
        aria-label="enabled"
      />
      <input
        type="text"
        value={template.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="w-32 text-sm bg-gray-900 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
        aria-label="name"
      />
      <input
        type="text"
        value={template.pattern}
        onChange={(e) => onUpdate({ pattern: e.target.value })}
        className="flex-1 text-sm bg-gray-900 border border-gray-700 rounded px-2 py-1 font-mono text-blue-300 focus:outline-none focus:border-blue-400"
        aria-label="pattern"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-red-400 hover:text-red-300 focus:outline-none"
      >
        削除
      </button>
    </li>
  );
};

const AddTemplateForm = ({ onAdd }: { onAdd: (name: string, pattern: string) => void }) => {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const nameId = useId();
  const patternId = useId();
  const canSubmit = name.trim() !== '' && pattern.trim() !== '';

  const submit = () => {
    if (!canSubmit) return;
    onAdd(name.trim(), pattern.trim());
    setName('');
    setPattern('');
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-800">
      <div className="text-xs text-gray-400 mb-2">新規追加</div>
      <div className="flex items-center gap-3">
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前"
          className="w-32 text-sm bg-gray-900 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
          aria-label="新規テンプレート名"
        />
        <input
          id={patternId}
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="pattern (例: org:%s)"
          className="flex-1 text-sm bg-gray-900 border border-gray-700 rounded px-2 py-1 font-mono focus:outline-none focus:border-blue-400"
          aria-label="新規テンプレートパターン"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 focus:outline-none"
        >
          追加
        </button>
      </div>
    </div>
  );
};
