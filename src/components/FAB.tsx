import { Plus, Dice5 } from 'lucide-react';

interface FABProps {
    onClick: () => void;
    onRandom: () => void;
    hideRandom?: boolean;
}

export const FAB = ({ onClick, onRandom, hideRandom }: FABProps) => {
    return (
        <div className="fab-container">
            {!hideRandom && (
                <button
                    className="fab-btn secondary-fab"
                    onClick={onRandom}
                    title="Random Pick"
                >
                    <Dice5 size={24} />
                </button>
            )}
            <button className="fab-btn" onClick={onClick} title="Add New">
                <Plus size={24} />
            </button>
        </div>
    );
};
