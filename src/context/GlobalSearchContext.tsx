import { createContext, useContext, useState, type ReactNode } from 'react';

interface GlobalSearchContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const GlobalSearchProvider = ({ children }: { children: ReactNode }) => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <GlobalSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
            {children}
        </GlobalSearchContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalSearch = () => {
    const context = useContext(GlobalSearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
    }
    return context;
};
