const CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Clothing', 'Sports', 'Toys', 'Beauty', 'Automotive'];

export default function CategoryChips({ active, onChange }) {
  return (
    <div className="category-row">
      <button
       className={`chip ${!active ? 'active' : ''}`}
        onClick={() => onChange('')}
      >
        ALL
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          className={`chip ${active === c ? 'active' : ''}`}
          onClick={() => onChange(active === c ? '' : c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
