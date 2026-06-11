import { SCOPE_MODES, type ScopeMode } from '@/lib/preferences';

const labels: Record<ScopeMode, string> = {
  all: 'All',
  org: 'Org',
  user: 'User',
  repo: 'Repo',
};

type Props = {
  orgs: string;
  users: string;
  repos: string;
  value: ScopeMode;
  onChange: (next: ScopeMode) => void;
  showLabel?: boolean;
};

export const ScopeSelector = ({ orgs, users, repos, value, onChange, showLabel = true }: Props) => {
  const sourceByMode: Record<ScopeMode, string> = {
    all: '',
    org: orgs,
    user: users,
    repo: repos,
  };

  return (
    <>
      {showLabel && <div className="mt-3 mb-0.5 text-gray-400 text-xs">Scope</div>}
      <div className="grid grid-cols-4 gap-1">
        {SCOPE_MODES.map((m) => {
          const active = m === value;
          const hasValue = m === 'all' || sourceByMode[m].trim() !== '';
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              title={
                m === 'all'
                  ? 'GitHub 全体を検索'
                  : hasValue
                    ? `${labels[m]}: ${sourceByMode[m]}`
                    : `${labels[m]} 未設定 (Options で設定)`
              }
              className={`text-xs py-1 rounded border focus:outline-none ${
                active
                  ? hasValue
                    ? 'border-blue-400 bg-blue-900/60 text-blue-100'
                    : 'border-amber-500 bg-amber-900/40 text-amber-100'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              {labels[m]}
              {active && !hasValue ? ' ⚠' : ''}
            </button>
          );
        })}
      </div>
    </>
  );
};
