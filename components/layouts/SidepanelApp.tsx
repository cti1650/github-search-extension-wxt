import { SearchPanel } from '@/components/SearchPanel';

export default function SidepanelApp() {
  return (
    <div className="bg-gray-800 min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <SearchPanel />
      </div>
    </div>
  );
}
