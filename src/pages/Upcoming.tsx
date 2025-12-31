import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWatchlist } from '../features/watchlist/context/WatchlistContext';
import { UpcomingCard } from '../features/media/components/cards/UpcomingCard';
import { calculateMediaRuntime, type TMDBMedia } from '../lib/tmdb';
import { SlidingToggle } from '../components/ui/SlidingToggle';
import { usePreferences } from '../context/PreferencesContext';
import { MovieModal } from '../features/media/components/modals/MovieModal';
import { ShowModal } from '../features/media/components/modals/ShowModal';
import { ManualDateModal } from '../features/media/components/modals/ManualDateModal';

// ... (helper functions omitted for brevity, they are unchanged)

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

    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

    // Initialize View Mode from URL
    const getInitialViewMode = () => {
        if (params.status === 'comingSoon') return 'Coming Soon';
        // Default or 'onOTT'
        return 'On OTT';
    };

    const [viewMode, setViewMode] = useState<string>(getInitialViewMode());

    // Sync URL -> State
    useEffect(() => {
        if (params.status) {
            const mode = params.status === 'comingSoon' ? 'Coming Soon' : 'On OTT';
            if (mode !== viewMode) setViewMode(mode);
        }
    }, [params.status]);

    const handleViewModeChange = (opt: string) => {
        const slug = opt === 'Coming Soon' ? 'comingSoon' : 'onOTT';
        navigate(`/upcoming/${slug}`);
    };
    const [showDatePicker, setShowDatePicker] = useState<any | null>(null);
    const [refreshedIds] = useState(new Set<number>());

    // Sync tab title
    useEffect(() => {
        document.title = 'CineTrack | Upcoming';
    }, []);

    // Derived State: Process watchlist into "Upcoming" items
    const upcomingItems = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const items = watchlist.map(item => {
            const meta = (item.metadata || {}) as any;

            // Exclude: watched, unwatched, show_finished, show_ongoing, show_watched, show_dropped
            // Exception: 'show_watching' is allowed only if there is a known future episode (Next Ep tracking)
            const excludedStatuses = [
                'movie_watched', 'movie_unwatched', 'movie_dropped',
                'show_finished', 'show_ongoing', 'show_watched', 'show_dropped'
            ];

            if (excludedStatuses.includes(item.status)) return null;

            // Special Check for Waiting/Watching
            if (item.status === 'show_watching') {
                const nextEp = meta.next_episode_to_air;
                const nextDate = nextEp?.air_date ? new Date(nextEp.air_date) : null;
                // Only show in Upcoming if the next episode is in the future (or today)
                if (!nextDate || nextDate < today) return null;
            }

            // ... (metadata extraction) ...


            let targetDate: Date | null = null;
            let seasonInfo = '';
            let providerLogo = null;

            // Check if dismissed
            if (meta.dismissed_from_upcoming) return null;

            const providerInfo = meta['watch/providers'] || meta['watch_providers'] || meta['providers'];
            const regionData = providerInfo?.results?.[region] || {};
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

                if (item.status === 'movie_on_ott' || item.status === 'movie_coming_soon') {
                    category = item.status === 'movie_on_ott' ? 'ott' : 'theatrical';

                    if (item.status === 'movie_on_ott' && category === 'ott') {
                        // Priority: Digital (API) -> Manual -> General
                        // Note: digitalDateStr (dDate) comes from 'digital_release_date' which we now TREAT as API-only (since we store manual in 'manual_release_date')
                        // However, older data might still have manual dates in digital_release_date. We can't easily fix that retroactively without migration,
                        // but new logic will respect the split.

                        const manualDate = meta.manual_release_date ? new Date(meta.manual_release_date) : null;

                        if (dDate) {
                            targetDate = dDate;
                            seasonInfo = (targetDate > today) ? 'Coming to OTT' : 'Streaming Now';
                        } else if (manualDate) {
                            targetDate = manualDate;
                            const ottName = meta.manual_ott_name || meta.digital_release_note;
                            seasonInfo = ottName ? `Coming to ${ottName}` : 'Coming to OTT';
                        } else {
                            targetDate = rDate || tDate; // Fallback to general/theatrical
                            seasonInfo = 'Date Pending';
                        }
                    } else {
                        // Coming Soon (Theatrical Priority)
                        // Priority: Theatrical -> General
                        targetDate = tDate || rDate;
                        if (targetDate) {
                            seasonInfo = targetDate > today ? 'Releasing in Theatres' : 'Released';
                        }
                    }

                    // Common logic to ensure we have a valid targetDate before falling back to placeholders
                    if (!targetDate) {
                        // NO specific date found
                        const fallbackYearMatch = releaseDateStr?.match(/^\d{4}/);
                        if (fallbackYearMatch) {
                            targetDate = new Date(`${fallbackYearMatch[0]}-12-31`);
                        } else {
                            targetDate = new Date('2099-12-31');
                        }
                    }
                } else {
                    // Legacy fallback or unknown: use digital/theatrical dates
                    if (dDate && dDate > today) { category = 'ott'; targetDate = dDate; }
                    else { category = 'theatrical'; targetDate = tDate || rDate || today; seasonInfo = targetDate > today ? 'Releasing' : 'Released'; }
                }
            } else {
                // Shows
                category = 'ott';
                const nextEp = meta.next_episode_to_air;
                const lastEp = meta.last_episode_to_air;

                if (nextEp && nextEp.air_date) {
                    targetDate = new Date(nextEp.air_date);
                    seasonInfo = 'New Episode';
                } else if (lastEp && lastEp.air_date) {
                    targetDate = new Date(lastEp.air_date);
                    seasonInfo = 'Latest Episode';
                } else if (meta.first_air_date || meta.release_date) {
                    targetDate = new Date(meta.first_air_date || meta.release_date);
                    seasonInfo = item.status === 'show_new' ? 'Premiere' : 'Released';
                } else {
                    targetDate = today;
                    seasonInfo = 'Streaming Now';
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
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return a.title.localeCompare(b.title);
            });

        // Strict Status-Based Filtering
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
        const itemsToProcess = upcomingItems; // Use the value from useMemo
        const toRefresh = itemsToProcess.filter(item => {
            if (refreshedIds.has(item.id)) return false;

            // API Throttle: Only auto-refresh if older than 12 hours
            const lastUpdated = item.last_updated_at || (item as any).metadata?.last_updated_at;
            if (lastUpdated) {
                const diff = Date.now() - new Date(lastUpdated).getTime();
                const twelveHours = 12 * 60 * 60 * 1000;
                if (diff < twelveHours) return false;
            }

            // Only refresh movies in Upcoming statuses
            if (item.tmdbMediaType === 'movie') {
                return item.status === 'movie_coming_soon' || item.status === 'movie_on_ott';
            }
            if (item.tmdbMediaType === 'tv') {
                return ['show_returning', 'show_coming_soon', 'show_ongoing', 'show_finished', 'show_watched'].includes(item.status);
            }
            return false;
        });

        if (toRefresh.length > 0) {
            // Standard Auto-Refresh for Visible Items
            const batch = toRefresh.slice(0, 3);
            batch.forEach(item => {
                refreshedIds.add(item.id);
                refreshMetadata(item.id, item.tmdbMediaType === 'movie' ? 'movie' : 'show');
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


        const newMeta = {
            ...(item.metadata || {}),
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
        const item = watchlist.find(i => i.id === (showDatePicker as any).supabaseId);
        if (!item) return;

        const newMeta = {
            ...(item.metadata || {}),
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
                                    setShowDatePicker(media);
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

