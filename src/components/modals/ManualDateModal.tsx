import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Save, Tv } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';

import { getTodayIsoString } from '../../lib/dateUtils';

interface ManualDateModalProps {
    media: TMDBMedia;
    onClose: () => void;
    onSave: (date: string, ottName: string) => Promise<void>;
    onReset: () => Promise<void>;
}

export const ManualDateModal = ({ media, onClose, onSave, onReset }: ManualDateModalProps) => {
    // No casting needed: TMDBMedia now has these fields typed!
    const [date, setDate] = useState(media.digital_release_date || getTodayIsoString());
    const [ottName, setOttName] = useState(media.manual_ott_name || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!date) return;
        setIsSaving(true);
        try {
            await onSave(date, ottName.trim());
            onClose();
        } catch (err) {
            console.error("Failed to save manual date", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        setIsSaving(true);
        try {
            await onReset();
            // onClose is usually called by the parent after onReset finishes or explicitly
        } catch (err) {
            console.error("Failed to reset manual date", err);
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <div
                className="modal-content animate-scale-up"
                style={{
                    maxWidth: '440px',
                    padding: '0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(135deg, #1a1c20 0%, #0f1014 100%)',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                padding: '12px',
                                backgroundColor: 'rgba(45, 212, 191, 0.1)',
                                borderRadius: '16px',
                                color: '#2dd4bf',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Calendar size={28} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: '0', letterSpacing: '-0.02em' }}>Set OTT Release</h2>
                                <p style={{ color: '#9ca3af', fontSize: '14px', margin: '4px 0 0', fontWeight: '500' }}>{media.title}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                color: '#9ca3af',
                                display: 'flex'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(45, 212, 191, 0.8)' }}>
                                <Tv size={12} />
                                OTT Platform Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Netflix, Disney+, Prime"
                                value={ottName}
                                onChange={(e) => setOttName(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: '500',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => (e.target.style.borderColor = 'rgba(45, 212, 191, 0.4)')}
                                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                            />
                            <p style={{ fontSize: '10px', color: '#4b5563', margin: '0', fontStyle: 'italic' }}>Optional: If left blank, it shows "Coming to OTT"</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(45, 212, 191, 0.8)' }}>
                                <Calendar size={12} />
                                Digital Release Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    padding: '16px 20px',
                                    color: 'white',
                                    fontSize: '18px',
                                    fontWeight: '500',
                                    outline: 'none',
                                    colorScheme: 'dark',
                                    boxSizing: 'border-box'
                                }}
                                onFocus={(e) => (e.target.style.borderColor = 'rgba(45, 212, 191, 0.4)')}
                                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', paddingTop: '16px' }}>
                            <button
                                onClick={media.manual_date_override ? handleReset : onClose}
                                disabled={isSaving}
                                style={{
                                    flex: '1',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    backgroundColor: media.manual_date_override ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                                    color: media.manual_date_override ? '#ef4444' : 'white',
                                    fontWeight: '700',
                                    border: media.manual_date_override ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isSaving && media.manual_date_override ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.backgroundColor = media.manual_date_override ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={(e) => { if (!isSaving) e.currentTarget.style.backgroundColor = media.manual_date_override ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)'; }}
                            >
                                {isSaving && meta.manual_date_override ? (
                                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                ) : (
                                    meta.manual_date_override ? 'Reset' : 'Cancel'
                                )}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !date}
                                style={{
                                    flex: '1.5',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    backgroundColor: '#14b8a6',
                                    color: 'white',
                                    fontWeight: '800',
                                    border: 'none',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                                    transition: 'all 0.2s',
                                    opacity: isSaving ? 0.6 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.backgroundColor = '#0d9488';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSaving) {
                                        e.currentTarget.style.backgroundColor = '#14b8a6';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                {isSaving ? (
                                    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>,
        document.body
    );
};
