import { BrowserRouter as Router } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultsTable } from '@/components/ResultsTable';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from "@/components/ui/toaster";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const App = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    console.log('Setting up WebSocket connection...');
    const socket = new WebSocket('ws://localhost:3000');
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket Connected');
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);

        if (data.type === 'sessionStart') {
          console.log('Session started:', data.sessionId);
          setCurrentSessionId(data.sessionId);
        } else if (data.type === 'newJob' && data.data) {
          setResults(prev => [...prev, data.data]);
          setProgress(data.progress || 0);
        } else if (data.type === 'error') {
          console.error('Error message received:', data.message);
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
          setIsProcessing(false);
        } else if (data.type === 'info') {
          console.log('Info message received:', data.message);
          toast({
            title: "Info",
            description: data.message,
          });
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      setWsConnected(false);
      setCurrentSessionId(null);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const stopProcessing = () => {
    console.log('Stopping processing, sessionId:', currentSessionId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentSessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'stop',
        sessionId: currentSessionId
      }));
      
      toast({
        title: "Processing Stop",
        description: "Stop request sent to server...",
      });
    } else {
      toast({
        title: "Error",
        description: "Unable to stop processing: connection lost",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      toast({
        title: "Error",
        description: "No results to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Title', 'Company', 'Location', 'Salary', 'Description', 'URL'];
    const rows = results.map(job => [
      job.title || '',
      job.company || '',
      job.location || '',
      job.salary || '',
      job.description?.text?.replace(/"/g, '""') || job.description?.html?.replace(/<[^>]*>/g, '').replace(/"/g, '""') || '',
      job.url || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'indeed_jobs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    try {
      setIsProcessing(true);
      setProgress(0);
      setResults([]);
      
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch('http://localhost:3000/api/scrape', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process file');
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      if (data.sessionId) {
        setCurrentSessionId(data.sessionId);
      }
      
      toast({
        title: "Success",
        description: "File uploaded successfully. Processing started...",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Toaster />
        <div className="container mx-auto py-12 px-4 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
              Indeed Job Scraper
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Upload your CSV file containing Indeed job links and get structured data for easy analysis
            </p>
          </div>

          <Card className="p-6 bg-white/50 backdrop-blur-sm border-gray-200/50 shadow-lg">
            <FileUpload onFileUpload={handleFileUpload} disabled={isProcessing} />

            {isProcessing && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Processing: {Math.round(progress)}%
                  </span>
                  <span className={`text-sm ${wsConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {wsConnected ? 'Connected to server' : 'Disconnected from server'}
                  </span>
                </div>
                
                <ProgressBar progress={progress} />
                
                <div className="flex justify-end space-x-4">
                  <Button
                    onClick={stopProcessing}
                    variant="destructive"
                  >
                    Stop Processing
                  </Button>
                  <Button
                    onClick={exportToCSV}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Export to CSV
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {results.length > 0 && (
            <div className="space-y-4">
              <ResultsTable results={results} />
              
              {!isProcessing && (
                <div className="flex justify-end">
                  <Button
                    onClick={exportToCSV}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Export to CSV
                  </Button>
                </div>
              )}
            </div>
          )}

          <Card className="p-4 bg-white/50 backdrop-blur-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
              <div>Status: {wsConnected ? 'Connected' : 'Disconnected'}</div>
              <div>Session: {currentSessionId || 'None'}</div>
              <div>Results: {results.length}</div>
              <div>Progress: {progress}%</div>
            </div>
          </Card>
        </div>
      </div>
    </Router>
  );
};

export default App;
