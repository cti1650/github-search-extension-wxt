import { useMemo } from 'react';
import { Buttons } from '@/components/Buttons';
import { Layout } from '@/components/Layout';
import { ScopeSelector } from '@/components/ScopeSelector';
import { TemplateChips } from '@/components/TemplateChips';
import { TextBox } from '@/components/TextBox';
import { useStorage } from '@/hooks/useStorage';
import { buildGitHubSearch, SEARCH_TYPES, type SearchType } from '@/lib/githubSearch';
import {
  buildScopeClause,
  scopeModeItem,
  scopeOrgsItem,
  scopeReposItem,
  scopeUsersItem,
} from '@/lib/preferences';
import { exclusionKeywordItem, extensionKeywordItem, keywordItem } from '@/lib/storage';
import {
  computeActiveTemplates,
  mergeBuiltins,
  templateActivationsItem,
  templatesItem,
} from '@/lib/templates';

type Props = {
  searchTypes?: readonly SearchType[];
  showScope?: boolean;
  showTemplates?: boolean;
};

export const SearchPanel = ({
  searchTypes = SEARCH_TYPES,
  showScope = true,
  showTemplates = true,
}: Props) => {
  const [keyword] = useStorage(keywordItem);
  const [exclusionKeyword] = useStorage(exclusionKeywordItem);
  const [extensionKeyword] = useStorage(extensionKeywordItem);
  const [scopeMode, setScopeMode] = useStorage(scopeModeItem);
  const [orgs] = useStorage(scopeOrgsItem);
  const [users] = useStorage(scopeUsersItem);
  const [repos] = useStorage(scopeReposItem);
  const [storedTemplates] = useStorage(templatesItem);
  const [activations] = useStorage(templateActivationsItem);

  // Derive active templates directly from storage — stays in sync across contexts.
  const activeTemplates = useMemo(
    () => computeActiveTemplates(mergeBuiltins(storedTemplates), activations),
    [storedTemplates, activations],
  );

  const handleClick = (label: string) => {
    const scopeClause = showScope ? buildScopeClause(scopeMode, orgs, users, repos) : null;
    const { open } = buildGitHubSearch({
      keyword,
      exclusionKeyword,
      extensionKeyword,
      templates: showTemplates ? activeTemplates : [],
      scopeClause,
    });
    open(label as SearchType);
  };

  // Enter key in any of the text inputs triggers the first (primary) Search Type button.
  const primarySearchType = searchTypes[0];
  const handleSubmit = primarySearchType ? () => handleClick(primarySearchType) : undefined;

  const openOptions = () => {
    void browser.runtime.openOptionsPage();
  };

  return (
    <Layout title="GitHub Search Extension">
      <TextBox
        label="Keyword"
        placeholder="Search or jump to… ( keyword )"
        holder="search_keyword"
        onSubmit={handleSubmit}
      />
      <TextBox
        label="Exclusion"
        placeholder="Add keywords for searching ( -keyword )"
        holder="search_exclusion_keyword"
        onSubmit={handleSubmit}
      />
      <TextBox
        label="File or Extension"
        placeholder="file extension keyword ( tsx,ts )"
        holder="search_file_extension_keyword"
        onSubmit={handleSubmit}
      />
      {showScope && (
        <ScopeSelector
          orgs={orgs}
          users={users}
          repos={repos}
          value={scopeMode}
          onChange={setScopeMode}
        />
      )}
      <Buttons
        label="Search Type"
        buttons={searchTypes.map((type) => ({
          label: type,
          onClick: handleClick,
        }))}
      />
      {showTemplates && (
        <>
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
          <TemplateChips />
        </>
      )}
      {!showScope && !showTemplates && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={openOptions}
            className="text-gray-400 hover:text-blue-400 text-xs focus:outline-none"
          >
            Options ⚙
          </button>
        </div>
      )}
    </Layout>
  );
};
