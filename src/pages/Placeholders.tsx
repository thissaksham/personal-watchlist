import { useParams, useNavigate } from 'react-router-dom';
import { SlidingToggle } from '../components/ui/SlidingToggle';

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="mt-10">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <div className="p-10 border border-dashed border-[var(--border)] rounded-2xl flex items-center justify-center text-[var(--text-secondary)] h-64">
            <p>Content for {title} coming soon...</p>
        </div>
    </div>
);

export const Movies = () => <PlaceholderPage title="Movies" />;
export { ShowsPage as Shows } from '../features/shows/pages/ShowsPage';

export const Games = () => {
    const { status } = useParams();
    const navigate = useNavigate();

    // Mapping for valid routes
    // 'Unplayed' -> 'unplayed'
    const viewMode = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unplayed';

    const handleToggle = (option: string) => {
        navigate(`/games/${option.toLowerCase()}`);
    };

    return (
        <div>
            <div className="page-header flex justify-between items-end mb-6">
                <div>
                    <h1 className="page-title text-3xl font-bold">Games Library</h1>
                    <p className="subtitle text-gray-400 mt-1">Your personal games collection.</p>
                </div>

                <div className="flex items-center gap-6">
                    <SlidingToggle
                        options={['Unplayed', 'Played', 'Dropped', 'Bad']}
                        activeOption={viewMode}
                        onToggle={handleToggle}
                    />
                </div>
            </div>

            {/* Placeholder Content for now */}
            <div className="p-10 border border-dashed border-[var(--border)] rounded-2xl flex items-center justify-center text-[var(--text-secondary)] h-64">
                <p>No games found in "{viewMode}"</p>
            </div>
        </div>
    );
};
