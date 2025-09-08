import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface FaviconSizes {
    '16x16': string;
    '32x32': string;
    '180x180': string;  // apple-touch-icon
    favicon: string;    // .ico format
}

const resizeImage = (imageUrl: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = width;
            canvas.height = height;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = imageUrl;
    });
};

const createIcoFromPng = async (pngDataUrl: string): Promise<Blob> => {
    const img = new Image();
    img.src = pngDataUrl;
    
    return new Promise((resolve) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = 32;
            canvas.height = 32;
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, 32, 32);
            
            canvas.toBlob((blob) => {
                resolve(blob!);
            }, 'image/png');
        };
    });
};

export const generateFaviconPack = async (originalImageUrl: string): Promise<void> => {
    const zip = new JSZip();
    
    // Generate different sizes
    const favicon16 = await resizeImage(originalImageUrl, 16, 16);
    const favicon32 = await resizeImage(originalImageUrl, 32, 32);
    const appleTouch = await resizeImage(originalImageUrl, 180, 180);
    
    // Convert data URLs to blobs and add to zip
    const favicon16Blob = await fetch(favicon16).then(r => r.blob());
    const favicon32Blob = await fetch(favicon32).then(r => r.blob());
    const appleTouchBlob = await fetch(appleTouch).then(r => r.blob());
    const faviconIcoBlob = await createIcoFromPng(favicon32);
    
    // Get the original/raw image
    const originalBlob = await fetch(originalImageUrl).then(r => r.blob());
    
    zip.file('favicon-16x16.png', favicon16Blob);
    zip.file('favicon-32x32.png', favicon32Blob);
    zip.file('apple-touch-icon.png', appleTouchBlob);
    zip.file('favicon.ico', faviconIcoBlob);
    zip.file('icon-original.png', originalBlob);
    
    // Generate site.webmanifest
    const manifest = {
        name: "App",
        short_name: "App",
        icons: [
            {
                src: "/favicon-32x32.png",
                sizes: "32x32",
                type: "image/png"
            },
            {
                src: "/apple-touch-icon.png",
                sizes: "180x180",
                type: "image/png"
            }
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone"
    };
    
    zip.file('site.webmanifest', JSON.stringify(manifest, null, 2));
    
    
    // Generate and download the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'favicon-pack.zip');
};