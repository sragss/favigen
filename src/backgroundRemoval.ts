export const removeBackground = async (imageUrl: string): Promise<string> => {
    try {
        const { removeBackground: removeBackgroundFn } = await import('@imgly/background-removal');
        const blob = await removeBackgroundFn(imageUrl);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Background removal failed:', error);
        throw new Error('Failed to remove background from image');
    }
};

export const removeBackgroundFromBlob = async (imageBlob: Blob): Promise<string> => {
    try {
        const { removeBackground: removeBackgroundFn } = await import('@imgly/background-removal');
        const blob = await removeBackgroundFn(imageBlob);
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Background removal failed:', error);
        throw new Error('Failed to remove background from image');
    }
};