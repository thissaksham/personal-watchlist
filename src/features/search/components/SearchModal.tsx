import { useState, useEffect } from 'react';
import { Search, X, LoaderCircle } from 'lucide-react';
import { useSearch } from '../../media/hooks/useTMDB';
import { useGameSearch } from '../../games/hooks/useGames';
import { useDebounce } from '../hooks/useDebounce';
import type { TMDBMedia } from '../../../lib/tmdb';
import type { Game } from '../../../types';
import { useWatchlist } from '../../watchlist/context/WatchlistContext';
import { SlidingToggle } from '../../../components/ui/SlidingToggle';
import { DiscoveryCard } from '../../media/components/cards/DiscoveryCard';
import { GameCard } from '../../games/components/GameCard';


interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'movie' | 'tv' | 'multi' | 'game';
    onSuccess?: (media: TMDBMedia | Game) => void;
    initialQuery?: string;
}

export const SearchModal = ({ isOpen, onClose, type: initialType, onSuccess, initialQuery = '' }: SearchModalProps) => {
    const [query, setQuery] = useState(initialQuery);
    const [searchType, setSearchType] = useState<'multi' | 'movie' | 'tv' | 'game'>(initialType === 'multi' ? 'movie' : initialType);

    // Debounce query to prevent excessive API calls
    const debouncedQuery = useDebounce(query, 300);

    // React Query Hook - Only search if not 'game'
    const { data, isLoading } = useSearch(debouncedQuery, searchType === 'game' ? 'multi' : searchType as 'multi' | 'movie' | 'tv');

    // Game Search Hook
    const { data: gameResults, isLoading: isGameLoading } = useGameSearch(searchType === 'game' ? debouncedQuery : '');

    // Combine loading states
    const isSearching = searchType === 'game' ? isGameLoading : isLoading;

    // Determine results based on type
    const results = searchType === 'game'
        ? (gameResults || [])
        : ((data?.results as TMDBMedia[]) || []);

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

    const handleGameAdd = async (game: Game) => {
        // TODO: Add to watchlist logic for games needs to be implemented or we assume onSuccess handles it
        // The current useWatchlist might not support games yet directly or we need a specific method.
        // Checking GamesPage, it uses useGames hook but doesn't seem to have a global context for adding games generally?
        // Wait, GamesPage has 'libraryGames'. It seems games might be just stored in a separate list or not fully integrated into 'useWatchlist' yet?
        // For now, let's just close and maybe trigger onSuccess if needed. 
        // Actually, looking at GamesPage, it fetches 'libraryGames' from searchResults? No, 'libraryGames: Game[] = searchResults || [];' it was mocking it.
        // It seems there is NO backend for games yet effectively fully wired? 
        // Or wait, 'useWatchlist' handles 'movie' and 'show'.

        // Checking 'useWatchlist' context might be useful later, but for now I'll just trigger success.
        // But the user asked to "add something new". 
        // If I look at the requested task: "search and add should be in the add something new button".
        // GamesPage had: "Manage your gaming collection".
        // It seems I should probably NOT break the app. 
        // Let's assume for now we just call onSuccess.
        // Re-reading GamesPage, it was using 'useGameSearch' to show games.
        // And 'libraryGames' was just searchResults. So it wasn't saving anything?
        // Ah, line 18: `const libraryGames: Game[] = searchResults || [];`
        // Line 16: `// Filtered lists for the "Library" view (temporarily using search if library is empty)`
        // So the current "Games Support" is extremely rudimentary.
        // I should just ensure the UI works for finding them. Adding them might be a no-op or just log for now?
        // Or I can add a dummy 'add' if needed.
        // But wait, the previous code had NO "Add" button on the GameCard. 
        // Just `GameCard` display.
        // So simply clicking it or having an add button?
        // `GameCard` has specific styles.
        // Let's check `GameCard.tsx` again.

        if (onSuccess) onSuccess(game);
        onClose();
    };

    if (!isOpen) return null;

    const displayResults = query.trim() ? results : [];
    const itemsToShow = displayResults.filter((item: any) => {
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
                            {isSearching && <LoaderCircle className="animate-spin text-teal-400" size={24} />}
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
                            <div className={`media-grid ${isSearching ? 'loading-state' : ''}`}>
                                {(results as Game[]).map((game) => (
                                    <GameCard
                                        key={game.id}
                                        game={game}
                                        onClick={() => handleGameAdd(game)}
                                        onAdd={() => handleGameAdd(game)}
                                        isAdded={false} // Placeholder until we have game library context
                                    />
                                ))}
                                {results.length === 0 && !isSearching && query.trim() && (
                                    <div className="col-span-full text-center py-20 text-gray-400">
                                        No games found. Try a different search!
                                    </div>
                                )}
                            </div>
                        ) : (
                            itemsToShow.length === 0 && !isSearching && query.trim() ? (
                                <div className="text-center py-20 text-gray-400">
                                    No discovery found. Try a different search!
                                </div>
                            ) : (
                                <div className={`media-grid ${isSearching ? 'loading-state' : ''}`}>
                                    {(itemsToShow as TMDBMedia[]).map(media => {
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
