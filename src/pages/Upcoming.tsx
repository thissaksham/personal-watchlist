import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWatchlist } from '../features/watchlist/context/WatchlistContext';
import { UpcomingCard } from '../features/media/components/cards/UpcomingCard';
import { calculateMediaRuntime, type TMDBMedia } from '../lib/tmdb';
import { parseDateLocal } from '../lib/dateUtils';
import { SlidingToggle } from '../components/ui/SlidingToggle';
import { usePreferences } from '../context/PreferencesContext';
import { MovieModal } from '../features/movies/components/MovieModal';
import { ShowModal } from '../features/shows/components/ShowModal';
import { ManualDateModal } from '../features/media/components/modals/ManualDateModal';
import type { WatchlistItem } from '../types';

// ... (helper functions omitted for brevity, they are unchanged)

interface UpcomingItem extends TMDBMedia {
    supabaseId: string;
    date: string;
    tmdbMediaType: 'movie' | 'tv';
    totalHours?: number | null;
    seasonInfo: string;
    providerLogo?: string | null;
    tabCategory: 'ott' | 'theatrical' | 'other';
    metadata?: TMDBMedia;
    last_updated_at?: number;
    countdown?: number;
}

const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export const Upcoming = () => {
    const { watchlist, markAsWatched, dismissFromUpcoming, removeFromWatchlist, updateWatchlistItemMetadata, updateStatus, moveToLibrary, refreshMetadata, markAsDropped } = useWatchlist();
    const { region } = usePreferences();
    const navigate = useNavigate();
    const params = useParams();

    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | UpcomingItem | null>(null);

    // Initialize View Mode directly from URL (Derived State)
    const viewMode = (params.status === 'comingSoon' ? 'Coming Soon' : 'On OTT');

    const handleViewModeChange = (opt: string) => {
        const slug = opt === 'Coming Soon' ? 'comingSoon' : 'onOTT';
        navigate(`/upcoming/${slug}`);
    };
    const [showDatePicker, setShowDatePicker] = useState<UpcomingItem | null>(null);
    const [refreshedIds] = useState(new Set<number>());

    // Sync tab title
    useEffect(() => {
        document.title = 'CineTrack | Upcoming';
    }, []);

    // Helper for processing media items into UpcomingItems
    const processUpcomingItem = (item: WatchlistItem, today: Date, region: string): UpcomingItem | null => {
        const meta = (item.metadata || {}) as TMDBMedia;

        // Exclude: watched, unwatched, show_finished, show_watched, show_dropped
        const excludedStatuses = [
            'movie_watched', 'movie_unwatched', 'movie_dropped',
            'show_finished', 'show_dropped'
        ];

        if (excludedStatuses.includes(item.status)) {
            return null;
        }

        // Special handling for shows
        if (item.type === 'show') {
            const nextEp = meta.next_episode_to_air;
            const nextDate = parseDateLocal(nextEp?.air_date);

            // If a show is marked as watched (caught up) or watching, ONLY show if confirmed future episode
            if (['show_watched', 'show_watching'].includes(item.status)) {
                if (!nextDate) return null;
            }

            // For shows with NO watched seasons (unwatched), ONLY show if it is a Season Premiere
            const isUnwatched = (!item.last_watched_season || item.last_watched_season === 0) && (!item.progress || item.progress === 0);
            if (isUnwatched && nextEp && nextEp.episode_number !== 1) {
                return null;
            }

            // Hide active/backlog shows with no next episode info
            if (!nextEp && ['show_ongoing', 'show_returning', 'show_watching'].includes(item.status)) {
                return null;
            }
        }

        if (meta.dismissed_from_upcoming) return null;

        let targetDate: Date | null = null;
        let seasonInfo = '';
        let providerLogo: string | null = null;

        const providerInfo = meta['watch/providers'];
        const regionData = providerInfo?.results?.[region];
        const flatrate = regionData?.flatrate || [];
        const allStreamingOrRental = [
            ...flatrate,
            ...(regionData?.ads || []),
            ...(regionData?.free || []),
            ...(regionData?.rent || []),
            ...(regionData?.buy || [])
        ];

        if (allStreamingOrRental.length > 0) {
            providerLogo = allStreamingOrRental[0].logo_path;
        }

        let category: 'ott' | 'theatrical' | 'other' = 'other';

        if (item.type === 'movie') {
            const dDate = parseDateLocal(meta.digital_release_date);
            const tDate = parseDateLocal(meta.theatrical_release_date);
            const rDate = parseDateLocal(meta.release_date);

            if (item.status === 'movie_on_ott' || item.status === 'movie_coming_soon') {
                category = item.status === 'movie_on_ott' ? 'ott' : 'theatrical';

                if (category === 'ott') {
                    const manualDate = parseDateLocal(meta.manual_release_date);
                    if (dDate) {
                        targetDate = dDate;
                        seasonInfo = (targetDate > today) ? 'Coming to OTT' : 'Streaming Now';
                    } else if (manualDate) {
                        targetDate = manualDate;
                        const ottName = meta.manual_ott_name || meta.digital_release_note;
                        seasonInfo = ottName ? `Coming to ${ottName}` : 'Coming to OTT';
                    } else {
                        targetDate = rDate || tDate;
                        seasonInfo = 'Date Pending';
                    }
                } else {
                    targetDate = tDate || rDate;
                    if (targetDate) {
                        seasonInfo = targetDate > today ? 'Releasing in Theatres' : 'Released';
                    }
                }

                if (!targetDate) {
                    const fallbackYearMatch = meta.release_date?.match(/^\d{4}/);
                    targetDate = fallbackYearMatch ? new Date(`${fallbackYearMatch[0]}-12-31`) : new Date('2099-12-31');
                }
            } else {
                if (dDate && dDate > today) { category = 'ott'; targetDate = dDate; }
                else { category = 'theatrical'; targetDate = tDate || rDate || today; seasonInfo = targetDate > today ? 'Releasing' : 'Released'; }
            }
        } else {
            category = 'ott';
            const nextEp = meta.next_episode_to_air;
            const lastEp = meta.last_episode_to_air;

            if (nextEp && nextEp.air_date) {
                targetDate = parseDateLocal(nextEp.air_date);
                if (targetDate && targetDate < today) seasonInfo = 'Streaming Now';
                else if (targetDate && targetDate.getTime() === today.getTime()) seasonInfo = 'Airs Today';
                else seasonInfo = 'New Episode';
            } else if (lastEp && lastEp.air_date) {
                targetDate = parseDateLocal(lastEp.air_date);
                seasonInfo = 'Latest Episode';
            } else if (meta.first_air_date || meta.release_date) {
                targetDate = parseDateLocal(meta.first_air_date || meta.release_date);
                seasonInfo = item.status === 'show_new' ? 'Premiere' : 'Released';
            } else {
                targetDate = today;
                seasonInfo = 'Streaming Now';
            }
        }

        if (!targetDate && item.type === 'movie') targetDate = today;
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
        } as UpcomingItem;
    };

    // Derived State: Process watchlist into "Upcoming" items
    const upcomingItems = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items = watchlist
            .map(item => processUpcomingItem(item, today, region))
            .filter((item): item is UpcomingItem => item !== null)
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return (a.title || '').localeCompare(b.title || '');
            });

        return items.filter(item => {
            if (viewMode === 'On OTT') {
                return item.status === 'movie_on_ott' || item.tmdbMediaType === 'tv';
            }
            if (viewMode === 'Coming Soon') {
                return item.status === 'movie_coming_soon';
            }
            return true;
        });
    }, [watchlist, viewMode, region]);

    // Total Count for Debugging
    // Total Count - Should match the actual displayed items in this context
    const totalCount = upcomingItems.length;

    // Auto-refresh metadata for items in Upcoming to catch official OTT dates/platforms
    useEffect(() => {
        // We scan the WHOLE watchlist for two types of items to refresh:
        // 1. Items currently IN upcoming (to get latest OTT data)
        // 2. "Stale" active items that SHOULD be in upcoming but fell off because next_episode_to_air is in the past.

        const today = new Date();
        const candidates = watchlist.filter(item => {
            if (refreshedIds.has(Number(item.id))) return false;

            const meta = (item.metadata || {}) as TMDBMedia;
            const lastUpdated = meta.last_updated_at;
            if (lastUpdated) {
                const diff = Date.now() - new Date(lastUpdated).getTime();
                const twelveHours = 12 * 60 * 60 * 1000;
                if (diff < twelveHours) return false;
            }
            if (item.type === 'show') {
                if (['show_returning', 'show_watching', 'show_ongoing'].includes(item.status)) {
                    const nextEp = (item.metadata as TMDBMedia)?.next_episode_to_air;
                    if (nextEp && nextEp.air_date) {
                        const epDate = new Date(nextEp.air_date);
                        // If date is in past (yesterday/older), it's stale. Needs refresh to get NEXT ONE.
                        if (epDate < today) return true;
                    }
                }
            }

            // Refresh visible items logic (simplified from previous)
            const isVisible = upcomingItems.some(i => i.id === item.tmdb_id);
            if (isVisible) return true;

            return false;
        });

        if (candidates.length > 0) {
            // Refresh up to 3 at a time to avoid rate limits
            const batch = candidates.slice(0, 3);
            batch.forEach(item => {
                refreshedIds.add(Number(item.id));
                refreshMetadata(item.tmdb_id, item.type);
                console.log("Refreshing stale/upcoming item:", item.title);
            });
        }
    }, [watchlist, upcomingItems, refreshMetadata, refreshedIds]);

    const handleMoveToLibrary = async (media: TMDBMedia) => {
        // Fix: Use tmdbMediaType if available (from UpcomingItem), otherwise fallback
        const typeRaw = (media as UpcomingItem).tmdbMediaType || media.media_type;
        const type = typeRaw === 'movie' ? 'movie' : 'show';
        await moveToLibrary(Number(media.id), type);
    };

    const handleSaveManualDate = async (date: string, ottName: string) => {
        if (!showDatePicker) return;

        // Use supabaseId for reliable lookup
        const item = watchlist.find(i => i.id === showDatePicker.supabaseId);
        if (!item) {
            console.error("Manual Date Save: Item not found in watchlist", showDatePicker);
            return;
        }


        const newMeta: TMDBMedia = {
            ...(item.metadata || {} as TMDBMedia),
            id: item.tmdb_id,
            manual_release_date: date,
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
        const item = watchlist.find(i => i.id === showDatePicker.supabaseId);
        if (!item) return;

        const newMeta: TMDBMedia = {
            ...(item.metadata || {} as TMDBMedia),
            id: item.tmdb_id,
            manual_release_date: null,
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
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 tracking-tight flex items-baseline">
                        Upcoming
                        <span style={{ fontSize: '1rem', opacity: 0.2, fontWeight: 'normal', marginLeft: '12px', color: 'white', WebkitTextFillColor: 'initial' }} className="select-none">
                            showing {upcomingItems.length}/{totalCount} results
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 mt-2 font-medium">
                        Your personalized release calendar.
                    </p>
                </div>
                <SlidingToggle
                    options={['On OTT', 'Coming Soon']}
                    activeOption={viewMode}
                    onToggle={handleViewModeChange}
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
                    {upcomingItems.map((show: UpcomingItem) => (
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
                                        const isFuture = show.status === 'movie_coming_soon' || (show.status === 'movie_on_ott' && new Date(show.date) > new Date());

                                        if (isFuture) {
                                            if (window.confirm(`Delete ${show.title} from your watchlist completely? (Unreleased)`)) {
                                                removeFromWatchlist(Number(show.id), 'movie');
                                            }
                                        } else {
                                            if (window.confirm(`Drop ${show.title} from your watchlist? It will be moved to the Dropped list.`)) {
                                                markAsDropped(Number(show.id), 'movie');
                                            }
                                        }
                                    } else {
                                        if (show.status === 'show_new') {
                                            if (window.confirm(`Delete ${show.title} from your watchlist completely?`)) {
                                                removeFromWatchlist(Number(show.id), 'show');
                                            }
                                        } else {
                                            if (window.confirm(`Hide ${show.title} from upcoming list? (It will remain in your library)`)) {
                                                dismissFromUpcoming(Number(show.id), 'show');
                                            }
                                        }
                                    }
                                }}
                                onMarkWatched={() => {
                                    markAsWatched(Number(show.id), show.tmdbMediaType === 'movie' ? 'movie' : 'show');
                                }}
                                onSetDate={(media: TMDBMedia) => {
                                    setShowDatePicker(media as UpcomingItem);
                                }}
                                onMoveToLibrary={handleMoveToLibrary}
                                showDateOverride={viewMode === 'Coming Soon'}
                                onClick={() => setSelectedMedia(show)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* FAB Removed - Global Add replaces it. Random not strictly needed here or can be added back if requested. */}

            {selectedMedia && (
                selectedMedia.tmdbMediaType === 'tv' ? (
                    <ShowModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                ) : (
                    <MovieModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                )
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

