import { List, LayoutGrid } from 'lucide-react';

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="view-toggle">
      <button className={view === 'list' ? 'active' : ''} onClick={() => onChange('list')} title="List view">
        <List size={13} />
      </button>
      <button className={view === 'grid' ? 'active' : ''} onClick={() => onChange('grid')} title="Grid view">
        <LayoutGrid size={13} />
      </button>
    </div>
  );
}
