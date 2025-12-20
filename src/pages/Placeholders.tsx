
const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="mt-10">
        <h1 className="text-4xl font-bold mb-4">{title}</h1>
        <div className="p-10 border border-dashed border-[var(--border)] rounded-2xl flex items-center justify-center text-[var(--text-secondary)] h-64">
            <p>Content for {title} coming soon...</p>
        </div>
    </div>
);

export const Movies = () => <PlaceholderPage title="Movies" />;
export { Shows } from './Shows';
export const Upcoming = () => (
    <div className="flex flex-col items-center justify-center h-[50vh] text-[var(--text-secondary)] animate-fade-in">
        <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
        <p>Track upcoming releases and get notified.</p>
    </div>
);
export const Games = () => <PlaceholderPage title="Games Library" />;
