import { useMemo } from 'react';
import type { TMDBMedia } from '../lib/tmdb';

export interface Provider {
    id: number;
    name: string;
    logo: string | null;
}

export const useMediaProviders = (mediaList: TMDBMedia[]) => {
    return useMemo(() => {
        const providers = new Map<number, Provider>();
        let hasNoProvider = false;

        mediaList.forEach(media => {
            // @ts-ignore - dynamic property access
            const providerData = media['watch/providers']?.results?.[TMDB_REGION];
            const flatrate = providerData?.flatrate || [];

            if (flatrate.length === 0) {
                hasNoProvider = true;
            } else {
                flatrate.forEach((p: any) => {
                    if (!providers.has(p.provider_id)) {
                        providers.set(p.provider_id, { id: p.provider_id, name: p.provider_name, logo: p.logo_path });
                    }
                });
            }
        });

        const result = Array.from(providers.values());

        // Clean up Prime Video duplicates
        const primeVideo = result.find(p => p.name === 'Amazon Prime Video');
        const primeVideoAds = result.find(p => p.name === 'Amazon Prime Video with Ads');

        if (primeVideo && primeVideoAds) {
            const index = result.findIndex(p => p.id === primeVideoAds.id);
            if (index > -1) {
                result.splice(index, 1);
            }
        }

        if (hasNoProvider) {
            result.push({ id: -1, name: 'Not Streaming', logo: null });
        }

        // Sort by name for nicer UI
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [mediaList]);
};
