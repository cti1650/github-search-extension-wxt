import { useCallback, useState } from 'react';
import { Buttons } from '@/components/Buttons';
import { Layout } from '@/components/Layout';
import { ScopeSelector } from '@/components/ScopeSelector';
import { TemplateChips } from '@/components/TemplateChips';
import { TextBox } from '@/components/TextBox';
import { useStorage } from '@/hooks/useStorage';
import {
  type ActiveTemplate,
  buildGitHubSearch,
  SEARCH_TYPES,
  type SearchType,
} from '@/lib/githubSearch';
import {
  buildScopeClause,
  scopeModeItem,
  scopeOrgsItem,
  scopeReposItem,
  scopeUsersItem,
} from '@/lib/preferences';
import { exclusionKeywordItem, extensionKeywordItem, keywordItem } from '@/lib/storage';

type Props = {
  searchTypes?: readonly SearchType[];
};

export const SearchPanel = ({ searchTypes = SEARCH_TYPES }: Props) => {
  const [keyword] = useStorage(keywordItem);
  const [exclusionKeyword] = useStorage(exclusionKeywordItem);
  const [extensionKeyword] = useStorage(extensionKeywordItem);
  const [scopeMode] = useStorage(scopeModeItem);
  const [orgs] = useStorage(scopeOrgsItem);
  const [users] = useStorage(scopeUsersItem);
  const [repos] = useStorage(scopeReposItem);
  const [activeTemplates, setActiveTemplates] = useState<ActiveTemplate[]>([]);

  const handleClick = (label: string) => {
    const scopeClause = buildScopeClause(scopeMode, orgs, users, repos);
    const { open } = buildGitHubSearch({
      keyword,
      exclusionKeyword,
      extensionKeyword,
      templates: activeTemplates,
      scopeClause,
    });
    open(label as SearchType);
  };

  const openOptions = () => {
    void browser.runtime.openOptionsPage();
  };

  const handleActivationChange = useCallback((next: ActiveTemplate[]) => {
    setActiveTemplates(next);
  }, []);

  return (
    <Layout title="GitHub Search Extension">
      <TextBox
        label="Keyword"
        placeholder="Search or jump to… ( keyword )"
        holder="search_keyword"
      />
      <TextBox
        label="Exclusion"
        placeholder="Add keywords for searching ( -keyword )"
        holder="search_exclusion_keyword"
      />
      <TextBox
        label="File or Extension"
        placeholder="file extension keyword ( tsx,ts )"
        holder="search_file_extension_keyword"
      />
      <ScopeSelector orgs={orgs} users={users} repos={repos} />
      <Buttons
        label="Search Type"
        buttons={searchTypes.map((type) => ({
          label: type,
          onClick: handleClick,
        }))}
      />
      <div className="mt-3 flex justify-between items-center">
        <span className="text-gray-400 text-xs">Templates</span>
        <button
          type="button"
          onClick={openOptions}
          className="text-gray-400 hover:text-blue-400 text-xs focus:outline-none"
        >
          Manage ⚙
        </button>
      </div>
      <TemplateChips onActivationChange={handleActivationChange} />
    </Layout>
  );
};
