import { useState, useEffect } from 'react';
import { Search, X, LoaderCircle } from 'lucide-react';
import { useSearch } from '../../media/hooks/useTMDB';
import { useDebounce } from '../hooks/useDebounce';
import type { TMDBMedia } from '../../../lib/tmdb';
import { useWatchlist } from '../../watchlist/context/WatchlistContext';
import { SlidingToggle } from '../../../components/ui/SlidingToggle';
import { DiscoveryCard } from '../../media/components/cards/DiscoveryCard';


interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'movie' | 'tv' | 'multi';
    onSuccess?: (media: TMDBMedia) => void;
    initialQuery?: string;
}

export const SearchModal = ({ isOpen, onClose, type: initialType, onSuccess, initialQuery = '' }: SearchModalProps) => {
    const [query, setQuery] = useState(initialQuery);
    const [searchType, setSearchType] = useState<'multi' | 'movie' | 'tv' | 'game'>(initialType === 'multi' ? 'movie' : initialType);

    // Debounce query to prevent excessive API calls
    const debouncedQuery = useDebounce(query, 500);

    // React Query Hook - Only search if not 'game'
    const { data, isLoading } = useSearch(debouncedQuery, searchType === 'game' ? 'multi' : searchType as 'multi' | 'movie' | 'tv');

    // If game, force results empty for now
    const results = searchType === 'game' ? [] : ((data?.results as TMDBMedia[]) || []);

    const { addToWatchlist, isInWatchlist } = useWatchlist();

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setQuery(initialQuery);
            // Default to Movie if 'multi' was passed, or stick to provided type
            setSearchType(initialType === 'multi' ? 'movie' : initialType);
        }
    }, [isOpen, initialType, initialQuery]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleAdd = async (media: TMDBMedia) => {
        const mediaType = media.media_type || (searchType === 'tv' ? 'tv' : 'movie');
        const targetType: 'movie' | 'show' = mediaType === 'tv' ? 'show' : 'movie';

        if (isInWatchlist(media.id, targetType)) return;
        addToWatchlist(media, targetType); // Fire and forget for instant close
        if (onSuccess) onSuccess(media);
        onClose();
    };

    if (!isOpen) return null;

    const displayResults = query.trim() ? results : [];
    const itemsToShow = displayResults.filter(item => {
        // Relaxed Filter: Allow items without a date or poster
        // DiscoveryCard handles missing posters with a placeholder.

        // Filter by media_type if searchType is not 'multi' (and not 'game')
        if (searchType !== 'multi' && searchType !== 'game') {
            // If media_type is missing, assume it matches searchType for specific categories
            const itemMediaType = item.media_type || searchType;
            return itemMediaType === searchType;
        }
        return true;
    });

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
                                placeholder={searchType === 'game' ? "Search for games..." : "Search for movies, TV shows..."}
                                className="search-hero-input"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            {isLoading && searchType !== 'game' && <LoaderCircle className="animate-spin text-teal-400" size={24} />}
                        </div>

                        <div className="search-filters">
                            <SlidingToggle
                                options={['Movies', 'TV Shows', 'Games']}
                                activeOption={
                                    searchType === 'movie' ? 'Movies' :
                                        searchType === 'tv' ? 'TV Shows' :
                                            searchType === 'game' ? 'Games' : 'Movies'
                                }
                                onToggle={(val) => {
                                    if (val === 'Movies') setSearchType('movie');
                                    else if (val === 'TV Shows') setSearchType('tv');
                                    else if (val === 'Games') setSearchType('game');
                                }}
                            />
                        </div>
                    </div>

                    <div className="search-results-grid no-scrollbar">
                        <div className="grid-header">
                            {/* 'Trending Now' removed */}
                        </div>

                        {searchType === 'game' ? (
                            <div className="text-center py-20 text-gray-400">
                                <h3 className="text-xl font-bold text-white mb-2">Games Coming Soon</h3>
                                <p>Game tracking will be powered by a dedicated API.</p>
                            </div>
                        ) : (
                            itemsToShow.length === 0 && !isLoading && query.trim() ? (
                                <div className="text-center py-20 text-gray-400">
                                    No discovery found. Try a different search!
                                </div>
                            ) : (
                                <div className={`media-grid ${isLoading ? 'loading-state' : ''}`}>
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
                            )
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
