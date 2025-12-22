import { useState, useMemo, useEffect } from 'react';
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
    const { watchlist, markAsWatched, dismissFromUpcoming, removeFromWatchlist, updateWatchlistItemMetadata, updateStatus, moveToLibrary, refreshMetadata } = useWatchlist();
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<string>('On OTT');
    const [showDatePicker, setShowDatePicker] = useState<any | null>(null);
    const [refreshedIds] = useState(new Set<number>());

    // Derived State: Process watchlist into "Upcoming" items
    const upcomingItems = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items = watchlist.map(item => {
            const meta = (item.metadata || {}) as any;

            // Strict Status check first
            // If item is already in Library, skip it.
            // Exclude: watched, unwatched, show_finished, show_ongoing, show_watched, show_watching
            // Exclude: watched, unwatched, show_finished, show_ongoing, show_watched
            if (['watched', 'unwatched', 'dropped', 'show_finished', 'show_ongoing', 'show_watched'].includes(item.status)) return null;

            // ... (rest of metadata extraction for display) ...

            let targetDate: Date | null = null;
            let seasonInfo = '';
            let providerLogo = null;

            // Check if dismissed
            if (meta.dismissed_from_upcoming) return null;

            const providerInfo = meta['watch/providers'] || meta['watch_providers'] || meta['providers'];
            const regionData = providerInfo?.results?.[TMDB_REGION] || {};
            const flatrate = regionData.flatrate || [];
            // ... (rest of provider logic for logo) ...
            const allStreamingOrRental = [...flatrate, ...(regionData.ads || []), ...(regionData.free || []), ...(regionData.rent || []), ...(regionData.buy || [])];

            if (allStreamingOrRental.length > 0) {
                providerLogo = allStreamingOrRental[0].logo_path;
            }

            // Category determination based on STATUS now, but fallback to metadata for "date" display
            // Actually, we still need to calculate dates for sorting and display.

            let category: 'ott' | 'theatrical' | 'other' = 'other';

            if (item.type === 'movie') {
                const digitalDateStr = meta.digital_release_date;
                const theatricalDateStr = meta.theatrical_release_date;
                const releaseDateStr = meta.release_date;

                const dDate = digitalDateStr ? new Date(digitalDateStr) : null;
                const tDate = theatricalDateStr ? new Date(theatricalDateStr) : null;
                const rDate = releaseDateStr ? new Date(releaseDateStr) : null;

                if (item.status === 'movie_on_ott') {
                    category = 'ott';
                    targetDate = dDate || rDate || today;
                    if (targetDate > today) {
                        const ottName = meta.manual_ott_name || meta.digital_release_note;
                        seasonInfo = ottName ? `Coming to ${ottName}` : 'Coming to OTT';
                    } else {
                        seasonInfo = 'Streaming Now';
                    }
                } else if (item.status === 'movie_coming_soon') {
                    category = 'theatrical';
                    targetDate = tDate || rDate || today;
                    seasonInfo = targetDate > today ? 'Releasing in Theatres' : 'Released';
                } else if (item.status === 'plan_to_watch') {
                    // Legacy fallback: Keep existing logic for un-migrated items
                    if (dDate && dDate > today) { category = 'ott'; targetDate = dDate; }
                    else { category = 'theatrical'; targetDate = tDate || rDate || today; seasonInfo = targetDate > today ? 'Releasing' : 'Released'; }
                }
            } else {
                // Shows
                category = 'ott';
                const nextEp = meta.next_episode_to_air;
                if (nextEp && nextEp.air_date) {
                    targetDate = new Date(nextEp.air_date);
                    seasonInfo = 'New Episode';
                } else if (item.status === 'show_new' && (meta.first_air_date || meta.release_date)) {
                    targetDate = new Date(meta.first_air_date || meta.release_date);
                    seasonInfo = 'Premiere';
                }
            }

            if (!targetDate && item.type === 'movie') targetDate = today; // Fallback
            if (!targetDate) return null;

            const runtime = calculateMediaRuntime(item);

            return {
                ...meta,
                id: item.tmdb_id,
                supabaseId: item.id,
                status: item.status,
                title: item.title,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                date: targetDate.toISOString(),
                tmdbMediaType: item.type === 'movie' ? 'movie' : 'tv',
                totalHours: runtime,
                seasonInfo,
                providerLogo,
                tabCategory: category
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Strict Status-Based Filtering
        return items.filter(item => {
            if (viewMode === 'On OTT') {
                return item.status === 'movie_on_ott' || (item.tmdbMediaType === 'tv' && (item.status === 'show_new' || item.status === 'show_returning' || item.status === 'show_watching'));
            }
            if (viewMode === 'Coming Soon') {
                return item.status === 'movie_coming_soon';
            }
            return true;
        });
    }, [watchlist, viewMode]);

    // Auto-refresh metadata for items in Upcoming to catch official OTT dates/platforms
    useEffect(() => {
        const itemsToProcess = upcomingItems; // Use the value from useMemo
        const toRefresh = itemsToProcess.filter(item => {
            if (refreshedIds.has(item.id)) return false;
            // Only refresh movies in Upcoming statuses
            if (item.tmdbMediaType === 'movie') {
                return item.status === 'movie_coming_soon' || item.status === 'movie_on_ott';
            }
            if (item.tmdbMediaType === 'tv') {
                return item.status === 'show_returning' || item.status === 'show_coming_soon';
            }
            return false;
        });

        if (toRefresh.length > 0) {
            // Limit to 2 refreshes per effect run to be gentle on API
            const batch = toRefresh.slice(0, 2);
            batch.forEach(item => {
                refreshedIds.add(item.id);
                refreshMetadata(item.id, 'movie');
            });
        }
    }, [upcomingItems, refreshMetadata, refreshedIds]);

    const handleMoveToLibrary = async (media: any) => {
        await moveToLibrary(Number(media.id), media.tmdbMediaType === 'movie' ? 'movie' : 'show');
    };

    const handleSaveManualDate = async (date: string, ottName: string) => {
        if (!showDatePicker) return;

        // Use supabaseId for reliable lookup
        const item = watchlist.find(i => i.id === showDatePicker.supabaseId);
        if (!item) {
            console.error("Manual Date Save: Item not found in watchlist", showDatePicker);
            return;
        }
        console.log("Manual Date Save: Found item", item.title);

        const newMeta = {
            ...(item.metadata || {}),
            digital_release_date: date,
            manual_ott_name: ottName,
            manual_date_override: true
        };

        await updateWatchlistItemMetadata(item.tmdb_id, item.type, newMeta);

        // Also force status to 'movie_on_ott' so it moves to the OTT tab
        await updateStatus(item.tmdb_id, item.type, 'movie_on_ott');

        // Optimistic UI update/Selection clear
        setShowDatePicker(null);
    };

    const handleReset = async () => {
        if (!showDatePicker) return;
        const item = watchlist.find(i => i.id === (showDatePicker as any).supabaseId);
        if (!item) return;

        const newMeta = {
            ...(item.metadata || {}),
            digital_release_date: null,
            manual_ott_name: null,
            manual_date_override: false
        };

        // We pass newMeta directly to refreshMetadata to bypass stale state issues
        await refreshMetadata(item.tmdb_id, item.type, newMeta);
        setShowDatePicker(null);
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
                                    <span className="text-white"> &bull; {
                                        (() => {
                                            if (show.tmdbMediaType === 'movie') return show.seasonInfo || 'Movie';

                                            const nextEp = show.next_episode_to_air;
                                            if (!nextEp) return show.seasonInfo || 'Upcoming';

                                            const currentSeason = show.seasons?.find((s: any) => s.season_number === nextEp.season_number);
                                            const totalEpsInSeason = currentSeason?.episode_count || 0;

                                            const isSeasonPremiere = nextEp.episode_number === 1;
                                            const isSeasonFinale = totalEpsInSeason > 0 && nextEp.episode_number === totalEpsInSeason;

                                            // Heuristic for "Final Season"
                                            // 1. Check if season name contains "Final"
                                            // 2. Check if this is the last season in the array AND show status is 'Ended' or 'Returning Series' (sometimes final season airs as returning)
                                            // Reliable: matching season name
                                            const seasonName = currentSeason?.name || '';
                                            const isFinalSeason = seasonName.toLowerCase().includes('final');

                                            if (isFinalSeason) {
                                                if (isSeasonPremiere) return 'Final Season';
                                                if (isSeasonFinale) return 'Final Episode';
                                                return 'New Episode'; // Or 'Final Season' generic? User said specific logic.
                                            }

                                            if (isSeasonPremiere) return 'New Season';
                                            if (isSeasonFinale) return 'Last Episode';
                                            return 'New Episode';
                                        })()
                                    }</span>
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
                    onReset={handleReset}
                />
            )}
        </div>
    );
};

