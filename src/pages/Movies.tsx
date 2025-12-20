
import { LibraryPage } from './LibraryPage';

export const Movies = () => {
    return (
        <LibraryPage
            title="My Movies"
            subtitle="Your personal movie library."
            watchlistType="movie"
            tmdbType="movie"
            emptyMessage="You haven't added any movies yet."
        />
    );
};
