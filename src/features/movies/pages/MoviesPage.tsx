
import { LibraryPage } from '../../../shared/pages/LibraryPage';

export const MoviesPage = () => {
    return (
        <LibraryPage
            title="My Movies"
            subtitle="Your personal movie library."
            watchlistType="movie"
            tmdbType="movie"
            emptyMessage="You haven't added any movies yet."
            basePath="/movies"
        />
    );
};
