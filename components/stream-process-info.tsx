import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { IPTVStream } from '@/lib/types';
import { RefreshCw } from 'lucide-react';

interface StreamProcessInfoProps {
  streamId: string;
  streamName: string;
  onClose: () => void;
}

type ProcessInfo = {
  running: boolean;
  pid?: string;
  cpu?: string;
  memory?: string;
  runtime?: string;
  bitrate?: string;
  fps?: string;
};

export function StreamProcessInfo({ streamId, streamName, onClose }: StreamProcessInfoProps) {
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchProcessInfo = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/streams/${streamId}/process`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch process information');
      }
      
      const data = await res.json();
      setProcessInfo(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProcessInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessInfo();
    
    // Setup auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(fetchProcessInfo, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamId, autoRefresh]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Stream Process: {streamName}</h2>
          <p className="text-sm text-gray-500">Real-time process monitoring</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={autoRefresh ? 'primary' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh: On' : 'Auto-refresh: Off'}
          </Button>
          
          <Button size="sm" variant="default" onClick={fetchProcessInfo}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {isLoading && !processInfo ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-gray-500">Loading process information...</span>
        </div>
      ) : error ? (
        <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-md dark:bg-red-900/20">
          {error}
        </div>
      ) : !processInfo || !processInfo.running ? (
        <div className="p-6 mb-4 text-center bg-gray-50 rounded-md dark:bg-gray-900/50">
          <h3 className="text-lg font-medium mb-2">Stream is not running</h3>
          <p className="text-gray-500">Start the stream to view process information.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Process ID */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Process ID</h3>
              <div className="mt-1">
                <span className="text-xl font-mono">{processInfo.pid || 'N/A'}</span>
              </div>
            </div>
            
            {/* CPU Usage */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">CPU Usage</h3>
              <div className="mt-1">
                <span className="text-xl font-mono">{processInfo.cpu || '0%'}</span>
              </div>
            </div>
            
            {/* Memory Usage */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory Usage</h3>
              <div className="mt-1">
                <span className="text-xl font-mono">{processInfo.memory || '0 MB'}</span>
              </div>
            </div>
            
            {/* Runtime */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Runtime</h3>
              <div className="mt-1">
                <span className="text-xl font-mono">{processInfo.runtime || '0s'}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Stream Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bitrate */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">Current Bitrate</span>
                  <span className="text-sm font-mono">{processInfo.bitrate || 'N/A'}</span>
                </div>
                {processInfo.bitrate && processInfo.bitrate !== 'N/A' && (
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div 
                      className="bg-green-500 h-full rounded-full" 
                      style={{ width: `${Math.min(parseInt(processInfo.bitrate) / 10, 100)}%` }} 
                    />
                  </div>
                )}
              </div>
              
              {/* FPS */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">Frames Per Second</span>
                  <span className="text-sm font-mono">{processInfo.fps || 'N/A'}</span>
                </div>
                {processInfo.fps && processInfo.fps !== 'N/A' && (
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div 
                      className="bg-blue-500 h-full rounded-full" 
                      style={{ width: `${Math.min(parseInt(processInfo.fps) / 60 * 100, 100)}%` }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
} 