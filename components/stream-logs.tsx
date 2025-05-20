import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogEntry } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';

interface StreamLogsProps {
  streamId: string;
  streamName: string;
  onClose: () => void;
}

export function StreamLogs({ streamId, streamName, onClose }: StreamLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [limit, setLimit] = useState(50);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/streams/${streamId}/logs?limit=${limit}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await res.json();
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/streams/${streamId}/logs`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to clear logs');
      }
      
      setLogs([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Setup auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamId, limit, autoRefresh]);

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'success':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Logs: {streamName}</h2>
        <div className="flex items-center space-x-2">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="p-1 text-sm border rounded"
          >
            <option value={25}>25 lines</option>
            <option value={50}>50 lines</option>
            <option value={100}>100 lines</option>
            <option value={250}>250 lines</option>
            <option value={500}>500 lines</option>
          </select>
          
          <Button
            size="sm"
            variant={autoRefresh ? 'primary' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh: On' : 'Auto-refresh: Off'}
          </Button>
          
          <Button size="sm" variant="default" onClick={fetchLogs}>
            Refresh
          </Button>
          
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => {
              if (confirm('Are you sure you want to clear all logs?')) {
                clearLogs();
              }
            }}
          >
            Clear Logs
          </Button>
        </div>
      </div>
      
      {isLoading && logs.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-gray-500">Loading logs...</span>
        </div>
      ) : error ? (
        <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-md dark:bg-red-900/20">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-gray-500">No logs available</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto border rounded-md dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-xs">
                    <span className={`${getLogTypeColor(log.type)} font-medium`}>
                      {log.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-xs text-gray-900 dark:text-gray-300">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="flex justify-end mt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
} 