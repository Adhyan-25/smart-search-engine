import Highlight from './Highlight';

export default function ResultRow({ product, query }) {
  return (
    <div className="result-row">
      <div className="title"><Highlight text={product.title} query={query} /></div>
      {product.description && (
        <div className="snippet">
          <Highlight text={product.description} query={query} />
        </div>
      )}
      <div className="meta-line">
        <span className="tag">{product.category}</span>
        <span>★ {product.rating}</span>
        {product._relevance ? <span>relevance {product._relevance.score}</span> : null}
      </div>
    </div>
  );
}
