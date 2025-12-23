import { useState, useMemo, useEffect } from 'react';
import { useWatchlist } from '../context/WatchlistContext';
import { WatchlistCard } from '../components/cards/WatchlistCard';
import { Search, Archive, Trash2, Undo2 } from 'lucide-react';
import { SlidingToggle } from '../components/common/SlidingToggle';
import { MovieModal } from '../components/modals/MovieModal';
import { ShowModal } from '../components/modals/ShowModal';
import { type TMDBMedia } from '../lib/tmdb';

export const DroppedPage = () => {
    const { watchlist, removeFromWatchlist, restoreFromDropped } = useWatchlist();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
    // Default to 'movie', following the 3-way toggle request (Movies, Shows, Games)
    const [selectedType, setSelectedType] = useState<'movie' | 'show' | 'game'>('movie');

    // Sync tab title
    useEffect(() => {
        document.title = 'CineTrack | Dropped';
    }, []);

    // Filter Dropped Items
    const droppedItems = useMemo(() => {
        return watchlist.filter(item => {
            // Check status
            const isDropped = item.status === 'show_dropped' || item.status === 'movie_dropped';
            if (!isDropped) return false;

            // Check Type (Strict 3-way toggle)
            if (selectedType === 'game') return false; // Not implemented yet
            if (item.type !== selectedType) return false;

            // Check Search
            if (searchTerm.trim()) {
                const matchesTitle = item.title.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesTitle;
            }

            return true;
        }).sort((a, b) => b.id.localeCompare(a.id));
    }, [watchlist, selectedType, searchTerm]);

    const handleRestore = async (item: any) => {
        if (window.confirm(`Restore ${item.title} to your library?`)) {
            await restoreFromDropped(Number(item.tmdb_id), item.type);
        }
    };

    const handleDeletePermanently = async (item: any) => {
        if (window.confirm(`PERMANENTLY DELETE ${item.title}? This cannot be undone.`)) {
            await removeFromWatchlist(Number(item.tmdb_id), item.type);
        }
    };

    return (
        <div className="animate-fade-in pb-20 relative min-h-screen">
            <div className="page-header flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-white to-red-400/50 tracking-tight flex items-center gap-3">
                        <Archive className="text-red-400" size={36} />
                        Dropped
                    </h1>
                    <p className="subtitle text-gray-400 mt-1 font-medium">
                        Shows and movies you've stopped watching.
                    </p>
                </div>

                {/* Filter & Search */}
                <div
                    className="flex items-center"
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px' }}
                >
                    {/* 3-Way Toggle */}
                    <SlidingToggle
                        options={['Movies', 'TV Shows', 'Games']}
                        activeOption={selectedType === 'movie' ? 'Movies' : selectedType === 'show' ? 'TV Shows' : 'Games'}
                        onToggle={(opt) => {
                            if (opt === 'Movies') setSelectedType('movie');
                            if (opt === 'TV Shows') setSelectedType('show');
                            if (opt === 'Games') setSelectedType('game');
                        }}
                    />

                    {/* Search - Styled like LibraryPage */}
                    <div className="search-bar" style={{ position: 'relative', width: '250px' }}>
                        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search dropped..."
                            className="search-input"
                            style={{ width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {droppedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/5 mt-10">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 text-3xl">
                        <Archive size={32} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {selectedType === 'game' ? 'Games Not Implemented Yet' : `No Dropped ${selectedType === 'movie' ? 'Movies' : 'Shows'}`}
                    </h2>
                    <p className="text-gray-400 max-w-md">
                        {selectedType === 'game'
                            ? "We'll be adding game tracking soon!"
                            : "Items you remove/drop from your library will appear here."}
                    </p>
                </div>
            ) : (
                <div className="media-grid">
                    {droppedItems.map((item) => (
                        <div key={item.id} className="relative group/card">
                            <WatchlistCard
                                media={{
                                    ...item.metadata,
                                    id: Number(item.tmdb_id),
                                    title: item.title,
                                    poster_path: item.poster_path,
                                    vote_average: item.vote_average,
                                    media_type: item.type === 'movie' ? 'movie' : 'tv',
                                } as any}
                                onRemove={() => handleDeletePermanently(item)}
                                removeIcon={<Trash2 size={16} />}
                                removeLabel="Delete Permanently"
                                onMarkWatched={() => handleRestore(item)} // Restore
                                actionIcon={<Undo2 size={16} />}
                                actionLabel="Restore to Library"
                                onClick={(m) => setSelectedMedia(m)}
                            />
                            {/* Overlay Label for Clarity */}
                            <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-red-500/80 text-white text-[10px] uppercase font-bold rounded backdrop-blur-md border border-red-400/30">
                                Dropped
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedMedia && (
                selectedMedia.media_type === 'tv' ? (
                    <ShowModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                ) : (
                    <MovieModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                )
            )}
        </div>
    );
}
