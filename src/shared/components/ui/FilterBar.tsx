import React, { useState, useRef, useEffect } from 'react';

interface FilterBarProps {
    children: React.ReactNode;
    className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => {
    return (
        <div className={`filter-container ${className}`}>
            <div className="filter-bar">
                {children}
            </div>
        </div>
    );
};

interface FilterOption {
    id: string | number;
    label: string;
    image?: string;
}

interface FilterExpandableProps {
    label: string;
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    options: FilterOption[];
}

export const FilterExpandable: React.FC<FilterExpandableProps> = ({ label, value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleTriggerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleOptionClick = (e: React.MouseEvent, optionId: string | number | null) => {
        e.stopPropagation();
        onChange(optionId);
        setIsOpen(false);
    };

    const selectedOption = options.find(o => o.id === value);
    const displayLabel = selectedOption ? selectedOption.label : 'All';

    return (
        <div className="filter-group" ref={containerRef}>
            <button
                className={`pill filter-trigger ${isOpen ? 'active' : ''}`}
                onClick={handleTriggerClick}
            >
                {label}: <span className="selected-label">{displayLabel}</span>
            </button>

            <div className={`options-inline ${isOpen ? 'active' : ''}`}>
                {!options.find(o => o.id === 'all' || o.id === null) && (
                    <button
                        className={`pill option-btn ${value === 'all' || value === null ? 'active' : ''}`}
                        onClick={(e) => handleOptionClick(e, null)}
                    >
                        All
                    </button>
                )}

                {options.map((option) => (
                    <button
                        key={option.id}
                        className={`pill option-btn ${value === option.id ? 'active' : ''}`}
                        onClick={(e) => handleOptionClick(e, option.id)}
                    >
                        {option.image && (
                            <img
                                src={option.image}
                                alt={option.label}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '6px',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
