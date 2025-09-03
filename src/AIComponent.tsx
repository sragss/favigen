import { useState, useCallback, useEffect } from 'react';
import { useEchoModelProviders } from '@merit-systems/echo-react-sdk';
import { editImages } from './imageHelpers';
import { generateFaviconPack } from './faviconGenerator';
import { Upload, Save, Pencil, Image } from 'lucide-react';

interface UploadedImage {
    file: File;
    url: string;
    id: string;
}


export default function AIComponent() { 
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [editPrompt, setEditPrompt] = useState("");
    const [editedImages, setEditedImages] = useState<string[]>([]);
    const [isEditingImages, setIsEditingImages] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [showLoadingBar, setShowLoadingBar] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    const { google } = useEchoModelProviders();

    const addImages = useCallback((files: FileList | File[]) => {
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        const newImages: UploadedImage[] = validFiles.map(file => ({
            file,
            url: URL.createObjectURL(file),
            id: Math.random().toString(36).substring(7)
        }));
        setUploadedImages(prev => [...prev, ...newImages]);
    }, []);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            addImages(files);
        }
    };

    const removeImage = (id: string) => {
        setUploadedImages(prev => {
            const imageToRemove = prev.find(img => img.id === id);
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.url);
            }
            return prev.filter(img => img.id !== id);
        });
    };

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            addImages(files);
        }
    }, [addImages]);

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    imageFiles.push(file);
                }
            }
        }

        if (imageFiles.length > 0) {
            addImages(imageFiles);
        }
    }, [addImages]);

    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('drop', handleDrop);
        
        return () => {
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('dragleave', handleDragLeave);
            document.removeEventListener('drop', handleDrop);
        };
    }, [handlePaste, handleDragOver, handleDragLeave, handleDrop]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modalImage) {
                setModalImage(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [modalImage]);

    const handleImageEdit = async () => {
        // Allow generation without input images for favicon generation
        setIsEditingImages(true);
        setEditedImages([]);
        setErrorMessage(null); // Clear any previous errors
        setShowLoadingBar(true);
        setLoadingProgress(0);
        
        // Start simulated progress animation
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev < 90) {
                    return prev + Math.random() * 2 + 1; // Random progress between 1-3% per step
                }
                return 90; // Stop at 90%
            });
        }, 400);
        
        try {
            const files = uploadedImages.map(img => img.file);
            const editedImageUrls = await editImages(files, editPrompt, google);
            
            // Clear the interval and finish the progress bar
            clearInterval(progressInterval);
            setLoadingProgress(100);
            
            // Wait a moment to show completion, then hide
            setTimeout(() => {
                setEditedImages(editedImageUrls);
                setShowLoadingBar(false);
                setLoadingProgress(0);
            }, 500);
            
        } catch (error) {
            console.error('Image editing error:', error);
            clearInterval(progressInterval);
            setShowLoadingBar(false);
            setLoadingProgress(0);
            
            // Set user-friendly error message
            const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred while generating your favicon. Please try again.';
            setErrorMessage(errorMsg);
        } finally {
            setIsEditingImages(false);
        }
    };

    const handleSaveFavicon = async (imageUrl: string) => {
        try {
            await generateFaviconPack(imageUrl);
        } catch (error) {
            console.error('Error generating favicon pack:', error);
            setErrorMessage('Failed to generate favicon pack. Please try again.');
        }
    };
    
    const handleEditFavicon = async (imageUrl: string) => {
        try {
            // Convert the image URL to a File and add to input
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'favicon-to-edit.png', { type: blob.type });
            
            const uploadedImage: UploadedImage = {
                file,
                url: imageUrl,
                id: Math.random().toString(36).substring(7)
            };
            
            // Clear everything and add the image as input
            setUploadedImages([uploadedImage]);
            setEditedImages([]);
            setEditPrompt('');
            
            // Focus the prompt input
            setTimeout(() => {
                const textArea = document.querySelector('textarea');
                if (textArea) {
                    textArea.focus();
                }
            }, 100);
        } catch (error) {
            console.error('Error editing favicon:', error);
            setErrorMessage('Failed to prepare favicon for editing. Please try again.');
        }
    };


    return (
        <div className={`w-full p-5 transition-colors ${isDragOver ? 'bg-blue-50' : ''}`}>
            {/* Full page drag overlay */}
            {isDragOver && (
                <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-500 z-10 flex items-center justify-center">
                    <div className="bg-white p-8 border border-blue-500 rounded-lg shadow-lg">
                        <div className="flex items-center gap-3">
                            <Upload size={24} className="text-blue-500" />
                            <span className="text-lg">Drop your reference images here</span>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Favicon generator prompt - always show */}
            <div className="mb-8">
                <div className="text-center mb-6">
                    <h2 className="text-xl mb-2">What type of favicon would you like to generate?</h2>
                    <p className="text-sm text-gray-600">Describe your ideal favicon and optionally add a reference image</p>
                </div>
                
                {/* Prompt input with integrated image upload - always visible */}
                <div className="border border-black p-6 mb-6">
                    <div className="relative">
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    if (!isEditingImages) {
                                        handleImageEdit();
                                    }
                                }
                            }}
                            placeholder="Describe your favicon... (e.g., 'A minimalist blue checkmark', 'Company logo with letter M in green', 'Abstract geometric pattern') - Cmd+Enter to generate"
                            className="w-full h-20 p-3 pr-12 border border-black mb-4 resize-y focus:outline-none"
                        />
                        {/* Image upload button inside textarea */}
                        <button
                            onClick={() => document.getElementById('file-upload')?.click()}
                            className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded cursor-pointer border border-gray-300"
                            title="Add reference image"
                        >
                            <Image size={16} className="text-gray-500" />
                        </button>
                        
                        {/* Hidden file input */}
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="file-upload"
                        />
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleImageEdit}
                            disabled={isEditingImages || !editPrompt.trim()}
                            className={`
                                px-4 py-2 border border-black cursor-pointer
                                ${!isEditingImages && editPrompt.trim()
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-300 text-gray-500'
                                }
                            `}
                        >
                            {isEditingImages ? 'Generating favicon...' : 'Generate Favicon'}
                        </button>
                        <div className="text-sm text-gray-500">
                            Paste or drag images anywhere on the page
                        </div>
                    </div>
                </div>
            </div>

            {/* Reference Images */}
            {uploadedImages.length > 0 && (
                <div className="mb-8">
                    <h3 className="mb-4 text-lg">
                        Reference Images ({uploadedImages.length})
                    </h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-5">
                        {uploadedImages.map((image) => (
                            <div key={image.id} className="relative">
                                <img
                                    src={image.url}
                                    alt={image.file.name}
                                    className="w-full h-50 object-cover border border-black cursor-pointer"
                                    onClick={() => setModalImage(image.url)}
                                />
                                <button
                                    onClick={() => removeImage(image.id)}
                                    className="absolute top-1 right-1 bg-white border border-black w-6 h-6 cursor-pointer text-sm flex items-center justify-center"
                                >
                                    ×
                                </button>
                                <p className="mt-1 text-xs text-center overflow-hidden text-ellipsis whitespace-nowrap">
                                    {image.file.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {errorMessage && (
                <div className="border border-black bg-red-50 p-4 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg mb-2">Error</h3>
                            <p className="text-sm">{errorMessage}</p>
                        </div>
                        <button
                            onClick={() => setErrorMessage(null)}
                            className="border border-black bg-white w-6 h-6 cursor-pointer text-sm flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}


            {/* Generated Favicons */}
            {editedImages.length > 0 && (
                <div>
                    <h3 className="mb-5 text-lg">
                        Generated Favicons ({editedImages.length})
                    </h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5 mb-5">
                        {editedImages.map((imageUrl, index) => (
                            <div key={index} className="text-center border border-black p-4">
                                <img
                                    src={imageUrl}
                                    alt={`Generated favicon ${index + 1}`}
                                    className="w-full h-auto max-h-96 object-contain mb-4 cursor-pointer"
                                    onClick={() => setModalImage(imageUrl)}
                                />
                                
                                {/* Browser tab preview */}
                                <div className="mb-4 flex justify-center">
                                    <div className="bg-gray-200 rounded-t-lg px-3 py-1 flex items-center gap-2 text-xs border border-gray-300">
                                        <img
                                            src={imageUrl}
                                            alt="Favicon preview"
                                            className="w-8 h-8 object-contain"
                                        />
                                        <span className="text-gray-600">Your Website</span>
                                        <button className="text-gray-400 hover:text-gray-600 ml-2">×</button>
                                    </div>
                                </div>
                                
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => handleSaveFavicon(imageUrl)}
                                        className="flex items-center gap-1 px-3 py-2 border border-black bg-green-600 text-white cursor-pointer hover:bg-green-700"
                                        title="Download favicon pack"
                                    >
                                        <Save size={16} />
                                        Save
                                    </button>
                                    <button
                                        onClick={() => handleEditFavicon(imageUrl)}
                                        className="flex items-center gap-1 px-3 py-2 border border-black bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                                        title="Edit this favicon"
                                    >
                                        <Pencil size={16} />
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading Bar */}
            {showLoadingBar && (
                <div className="fixed top-0 left-0 right-0 z-50">
                    <div className="h-2 sm:h-1 bg-gray-200">
                        <div 
                            className="h-full bg-black transition-all duration-300 ease-out"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {modalImage && (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setModalImage(null)}
                >
                    <div className="relative max-w-full max-h-full">
                        <img
                            src={modalImage}
                            alt="Full size view"
                            className="max-w-full max-h-full object-contain border border-black"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setModalImage(null)}
                            className="absolute top-2 right-2 bg-white border border-black w-8 h-8 cursor-pointer text-lg flex items-center justify-center"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}