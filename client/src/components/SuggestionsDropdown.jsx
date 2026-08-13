export default function SuggestionsDropdown({ suggestions, onSelect, activeIndex }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="suggestions-dropdown">
      {suggestions.map((s, i) => (
        <div
          key={s.word}
          className={`suggestion-item ${i === activeIndex ? 'highlighted' : ''}`}
          onMouseDown={() => onSelect(s.word)}
        >
          <span>{s.word}</span>
          <span className="pop">{s.popularity}</span>
        </div>
      ))}
    </div>
  );
}
