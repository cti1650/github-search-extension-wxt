import { Buttons } from '@/components/Buttons';
import { Layout } from '@/components/Layout';
import { TextBox } from '@/components/TextBox';
import { useStorage } from '@/hooks/useStorage';
import { buildGitHubSearch, type SearchType } from '@/lib/githubSearch';
import { exclusionKeywordItem, extensionKeywordItem, keywordItem } from '@/lib/storage';

export default function PopupApp() {
  const [keyword] = useStorage(keywordItem);
  const [exclusionKeyword] = useStorage(exclusionKeywordItem);
  const [extensionKeyword] = useStorage(extensionKeywordItem);

  const handleClick = (label: string) => {
    const { open } = buildGitHubSearch({ keyword, exclusionKeyword, extensionKeyword });
    open(label as SearchType);
  };

  return (
    <div className="bg-gray-800 p-4">
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
        <Buttons
          label="Search Type"
          buttons={[
            { label: 'Code', onClick: handleClick },
            { label: 'Repositories', onClick: handleClick },
          ]}
        />
      </Layout>
    </div>
  );
}
