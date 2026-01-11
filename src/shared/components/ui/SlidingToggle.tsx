import { useEffect, useRef, useState } from 'react';
import './SlidingToggle.css';

interface SlidingToggleProps {
    options: string[];
    activeOption: string;
    onToggle: (option: string) => void;
    disabled?: boolean;
}

export const SlidingToggle = ({ options, activeOption, onToggle, disabled = false }: SlidingToggleProps) => {
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
    const optionRefs = useRef<(HTMLSpanElement | null)[]>([]);

    useEffect(() => {
        optionRefs.current = optionRefs.current.slice(0, options.length);
    }, [options]);

    useEffect(() => {
        const updateHighlight = () => {
            const activeIndex = options.indexOf(activeOption);
            if (activeIndex !== -1 && optionRefs.current[activeIndex]) {
                const element = optionRefs.current[activeIndex]!;
                const width = element.offsetWidth;
                const left = element.offsetLeft;
                setHighlightStyle({ width: `${width}px`, left: `${left}px` });
            }
        };

        const timer = setTimeout(updateHighlight, 0);
        window.addEventListener('resize', updateHighlight);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateHighlight);
        }
    }, [activeOption, options]);

    return (
        <span className={`pill-button ${disabled ? 'pill-button_disabled' : ''}`}>
            {options.map((option, index) => (
                <span
                    key={option}
                    ref={el => { optionRefs.current[index] = el; }}
                    className={`pill-button-selection ${activeOption === option ? 'pill-button-selection_active' : ''}`}
                    onClick={() => !disabled && onToggle(option)}
                >
                    {option}
                </span>
            ))}
            {!disabled && (
                <span
                    className="pill-button-highlight"
                    style={highlightStyle}
                ></span>
            )}
        </span>
    );
};
