import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { ResultsTable } from '@/components/ResultsTable';

export default function Index() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsLoading(true);
      setError('');
      setResults([]);
      setProgress(0);
      
      const formData = new FormData();
      formData.append('csvFile', file);

      try {
        const response = await axios.post('http://localhost:3000/api/scrape', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('File upload response:', response.data);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.response?.data?.error || 'Une erreur est survenue lors du traitement du fichier.');
        setResults([]);
        setIsLoading(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  useEffect(() => {
    console.log('Setting up WebSocket connection...');
    const ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'test') {
          console.log('Test message received:', data.message);
        } else if (data.type === 'newJob' && data.data) {
          console.log('New job received:', data.data);
          const newJob = {
            title: data.data.title || '',
            company: data.data.company || '',
            location: data.data.location || '',
            salary: data.data.salary || '',
            description: {
              html: data.data.description?.html || '',
              text: data.data.description?.text || ''
            },
            url: data.data.url || ''
          };
          console.log('Formatted job:', newJob);
          
          setResults(prev => {
            const newResults = [...prev, newJob];
            console.log('Updated results array:', newResults);
            return newResults;
          });
          setProgress(data.progress || 0);
        } else if (data.type === 'error') {
          console.error('Error message received:', data.message);
          setError(data.message);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Erreur de connexion WebSocket');
      setIsLoading(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    return () => {
      console.log('Cleaning up WebSocket connection...');
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Indeed Job Scraper
          </h1>
          <p className="text-2xl text-gray-600">
            Upload your CSV file with Indeed job links and get structured data
          </p>
        </div>

        <div className="w-full">
          <div 
            {...getRootProps()} 
            className={`
              p-20 border-3 border-dashed rounded-2xl 
              transition-all duration-200 ease-in-out cursor-pointer
              flex flex-col items-center justify-center
              ${isDragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400 bg-white'
              }
            `}
          >
            <input {...getInputProps()} />
            
            <svg 
              className={`w-24 h-24 mb-8 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
              stroke="currentColor" 
              fill="none" 
              viewBox="0 0 48 48" 
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M24 32V16m0 0l-8 8m8-8l8 8M6 37l2.5 2.5a8 8 0 005.7 2.5h19.6a8 8 0 005.7-2.5L42 37M6 25v12M42 25v12" 
              />
            </svg>

            {isLoading ? (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="mt-6 text-gray-600 text-2xl">Traitement en cours... {progress}%</p>
              </div>
            ) : (
              <>
                <p className="text-3xl text-center mb-4">
                  {isDragActive ? (
                    <span className="text-blue-600 font-semibold">Déposez votre fichier CSV ici</span>
                  ) : (
                    <span className="text-gray-700">
                      Glissez-déposez votre fichier CSV ici, ou <span className="text-blue-600 font-semibold">cliquez pour sélectionner</span>
                    </span>
                  )}
                </p>
                <p className="text-gray-500 text-xl">
                  Seuls les fichiers CSV sont acceptés
                </p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-8">
            <div className="p-6 rounded-xl bg-red-50 border-2 border-red-200">
              <p className="text-red-800 text-xl">{error}</p>
            </div>
          </div>
        )}

        <div className="mt-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Résultats {results.length > 0 && `(${results.length} offres trouvées)`}
            </h2>
            {isLoading && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600 mr-3"></div>
                <span className="text-gray-600">Analyse en cours... {progress}%</span>
              </div>
            )}
          </div>
          <ResultsTable results={results} />
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>WebSocket: {wsConnected ? 'Connecté' : 'Déconnecté'}</p>
          <p>Résultats: {results.length}</p>
          <p>Chargement: {isLoading ? 'Oui' : 'Non'}</p>
          <p>Progression: {progress}%</p>
        </div>
      </div>
    </div>
  );
}