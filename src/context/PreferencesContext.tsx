import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface PreferencesContextType {
    region: string;
    setRegion: (region: string) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    // Initialize from LocalStorage
    const [region, setRegionState] = useState(localStorage.getItem('tmdb_region') || 'IN');

    // Sync with User Profile on Login
    useEffect(() => {
        if (user?.user_metadata?.region && user.user_metadata.region !== region) {
            console.log(`[Preferences] Syncing region from user profile: ${user.user_metadata.region}`);
            updateRegion(user.user_metadata.region);
        }
    }, [user]);

    const updateRegion = (newRegion: string) => {
        setRegionState(newRegion);
        localStorage.setItem('tmdb_region', newRegion);
        console.log(`[Preferences] Region updated to: ${newRegion}`);
    };

    const value = {
        region,
        setRegion: updateRegion
    };

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
};
