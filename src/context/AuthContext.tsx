import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
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

                // Check active sessions and sets the user
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;

                setSession(data.session);
                const currentUser = data.session?.user ?? null;
                setUser(currentUser);

                // Sync region from metadata to localStorage
                if (currentUser?.user_metadata?.region) {
                    const savedRegion = localStorage.getItem('tmdb_region');
                    if (savedRegion !== currentUser.user_metadata.region) {
                        localStorage.setItem('tmdb_region', currentUser.user_metadata.region);
                        // Only reload if we actually changed it to avoid loops
                        window.location.reload();
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
                    localStorage.setItem('tmdb_region', currentUser.user_metadata.region);
                    window.location.reload();
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

    const changePassword = async (password: string) => {
        return await supabase.auth.updateUser({ password });
    };

    const value = {
        user,
        session,
        loading,
        signOut,
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
