'use client';

import { ModalPortal, MODAL_PORTAL_Z_INDEX } from '@/components/ui/ModalPortal';
import { NovoInsumoWizard } from '@/components/estoque/NovoInsumoWizard';

export function NovoInsumoModal({
    open,
    onClose,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess?: (hasPr?: boolean) => void;
}) {
    if (!open) return null;

    return (
        <ModalPortal>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: MODAL_PORTAL_Z_INDEX,
                    background: 'rgba(2, 6, 23, 0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    animation: 'mov-fade-in 0.2s ease',
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="custom-scrollbar"
                    style={{
                        width: 'min(820px, 100%)',
                        maxHeight: '92vh',
                        background: '#FFFFFF',
                        borderRadius: 16,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        overflowY: 'auto',
                        padding: '1rem 1.25rem',
                    }}
                >
                    <NovoInsumoWizard
                        isModal
                        onModalClose={onClose}
                        onModalSuccess={(hasPr) => {
                            onSuccess?.(hasPr);
                            onClose();
                        }}
                    />
                </div>
            </div>
            <style>{`@keyframes mov-fade-in { from { opacity: 0 } to { opacity: 1 } }`}</style>
        </ModalPortal>
    );
}
