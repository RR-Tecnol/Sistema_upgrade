'use client';

import { useState } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Document {
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
}

interface DocumentViewerProps {
    documents: Document[];
    initialIndex?: number;
    onClose: () => void;
}

export default function DocumentViewer({ documents, initialIndex = 0, onClose }: DocumentViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    if (!documents || documents.length === 0) {
        return null;
    }

    const currentDoc = documents[currentIndex];
    const isPDF = currentDoc.url.toLowerCase().endsWith('.pdf');

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = currentDoc.url;
        link.download = currentDoc.name;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="text-white">
                    <h3 className="font-semibold">{currentDoc.name}</h3>
                    <p className="text-sm text-gray-300">
                        {currentIndex + 1} de {documents.length}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Baixar"
                    >
                        <ArrowDownTrayIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Fechar"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Navigation Arrows */}
            {documents.length > 1 && (
                <>
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        title="Anterior"
                    >
                        <ChevronLeftIcon className="w-8 h-8" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        title="Próximo"
                    >
                        <ChevronRightIcon className="w-8 h-8" />
                    </button>
                </>
            )}

            {/* Document Display */}
            <div className="max-w-6xl max-h-[80vh] w-full mx-4">
                {isPDF ? (
                    <iframe
                        src={currentDoc.url}
                        className="w-full h-[80vh] bg-white rounded-lg"
                        title={currentDoc.name}
                    />
                ) : (
                    <div className="flex items-center justify-center h-[80vh]">
                        <img
                            src={currentDoc.url}
                            alt={currentDoc.name}
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {documents.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4">
                    <div className="flex gap-2 overflow-x-auto justify-center">
                        {documents.map((doc, index) => (
                            <button
                                key={doc.id}
                                onClick={() => setCurrentIndex(index)}
                                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                        ? 'border-blue-500 scale-110'
                                        : 'border-white/20 hover:border-white/50'
                                    }`}
                            >
                                {doc.url.toLowerCase().endsWith('.pdf') ? (
                                    <div className="w-full h-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                                        PDF
                                    </div>
                                ) : (
                                    <img
                                        src={doc.url}
                                        alt={doc.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Keyboard Navigation Hint */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                Use ← → para navegar
            </div>
        </div>
    );
}
