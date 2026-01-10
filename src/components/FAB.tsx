import { Plus, Dice5, Shuffle } from 'lucide-react';

interface FABProps {
    onClick?: () => void;
    onRandom?: () => void;
    onShuffle?: () => void;
    hideRandom?: boolean;
    mode?: 'add' | 'random' | 'both';
}

export const FAB = ({ onClick, onRandom, onShuffle, hideRandom, mode = 'both' }: FABProps) => {

    // Helper to render Random Button
    const renderRandom = (isMain: boolean) => (
        <button
            className={`fab-btn ${isMain ? '' : 'secondary-fab'}`}
            onClick={onRandom}
            title="Random Pick"
        >
            <Dice5 size={isMain ? 24 : 20} />
        </button>
    );

    // Random Only Mode
    if (mode === 'random') {
        return (
            <div className="fab-container">
                {onShuffle && (
                    <button
                        className="fab-btn secondary-fab"
                        onClick={onShuffle}
                        title="Shuffle List"
                    >
                        <Shuffle size={20} />
                    </button>
                )}
                {renderRandom(true)}
            </div>
        );
    }

    return (
        <div className="fab-container">
            {onShuffle && (
                <button
                    className="fab-btn secondary-fab"
                    onClick={onShuffle}
                    title="Shuffle List"
                >
                    <Shuffle size={20} />
                </button>
            )}

            {(!hideRandom && mode !== 'add') && renderRandom(false)}

            {(
                <button className="fab-btn" onClick={onClick} title="Add New">
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
};
