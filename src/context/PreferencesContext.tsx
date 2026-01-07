import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';

interface PreferencesContextType {
    region: string;
    setRegion: (region: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    // Initialize from LocalStorage
    const [region, setRegionState] = useState(localStorage.getItem('tmdb_region') || 'IN');

    const updateRegion = (newRegion: string) => {
        setRegionState(newRegion);
        localStorage.setItem('tmdb_region', newRegion);
        console.log(`[Preferences] Region updated to: ${newRegion}`);
    };

    // Sync with User Profile on Login
    useEffect(() => {
        if (user?.user_metadata?.region && user.user_metadata.region !== region) {
            console.log(`[Preferences] Syncing region from user profile: ${user.user_metadata.region}`);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            updateRegion(user.user_metadata.region);
        }
    }, [user, region]);

    const value = {
        region,
        setRegion: updateRegion
    };

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
