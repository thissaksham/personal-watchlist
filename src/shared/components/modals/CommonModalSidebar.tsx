import { PlayCircle } from 'lucide-react';
import { type TMDBMedia, type WatchProvider } from '../../../lib/tmdb';

interface CommonModalSidebarProps {
    details: TMDBMedia | null | undefined;
    media: TMDBMedia;
    providers: WatchProvider[];
    watchLink?: string;
    title: string;
}

export const CommonModalSidebar = ({ details, media, providers, watchLink, title }: CommonModalSidebarProps) => {
    return (
        <div className="modal-col-side">
            {(details?.genres || media?.genres) && (
                <div className="mb-6">
                    <h4 className="subtitle-text">Genres</h4>
                    <div className="genres-list">
                        {(details?.genres || media?.genres)?.map((g: { id: number; name: string }) => (
                            <span key={g.id} className="genre-tag">{g.name}</span>
                        ))}
                    </div>
                </div>
            )}

            {providers.length > 0 && (
                <div>
                    <h3 className="subtitle-text flex items-center gap-2">
                        <PlayCircle size={14} /> Available to Stream
                    </h3>
                    <div className="provider-list">
                        {providers.map((provider: WatchProvider) => (
                            <a
                                key={provider.provider_id}
                                href={watchLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="provider-logo hover:opacity-80 transition-opacity cursor-pointer block"
                                title={`Watch on ${provider.provider_name}`}
                            >
                                <img
                                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    className="w-full h-full object-cover"
                                />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {providers.length === 0 && (
                <div>
                    <h3 className="subtitle-text flex items-center gap-2">
                        <PlayCircle size={14} /> Download From
                    </h3>
                    <div className="provider-list">
                        <a
                            href={`https://ext.to/browse/?cat=1&name_filter=${encodeURIComponent(title || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="provider-logo hover:opacity-80 transition-opacity cursor-pointer block"
                            title={`Download ${title}`}
                            style={{ background: 'transparent' }}
                        >
                            <img
                                src="/ext-logo.png"
                                alt="EXT"
                                className="w-full h-full object-contain"
                            />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
