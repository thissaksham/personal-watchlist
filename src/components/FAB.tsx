import { Plus, Shuffle } from 'lucide-react';

interface FABProps {
    onClick: () => void;
    onRandom?: () => void;
}

export const FAB = ({ onClick, onRandom }: FABProps) => {
    return (
        <div className="fab-container">
            {onRandom && (
                <button className="fab-btn secondary-fab" onClick={onRandom} title="Surprise Me!">
                    <Shuffle size={24} />
                </button>
            )}
            <button className="fab-btn" onClick={onClick} title="Add New">
                <Plus size={28} />
            </button>
        </div>
    );
};
