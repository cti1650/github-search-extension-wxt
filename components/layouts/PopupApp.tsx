import { SearchPanel } from '@/components/SearchPanel';

const POPUP_SEARCH_TYPES = ['Code', 'Repositories'] as const;

export default function PopupApp() {
  return (
    <div className="bg-gray-800 p-4 w-92.5">
      <SearchPanel searchTypes={POPUP_SEARCH_TYPES} />
    </div>
  );
}
