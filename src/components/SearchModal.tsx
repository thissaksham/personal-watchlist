import { useState, useEffect, useRef } from 'react';
import { Search, X, LoaderCircle } from 'lucide-react';
import { tmdb, type TMDBMedia } from '../lib/tmdb';
import { useWatchlist } from '../context/WatchlistContext';
import { SlidingToggle } from './common/SlidingToggle';
import { DiscoveryCard } from './cards/DiscoveryCard';
import { usePreferences } from '../context/PreferencesContext';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'movie' | 'tv' | 'multi';
    onSuccess?: (media: TMDBMedia) => void;
    initialQuery?: string;
}

export const SearchModal = ({ isOpen, onClose, type: initialType, onSuccess, initialQuery = '' }: SearchModalProps) => {
    const [query, setQuery] = useState(initialQuery);
    const [searchType, setSearchType] = useState<'multi' | 'movie' | 'tv'>(initialType);
    const [results, setResults] = useState<TMDBMedia[]>([]);
    const [trending, setTrending] = useState<TMDBMedia[]>([]);
    const [loading, setLoading] = useState(false);

    const { addToWatchlist, isInWatchlist } = useWatchlist();
    const { region } = usePreferences();

    // Removed useEffect for initialQuery as useState handles it now.

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            setSearchType(initialType);
            setResults([]);
        }
    }, [isOpen, initialType, initialQuery]);

    // Fetch trending on mount or when open
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const tmdbType = searchType === 'multi' ? 'all' : (searchType === 'tv' ? 'tv' : 'movie');
            tmdb.getTrending(tmdbType as any, 'week', region)
                .then(data => {
                    setTrending(data.results || []);
                })
                .finally(() => setLoading(false));

            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, searchType, region]);

    // Search Logic with Instant Tab Switching
    const prevSearchType = useRef(searchType);

    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const data = await tmdb.search(query, searchType, region);
                setResults(data.results || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        // If searchType changed but query is the same, fetch immediately
        if (prevSearchType.current !== searchType && query.trim()) {
            prevSearchType.current = searchType;
            performSearch();
            return;
        }

        prevSearchType.current = searchType;
        const timer = setTimeout(() => performSearch(), 500);
        return () => clearTimeout(timer);
    }, [query, searchType, region]);

    const handleAdd = async (media: TMDBMedia) => {
        const mediaType = media.media_type || (searchType === 'tv' ? 'tv' : 'movie');
        const targetType: 'movie' | 'show' = mediaType === 'tv' ? 'show' : 'movie';

        if (isInWatchlist(media.id, targetType)) return;
        addToWatchlist(media, targetType); // Fire and forget for instant close
        if (onSuccess) onSuccess(media);
        onClose();
    };

    if (!isOpen) return null;

    const displayResults = query.trim() ? results : trending;
    const itemsToShow = displayResults
        .filter(item => {
            // 1. Strict Filter: Remove People and Junk
            const isPerson = item.media_type === 'person';
            if (isPerson) return false;

            const hasPoster = !!item.poster_path;
            const hasVotes = (item.vote_count || 0) > 0;
            const hasPopularity = (item.popularity || 0) > 1;

            // MUST have a poster. If it has a poster, it should also have SOME engagement.
            // Exception: If it's very popular (upcoming?) but maybe metrics lag? Usually not.
            // Rule: Must have Poster AND (Popularity > 1 OR Votes > 0)
            if (!hasPoster) return false;
            if (!hasVotes && !hasPopularity) return false;

            // 2. Filter by media_type if searchType is not 'multi'
            if (searchType !== 'multi') {
                const itemMediaType = item.media_type || searchType;
                return itemMediaType === searchType;
            }
            return true;
        })
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Force Popularity Sort

    return (
        <div className="search-overlay animate-fade-in" onClick={onClose}>
            {/* Centered Search Container */}
            <div className="search-container" onClick={e => e.stopPropagation()}>

                {/* Close Button Top Right */}
                <button className="search-close-top" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="search-content-wrapper">
                    <div className="search-bar-hero">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" size={28} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search for movies, TV shows..."
                                className="search-hero-input"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            {loading && <LoaderCircle className="animate-spin text-teal-400" size={24} />}
                        </div>

                        <div className="search-filters">
                            <SlidingToggle
                                options={['All', 'Movies', 'TV Shows']}
                                activeOption={searchType === 'multi' ? 'All' : (searchType === 'movie' ? 'Movies' : 'TV Shows')}
                                onToggle={(val) => {
                                    if (val === 'All') setSearchType('multi');
                                    else if (val === 'Movies') setSearchType('movie');
                                    else setSearchType('tv');
                                }}
                            />
                        </div>
                    </div>

                    <div className="search-results-grid no-scrollbar">
                        <div className="grid-header">
                            <h3 className="text-xl font-bold text-white mb-6">
                                {query.trim() ? '' : 'Trending Now'}
                            </h3>
                        </div>

                        {itemsToShow.length === 0 && !loading ? (
                            <div className="text-center py-20 text-gray-400">
                                No discovery found. Try a different search!
                            </div>
                        ) : (
                            <div className={`media-grid ${loading ? 'loading-state' : ''}`}>
                                {itemsToShow.map(media => {
                                    const mType = media.media_type || (searchType === 'tv' ? 'tv' : 'movie');
                                    const targetType = mType === 'tv' ? 'show' : 'movie';

                                    return (
                                        <DiscoveryCard
                                            key={media.id}
                                            media={media}
                                            isAdded={isInWatchlist(media.id, targetType)}
                                            onAdd={() => handleAdd(media)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
