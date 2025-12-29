import { useRef, useState, useLayoutEffect } from 'react';
import styles from './SmartPillButton.module.css';

interface SmartPillButtonProps {
    viewMode: string;
    seriesStatus: string;
    onViewModeChange: (mode: string) => void;
    onSeriesStatusChange: (status: string) => void;
}

export const SmartPillButton = ({
    viewMode,
    seriesStatus,
    onViewModeChange,
    onSeriesStatusChange
}: SmartPillButtonProps) => {

    const slots = ['Unwatched', 'Watching', 'Watched'];

    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

    const activeIndex = slots.indexOf(viewMode);

    const updateHighlight = () => {
        if (activeIndex !== -1 && optionRefs.current[activeIndex]) {
            const element = optionRefs.current[activeIndex]!;
            const width = element.offsetWidth;
            const left = element.offsetLeft;
            setHighlightStyle({ width: `${width}px`, left: `${left}px` });
        }
    };

    useLayoutEffect(() => {
        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        return () => window.removeEventListener('resize', updateHighlight);
    }, [activeIndex, seriesStatus]);

    const handleClick = (index: number) => {
        const selectedSlot = slots[index];

        if (index === 0) {
            if (viewMode === 'Unwatched') {
                const newStatus = seriesStatus === 'Finished' ? 'Ongoing' : 'Finished';
                onSeriesStatusChange(newStatus);
            } else {
                onViewModeChange('Unwatched');
            }
        } else {
            onViewModeChange(selectedSlot);
        }
    };

    // Helper components for the content states
    const ContentFinished = () => (
        <>
            <span>Finished</span>
            <span className={styles['sub-text']}>on-going</span>
        </>
    );

    const ContentOngoing = () => (
        <>
            <span className={styles['sub-text']}>finished</span>
            <span>On-going</span>
        </>
    );

    return (
        <div className={styles['pill-button']}>
            {/* Slot 0: Toggle Button with Auto-Calibration */}
            <div
                ref={el => { optionRefs.current[0] = el; }}
                className={`${styles['pill-button-selection']} ${viewMode === 'Unwatched' ? styles['pill-button-selection_active'] : ''}`}
                onClick={() => handleClick(0)}
            >
                <div className={styles['calibration-container']}>
                    {/* Dummy 1: Finished Size */}
                    <div className={styles['calibration-dummy']}>
                        <ContentFinished />
                    </div>
                    {/* Dummy 2: Ongoing Size */}
                    <div className={styles['calibration-dummy']}>
                        <ContentOngoing />
                    </div>

                    {/* Actual Visible Content */}
                    <div className={styles['calibration-visible']}>
                        {seriesStatus === 'Finished' ? <ContentFinished /> : <ContentOngoing />}
                    </div>
                </div>
            </div>

            {/* Slot 1: Watching */}
            <div
                ref={el => { optionRefs.current[1] = el; }}
                className={`${styles['pill-button-selection']} ${viewMode === 'Watching' ? styles['pill-button-selection_active'] : ''}`}
                onClick={() => handleClick(1)}
            >
                Watching
            </div>

            {/* Slot 2: Watched */}
            <div
                ref={el => { optionRefs.current[2] = el; }}
                className={`${styles['pill-button-selection']} ${viewMode === 'Watched' ? styles['pill-button-selection_active'] : ''}`}
                onClick={() => handleClick(2)}
            >
                Watched
            </div>

            <div className={styles['pill-button-highlight']} style={highlightStyle}></div>
        </div>
    );
};
