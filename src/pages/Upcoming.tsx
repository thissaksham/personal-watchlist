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

            // Extract Provider (IN region)
            const providers = meta['watch/providers']?.results?.[TMDB_REGION]?.flatrate;
            if (providers && providers.length > 0) {
                // Prioritize specific popular ones or just take the first
                providerLogo = providers[0].logo_path;
            }

            // Logic for Movies
            if (item.type === 'movie') {
                const digitalDateStr = meta.digital_release_date;
                const theatricalDateStr = meta.theatrical_release_date;
                const releaseDateStr = meta.release_date;

                // 1. Digital Release (Priority for OTT watchers)
                if (digitalDateStr) {
                    const dDate = new Date(digitalDateStr);
                    targetDate = dDate;
                    if (dDate >= today) {
                        // Dynamic label based on manual OTT name
                        if (meta.manual_ott_name) {
                            seasonInfo = `Coming on ${meta.manual_ott_name}`;
                        } else {
                            seasonInfo = 'Coming to OTT';
                        }
                    } else {
                        // Released!
                        if (meta.manual_ott_name) {
                            seasonInfo = `On ${meta.manual_ott_name}`;
                        } else {
                            seasonInfo = 'Available on OTT';
                        }
                    }
                }
                // 2. Theatrical Release (If no digital date known)
                else if (theatricalDateStr) {
                    const tDate = new Date(theatricalDateStr);
                    targetDate = tDate;
                    if (tDate > today) {
                        seasonInfo = 'In Theaters';
                    } else {
                        // It's already in theaters...
                        // If it's recent (< 3 months), show it as "In Theaters" (Waiting for OTT)
                        const cutoff = new Date();
                        cutoff.setMonth(today.getMonth() - 3);
                        if (tDate > cutoff) {
                            seasonInfo = 'In Theaters Only';
                        } else {
                            seasonInfo = 'Released';
                        }
                    }
                }
                // 3. Fallback Standard
                else if (releaseDateStr) {
                    const release = new Date(releaseDateStr);
                    targetDate = release;
                }
            }
            // Logic for TV Shows
            else if (item.type === 'show') {
                // Check for next episode
                const nextEp = meta.next_episode_to_air;
                if (nextEp && nextEp.air_date) {
                    const airDate = new Date(nextEp.air_date);
                    targetDate = airDate;
                    if (airDate >= today) {
                        // Determine label based on episode number
                        if (nextEp.episode_number === 1) {
                            seasonInfo = 'New Season';
                        } else {
                            seasonInfo = 'New Episode';
                        }
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
                providerLogo
            };
        }).filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Apply View Mode Filter
        return items.filter(item => {
            const meta = item as any;

            // Critical Change: Items stay in Upcoming until explicitly moved
            const isAcknowledged = meta.moved_to_library === true;

            if (viewMode === 'On OTT') {
                // Shows -> Always OTT (assumed)
                if (item.tmdbMediaType === 'tv') {
                    return !isAcknowledged;
                }
                // Movies -> Only if "Coming to OTT" or "Available on OTT"
                const isOtt = item.seasonInfo.includes('OTT') || item.seasonInfo.startsWith('Coming on') || item.seasonInfo.startsWith('On ');
                if (item.tmdbMediaType === 'movie' && isOtt) {
                    return !isAcknowledged;
                }
                return false;
            }
            if (viewMode === 'Coming Soon') {
                if (item.tmdbMediaType === 'tv') return false;
                // Movies -> In Theaters or Released (fallback)
                const isTheatrical = item.seasonInfo.includes('Theaters') || item.seasonInfo === 'Released';
                if (item.tmdbMediaType === 'movie' && isTheatrical) {
                    return !isAcknowledged;
                }
                return false;
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

