import { Plus, Dice5 } from 'lucide-react';

interface FABProps {
    onClick?: () => void;
    onRandom?: () => void;
    hideRandom?: boolean;
    mode?: 'add' | 'random' | 'both';
}

export const FAB = ({ onClick, onRandom, hideRandom, mode = 'both' }: FABProps) => {

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
                {renderRandom(true)}
            </div>
        );
    }

    return (
        <div className="fab-container">
            {(!hideRandom && mode !== 'add') && renderRandom(false)}

            {(
                <button className="fab-btn" onClick={onClick} title="Add New">
                    <Plus size={24} />
                </button>
            )}
        </div>
    );
};
