import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchSearch, fetchAutocomplete } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { getCached, setCached } from '../utils/clientCache';
import SuggestionsDropdown from '../components/SuggestionsDropdown';
import ResultRow from '../components/ResultRow';
import ResultSkeleton from '../components/ResultSkeleton';
import CategoryChips from '../components/CategoryChips';
import ViewToggle from '../components/ViewToggle';

function getInitialQuery() {
  return new URLSearchParams(window.location.search).get('q') || '';
}

export default function SearchPage() {
  const [inputValue, setInputValue] = useState(getInitialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('list');
  const [status, setStatus] = useState('idle'); // idle | loading | error | done
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [meta, setMeta] = useState(null);

  const inputRef = useRef(null);
  const { recent, addRecent, clearRecent } = useRecentSearches();
  const debouncedQuery = useDebounce(inputValue, 275);
  const hasSearched = inputValue.trim().length > 0 || status !== 'idle';

  // Keyboard shortcut: "/" focuses the search box, like docs sites use.
  useEffect(() => {
    function handler(e) {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setShowSuggestions(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Autocomplete
  useEffect(() => {
    let active = true;
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      return () => { active = false; };
    }
    const cacheKey = `ac:${debouncedQuery}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setSuggestions(cached.suggestions);
      return () => { active = false; };
    }
    fetchAutocomplete(debouncedQuery).then((data) => {
      if (!active) return;
      setCached(cacheKey, data);
      setSuggestions(data.suggestions);
    }).catch(() => {
      if (active) setSuggestions([]);
    });
    return () => { active = false; };
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search
  useEffect(() => {
    let active = true;
    setStatus('loading');

    // Keep the URL shareable/bookmarkable.
    const url = new URL(window.location);
    url.searchParams.set('q', debouncedQuery);
    window.history.replaceState({}, '', url);

    const params = { q: debouncedQuery, page, limit: 12, category };
    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setResults(cached.results);
      setPagination(cached.pagination);
      setMeta(cached._meta);
      setStatus('done');
      return () => { active = false; };
    }
    fetchSearch(params)
      .then((data) => {
        if (!active) return;
        setCached(cacheKey, data);
        setResults(data.results);
        setPagination(data.pagination);
        setMeta({ ...data._meta, cacheSource: data.cacheSource });
        setStatus('done');
        addRecent(debouncedQuery);
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [debouncedQuery, category, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSuggestion = (word) => {
    setInputValue(word);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      selectSuggestion(suggestions[activeIndex].word);
    }
  };

  return (
    <div>
      <div className={`search-hero ${hasSearched ? 'compact' : ''}`}>
        {!hasSearched && <p className="search-tagline">Search anything in the catalog — products, topics, ideas.</p>}

        <div className="search-input-row">
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              ref={inputRef}
              className="search-input"
              placeholder="Search..."
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setPage(1); setShowSuggestions(true); setActiveIndex(-1); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              onKeyDown={handleKeyDown}
            />
            {inputValue ? (
              <button className="clear-btn" onMouseDown={() => { setInputValue(''); setResults([]); setStatus('idle'); }}>
                <X size={15} />
              </button>
            ) : (
              <span className="kbd-hint">/</span>
            )}
          </div>
          {showSuggestions && (
            <SuggestionsDropdown suggestions={suggestions} onSelect={selectSuggestion} activeIndex={activeIndex} />
          )}
        </div>

        {!hasSearched && recent.length > 0 && (
          <div className="recent-row">
            <span className="recent-label">recent:</span>
            {recent.map((r) => (
              <button key={r} className="chip" onClick={() => setInputValue(r)}>{r}</button>
            ))}
            <button className="chip" onClick={clearRecent} title="Clear recent searches">clear</button>
          </div>
        )}

        {hasSearched && <CategoryChips active={category} onChange={(c) => { setCategory(c); setPage(1); }} />}
      </div>

      {hasSearched && (
        <>
          <div className="results-header">
            <div className="results-count">
              {status === 'done' && pagination && (
                <>showing <b>{results.length}</b> of <b>{pagination.totalResults}</b> results</>
              )}
            </div>
            <div className="results-meta-right">
              {meta && (
                <span className={`source-badge ${meta.cacheSource && meta.cacheSource !== 'miss' ? 'hit' : ''}`}>
                  {meta.responseTimeMs}ms · {meta.cacheSource || 'live'}
                </span>
              )}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {status === 'loading' && <ResultSkeleton />}
          {status === 'error' && <div className="state-message">Something went wrong. Try again.</div>}
          {status === 'done' && results.length === 0 && (
            <div className="state-message">No results for "{debouncedQuery}".</div>
          )}

          {status === 'done' && results.length > 0 && (
            <>
              <div className={view === 'list' ? 'results-list' : 'results-grid-view'}>
                {results.map((r) => <ResultRow key={r._id} product={r} query={debouncedQuery} />)}
              </div>
              {pagination && (
                <div className="pagination-row">
                  <button disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                  <span className="page-info">page {pagination.page} / {pagination.totalPages}</span>
                  <button disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
