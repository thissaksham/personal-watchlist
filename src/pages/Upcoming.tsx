import { useState, useMemo } from 'react';
import { useWatchlist } from '../context/WatchlistContext';
import { UpcomingCard } from '../components/cards/UpcomingCard';
import { calculateMediaRuntime, TMDB_REGION, type TMDBMedia } from '../lib/tmdb';

// ... (helper functions omitted for brevity, they are unchanged)

const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    // Reset time to start of day for accurate day diff
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

import { SlidingToggle } from '../components/common/SlidingToggle';
import { UpcomingModal } from '../components/modals/UpcomingModal';
import { ManualDateModal } from '../components/modals/ManualDateModal';

export const Upcoming = () => {
    const { watchlist, markAsWatched, dismissFromUpcoming, removeFromWatchlist, updateWatchlistItemMetadata } = useWatchlist();
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<string>('On OTT');
    const [showDatePicker, setShowDatePicker] = useState<any | null>(null);

    // Derived State: Process watchlist into "Upcoming" items
    const upcomingItems = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items = watchlist.map(item => {
            const meta = (item.metadata || {}) as any;
            let targetDate: Date | null = null;
            let seasonInfo = '';
            let providerLogo = null;

            // Check if dismissed
            if (meta.dismissed_from_upcoming) return null;

            // Extract Provider (IN region) - Robust check for multiple possible keys
            const providerInfo = meta['watch/providers'] || meta['watch_providers'] || meta['providers'];
            const regionData = providerInfo?.results?.[TMDB_REGION] || {};
            const flatrate = regionData.flatrate || [];
            const ads = regionData.ads || [];
            const free = regionData.free || [];
            const rent = regionData.rent || [];
            const buy = regionData.buy || [];
            const allStreamingOrRental = [...flatrate, ...ads, ...free, ...rent, ...buy];

            // Step 1: If currently streaming or rentable/buyable, skip from upcoming (movie-specific)
            if (item.type === 'movie' && allStreamingOrRental.length > 0) {
                return null;
            }

            // If there are streaming providers, capture the logo for display if needed later
            if (allStreamingOrRental.length > 0) {
                providerLogo = allStreamingOrRental[0].logo_path;
            }

            let category: 'ott' | 'theatrical' | 'other' = 'other';

            if (item.type === 'movie') {
                const digitalDateStr = meta.digital_release_date;
                const theatricalDateStr = meta.theatrical_release_date;
                const releaseDateStr = meta.release_date;

                const dDate = digitalDateStr ? new Date(digitalDateStr) : null;
                const tDate = theatricalDateStr ? new Date(theatricalDateStr) : null;
                const rDate = releaseDateStr ? new Date(releaseDateStr) : null;

                // Step 2: Upcoming OTT Release Date Mentioned
                if (dDate && dDate > today) {
                    category = 'ott';
                    targetDate = dDate;
                    seasonInfo = '';
                }
                // Step 3: Else (Theatrical or Fallback)
                else {
                    category = 'theatrical';
                    // Determine best target date and label for Step 3
                    if (tDate) {
                        targetDate = tDate;
                        seasonInfo = tDate > today ? 'Releasing in Theatres' : 'Released';
                    } else if (dDate) {
                        // Past digital date but no active providers (else Step 1 would have caught it)
                        targetDate = dDate;
                        seasonInfo = 'Released';
                    } else if (rDate) {
                        targetDate = rDate;
                        seasonInfo = rDate > today ? 'Coming Soon' : 'Released';
                    } else {
                        // Catch-all today
                        targetDate = today;
                        seasonInfo = 'Released';
                    }
                }
            }
            // Logic for TV Shows (Always OTT)
            else if (item.type === 'show') {
                category = 'ott';
                const nextEp = meta.next_episode_to_air;
                if (nextEp && nextEp.air_date) {
                    const airDate = new Date(nextEp.air_date);
                    targetDate = airDate;
                    if (airDate >= today) {
                        seasonInfo = nextEp.episode_number === 1 ? 'New Season' : 'New Episode';
                    } else {
                        seasonInfo = 'Now Airing';
                    }
                }
            }

            if (!targetDate) return null;

            // Calculate runtime/binge time (approx)
            const runtime = calculateMediaRuntime(item);

            return {
                ...meta, // Pass full metadata for Modal to work nicely initially
                id: item.tmdb_id, // Use TMDB ID (number) not Supabase UUID
                supabaseId: item.id, // Keep UUID if needed
                title: item.title,
                date: targetDate.toISOString(),
                tmdbMediaType: item.type === 'movie' ? 'movie' : 'tv', // For Modal
                totalHours: runtime,
                seasonInfo,
                providerLogo,
                tabCategory: category
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Apply View Mode Filter
        return items.filter(item => {
            const meta = item as any;

            // Critical Change: Items stay in Upcoming until explicitly moved
            const isAcknowledged = meta.moved_to_library === true;

            if (viewMode === 'On OTT') {
                return item.tabCategory === 'ott' && !isAcknowledged;
            }
            if (viewMode === 'Coming Soon') {
                return item.tabCategory === 'theatrical' && !isAcknowledged;
            }
            return !isAcknowledged;
        });
    }, [watchlist, viewMode]);

    const handleMoveToLibrary = async (media: any) => {
        const item = watchlist.find(i => i.tmdb_id === media.id && i.type === (media.tmdbMediaType === 'movie' ? 'movie' : 'show'));
        if (!item) return;

        await updateWatchlistItemMetadata(Number(media.id), item.type, {
            ...item.metadata,
            moved_to_library: true
        });
    };

    const handleSaveManualDate = async (date: string, ottName: string) => {
        if (!showDatePicker) return;

        const item = watchlist.find(i => i.tmdb_id === showDatePicker.id && i.type === showDatePicker.tmdbMediaType);
        if (!item) return;

        const newMeta = {
            ...(item.metadata || {}),
            digital_release_date: date,
            manual_ott_name: ottName,
            manual_date_override: true
        };

        await updateWatchlistItemMetadata(showDatePicker.id, showDatePicker.tmdbMediaType, newMeta);
    };

    return (
        <div className="animate-fade-in pb-20 relative min-h-screen">
            <div className="page-header flex justify-between items-end mb-10 pt-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 tracking-tight">
                        Upcoming
                    </h1>
                    <p className="text-lg text-gray-400 mt-2 font-medium">
                        Your personalized release calendar.
                    </p>
                </div>
                <SlidingToggle
                    options={['On OTT', 'Coming Soon']}
                    activeOption={viewMode}
                    onToggle={setViewMode}
                />
            </div>

            {upcomingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/5 mt-10">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 text-3xl">📅</div>
                    <h2 className="text-2xl font-bold text-white mb-2">No Upcoming Releases</h2>
                    <p className="text-gray-400 max-w-md">
                        {viewMode === 'On OTT'
                            ? "No upcoming digital releases found. Check 'Coming Soon' for theatrical releases!"
                            : "No upcoming theatrical releases found."}
                    </p>
                </div>
            ) : (
                <div className="media-grid">
                    {upcomingItems.map((show: any) => (
                        <div key={show.id} className="relative group/upcoming">
                            <UpcomingCard
                                media={{
                                    ...show,
                                    id: Number(show.id),
                                    vote_average: show.vote_average || 0,
                                    countdown: getDaysUntil(show.date),
                                }}
                                onRemove={() => {
                                    if (show.tmdbMediaType === 'movie') {
                                        if (window.confirm(`Delete ${show.title} from your watchlist completely?`)) {
                                            removeFromWatchlist(Number(show.id), 'movie');
                                        }
                                    } else {
                                        if (window.confirm(`Hide ${show.title} from upcoming list? (It will remain in your library)`)) {
                                            dismissFromUpcoming(Number(show.id), 'show');
                                        }
                                    }
                                }}
                                onMarkWatched={() => {
                                    markAsWatched(Number(show.id), show.tmdbMediaType === 'movie' ? 'movie' : 'show');
                                }}
                                onSetDate={(media: TMDBMedia) => {
                                    setShowDatePicker(media);
                                }}
                                onMoveToLibrary={handleMoveToLibrary}
                                showDateOverride={viewMode === 'Coming Soon'}
                                onClick={() => setSelectedMedia(show)}
                            />
                            <div className="absolute -bottom-6 left-0 w-full text-center opacity-0 group-hover/upcoming:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <span className="text-[10px] font-bold text-teal-400 bg-black/80 px-2 py-1 rounded-full border border-teal-500/20 backdrop-blur-sm">
                                    {formatDate(show.date)}
                                    <span className="text-white"> &bull; {show.seasonInfo || (show.tmdbMediaType === 'movie' ? 'Movie' : 'Season')}</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB Removed - Global Add replaces it. Random not strictly needed here or can be added back if requested. */}

            {selectedMedia && (
                <UpcomingModal
                    media={selectedMedia}
                    type={selectedMedia.tmdbMediaType}
                    onClose={() => setSelectedMedia(null)}
                />
            )}

            {showDatePicker && (
                <ManualDateModal
                    media={showDatePicker}
                    onClose={() => setShowDatePicker(null)}
                    onSave={handleSaveManualDate}
                />
            )}
        </div>
    );
};

