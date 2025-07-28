import React, { useState, useCallback } from 'react';

// --- Helper Components ---

const Header = () => (
    <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Your Personal Travel Guide</h1>
        <p className="text-lg text-gray-600 mt-2">Add a bio and upload images to get AI-powered travel recommendations.</p>
    </header>
);

const ImageUploader = ({ uploadedImages, onImageUpload, onImageRemove }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Profile Images (optional):</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 4v.01M28 8L16 20m12-12v12m0 0h12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                    <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload files</span>
                        <input id="image-upload" name="image-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg" onChange={onImageUpload} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG up to 10MB each. Max 5 images.</p>
            </div>
        </div>
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
            {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                    <img src={image.base64} alt="preview" className="w-full h-auto object-cover rounded-lg shadow-md" />
                    <div 
                        onClick={() => onImageRemove(index)}
                        className="absolute top-[-0.5rem] right-[-0.5rem] bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        &times;
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const Results = ({ isLoading, error, recommendations, city }) => {
    if (!isLoading && !error && recommendations.length === 0) {
        return null;
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-center mb-6">Your Personalized {city} Itinerary</h2>
            {isLoading && (
                <div className="flex justify-center items-center h-40">
                    <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-24 w-24 animate-spin border-t-blue-500"></div>
                </div>
            )}
            {error && <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>}
            {!isLoading && recommendations.length > 0 && (
                <div className="space-y-4">
                    {recommendations.map((rec, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                            <h3 className="text-xl font-bold text-blue-700 mb-2">{rec.title}</h3>
                            <p className="text-gray-700 mb-4">{rec.explanation}</p>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="font-semibold text-blue-800">Suggested Activity:</p>
                                <p className="text-blue-900">{rec.activity}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [profileText, setProfileText] = useState('');
    const [city, setCity] = useState('Riga');
    const [uploadedImages, setUploadedImages] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleImageUpload = (event) => {
        const files = event.target.files;
        if (!files) return;

        if (uploadedImages.length + files.length > 5) {
            alert("You can upload a maximum of 5 images.");
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64String = e.target.result;
                const imageData = { file: { type: file.type }, base64: base64String };
                setUploadedImages(prev => [...prev, imageData]);
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const handleImageRemove = (indexToRemove) => {
        setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleGenerate = useCallback(async () => {
        if ((!profileText && uploadedImages.length === 0) || !city) {
            setError("Please provide a profile description or upload images, and specify a city.");
            return;
        }

        setIsLoading(true);
        setError('');
        setRecommendations([]);

        try {
            const response = await fetch('/api/getRecommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: profileText,
                    city: city,
                    images: uploadedImages
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'The server returned an error.');
            }

            const result = await response.json();
            setRecommendations(result);

        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [profileText, city, uploadedImages]);

    return (
        <div className="bg-gray-100 text-gray-800 font-sans">
            <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-3xl">
                <Header />
                <main>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <div className="mb-4">
                            <label htmlFor="profile-input" className="block text-sm font-medium text-gray-700 mb-2">Profile Description (optional):</label>
                            <textarea
                                id="profile-input"
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                placeholder="e.g., 'Loves hiking, landscape photography, and craft beer.'"
                                value={profileText}
                                onChange={(e) => setProfileText(e.target.value)}
                            />
                        </div>

                        <ImageUploader 
                            uploadedImages={uploadedImages}
                            onImageUpload={handleImageUpload}
                            onImageRemove={handleImageRemove}
                        />

                        <div className="mb-6">
                            <label htmlFor="city-input" className="block text-sm font-medium text-gray-700 mb-2">Destination City:</label>
                            <input
                                type="text"
                                id="city-input"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                placeholder="e.g., Riga, Paris, Tokyo"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Generating...' : 'Get Recommendations'}
                            </button>
                        </div>
                    </div>
                    <Results 
                        isLoading={isLoading} 
                        error={error} 
                        recommendations={recommendations} 
                        city={city} 
                    />
                </main>
            </div>
        </div>
    );
}