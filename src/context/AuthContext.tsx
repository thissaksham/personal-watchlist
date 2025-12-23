import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { updateTmdbRegion } from '../lib/tmdb';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    changePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                if (!supabase) throw new Error("Supabase client is not initialized");

                // Strict check: getUser() verifies with Supabase server that user still exists
                // whereas getSession() only reads the local token.
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

                if (userError || !currentUser) {
                    // If server says user is gone, clear local session
                    setSession(null);
                    setUser(null);
                    localStorage.removeItem('supabase.auth.token'); // Clean up potentially stale data
                } else {
                    const { data: { session: activeSession } } = await supabase.auth.getSession();
                    setSession(activeSession);
                    setUser(currentUser);
                }

                // Sync region from metadata to localStorage
                if (currentUser?.user_metadata?.region) {
                    const savedRegion = localStorage.getItem('tmdb_region');
                    if (savedRegion !== currentUser.user_metadata.region) {
                        updateTmdbRegion(currentUser.user_metadata.region);
                    }
                }
            } catch (err: any) {
                console.error("Auth Init Error:", err);
                setError(err.message || "Unknown Auth Error");
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            // Sync region on state change (login/signup)
            if (currentUser?.user_metadata?.region) {
                const savedRegion = localStorage.getItem('tmdb_region');
                if (savedRegion !== currentUser.user_metadata.region) {
                    updateTmdbRegion(currentUser.user_metadata.region);
                }
            }

            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (error) {
        return <div style={{ color: 'red', padding: 20, border: '1px solid red' }}>
            <h3>Auth Context Error:</h3>
            <pre>{error}</pre>
        </div>;
    }

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const deleteAccount = async () => {
        if (!user) return;

        // Call the SQL function we created to delete the AUTH record
        // The 'ON DELETE CASCADE' we set up in SQL handles wiping the watchlist automatically
        const { error: deleteError } = await supabase.rpc('delete_user');

        if (deleteError) {
            console.error('Error in self-deletion:', deleteError);
            throw new Error('Failed to delete account. Ensure the SQL function exists.');
        }

        // 2. Clear local storage
        localStorage.removeItem('tmdb_region');
        localStorage.removeItem('watchlist');

        // 3. Clear Supabase local storage tokens manually 
        // We don't call signOut() because the user record is already gone from the server (causes 403)
        const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // 4. Reset local state
        setSession(null);
        setUser(null);
    };

    const changePassword = async (password: string) => {
        return await supabase.auth.updateUser({ password });
    };

    const value = {
        user,
        session,
        loading,
        signOut,
        deleteAccount,
        changePassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
