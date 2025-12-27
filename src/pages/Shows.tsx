
import { LibraryPage } from './LibraryPage';

export const Shows = () => {
    return (
        <LibraryPage
            title="My Shows"
            subtitle="Your personal TV show library."
            watchlistType="show"
            tmdbType="tv"
            emptyMessage="You haven't added any shows yet."
            basePath="/shows"
        />
    );
};
