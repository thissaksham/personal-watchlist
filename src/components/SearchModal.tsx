import { useState, useEffect } from 'react';
import { Search, X, Loader, Plus } from 'lucide-react';
import { tmdb, type TMDBMedia } from '../lib/tmdb';
import { useWatchlist } from '../context/WatchlistContext';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'movie' | 'tv' | 'multi'; // Context sensitive search
    onSuccess?: (media: TMDBMedia) => void;
    initialQuery?: string;
}

export const SearchModal = ({ isOpen, onClose, type, onSuccess, initialQuery = '' }: SearchModalProps) => {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<TMDBMedia[]>([]);
    const [loading, setLoading] = useState(false);
    const { addToWatchlist, isInWatchlist } = useWatchlist();

    useEffect(() => {
        if (isOpen && initialQuery) {
            setQuery(initialQuery);
        } else if (isOpen && !initialQuery) {
            // If opened without query, maybe clear or keep previous?
            // Usually better to start fresh or keep input if user typed in header.
            // If initialQuery is passed, use it.
        }
    }, [isOpen, initialQuery]);

    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                // @ts-ignore
                const data = await tmdb.search(query, type as 'movie' | 'tv');
                let rawResults = data.results || [];

                // Filter for "Next Release Date Known" (Client-side)
                // We keep items that have a release_date or first_air_date
                // AND we sort them by popularity to keep good results at top
                rawResults = rawResults.filter((item: TMDBMedia) => {
                    return !!(item.release_date || item.first_air_date);
                });

                setResults(rawResults);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(performSearch, 500);
        return () => clearTimeout(timer);
    }, [query, type]);

    const handleAdd = async (media: TMDBMedia) => {
        let targetType: 'movie' | 'show';

        if (type === 'multi') {
            // For multi search, rely on media_type property from result
            if (media.media_type === 'movie') targetType = 'movie';
            else if (media.media_type === 'tv') targetType = 'show';
            else return; // Unknown type
        } else {
            targetType = type === 'tv' ? 'show' : 'movie';
        }

        if (isInWatchlist(media.id, targetType)) return;
        await addToWatchlist(media, targetType);
        if (onSuccess) onSuccess(media);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="search-modal-content" onClick={e => e.stopPropagation()}>
                <div className="search-header">
                    <Search className="text-gray-400" size={20} />
                    <input
                        autoFocus
                        type="text"
                        placeholder={type === 'multi' ? "Search for movies or TV shows..." : `Search for a ${type === 'movie' ? 'movie' : 'TV show'} to add...`}
                        className="search-modal-input"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="search-results">
                    {loading && (
                        <div className="u-full-center py-8">
                            <Loader className="animate-spin text-[var(--primary)]" />
                        </div>
                    )}

                    {!loading && results.length === 0 && query && (
                        <div className="text-center py-8 text-gray-500">
                            No results found.
                        </div>
                    )}

                    {!loading && !query && (
                        <div className="text-center py-8 text-gray-500">
                            Type to search...
                        </div>
                    )}

                    {results.map(media => {
                        const itemType = type === 'multi' ? (media.media_type === 'tv' ? 'show' : 'movie') : (type === 'tv' ? 'show' : 'movie');
                        const displayTitle = media.title || media.name || 'Unknown';
                        const posterUrl = media.poster_path
                            ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w92${media.poster_path}`)
                            : `https://placehold.co/92x138/1f2937/ffffff?text=${encodeURIComponent(displayTitle)}`;

                        return (
                            <div
                                key={media.id}
                                className="search-result-item group"
                                onClick={() => {
                                    if (!isInWatchlist(Number(media.id), itemType)) {
                                        handleAdd(media);
                                    }
                                }}
                            >
                                <img
                                    src={posterUrl}
                                    alt={media.title || media.name}
                                    className="search-poster"
                                />
                                <div className="search-info">
                                    <div className="flex items-center justify-between">
                                        <h4 className="search-title group-hover:text-[var(--primary)] transition-colors">
                                            {media.title || media.name}
                                        </h4>
                                    </div>
                                    <p className="search-meta">
                                        {(media.release_date || media.first_air_date)?.substring(0, 4)} • ⭐ {media.vote_average?.toFixed(1) || '0.0'}
                                    </p>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{media.overview}</p>
                                </div>
                                <div className="flex items-center px-2">
                                    {isInWatchlist(Number(media.id), itemType) ? (
                                        <span className="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                                            Added
                                        </span>
                                    ) : (
                                        <button
                                            className="p-2 rounded-full bg-[var(--surface-hover)] hover:bg-[var(--primary)] text-white transition-all"
                                            title="Add to Library"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
