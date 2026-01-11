import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { WelcomeSplash } from '../auth/components/WelcomeSplash';

// This flag resets to false on every page refresh (full JS reload),
// but stays true during in-app navigation.
let initialSplashShown = false;

export const Layout = () => {
    // Welcome Splash Logic (Handles first-time, returning, and simple session entry)
    const [welcomeData, setWelcomeData] = useState<{ show: boolean, type: 'welcome' | 'returning' | 'entry' }>(() => {
        const showSignupWelcome = sessionStorage.getItem('show_welcome') === 'true';
        if (showSignupWelcome) {
            const type = (sessionStorage.getItem('splash_type') as 'welcome' | 'returning') || 'welcome';
            return { show: true, type };
        }

        // If no explicit signup/signin welcome, show the 1s entry splash on every refresh/boot
        if (!initialSplashShown) {
            return { show: true, type: 'entry' };
        }

        return { show: false, type: 'welcome' };
    });

    const handleWelcomeComplete = () => {
        setWelcomeData({ show: false, type: 'welcome' });
        sessionStorage.removeItem('show_welcome');
        sessionStorage.removeItem('splash_type');
        initialSplashShown = true; // Prevents splash on in-app navigation, but resets on refresh
    };

    // Sync default title
    useEffect(() => {
        document.title = 'CineTrack | Your Personal Watchlist';
    }, []);

    return (
        <div className="app-container">
            {welcomeData.show && (
                <WelcomeSplash
                    type={welcomeData.type}
                    onComplete={handleWelcomeComplete}
                />
            )}

            <Header />

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
