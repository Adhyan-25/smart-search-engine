export default function ResultSkeleton({ count = 5 }) {
  return (
    <div className="results-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-line title" />
          <div className="skeleton-line snippet" />
        </div>
      ))}
    </div>
  );
}
