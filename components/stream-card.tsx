import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IPTVStream } from '@/lib/types';
import { getStatusColor, truncateText } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Eye, 
  Clipboard,
  Activity
} from 'lucide-react';
import { useToastFunctions } from '@/lib/hooks/use-toast';

interface StreamCardProps {
  stream: IPTVStream;
  onEdit: (stream: IPTVStream) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRestart: (id: string) => Promise<void>;
  onViewLogs: (id: string) => void;
  onViewProcess: (id: string) => void;
}

export function StreamCard({
  stream,
  onEdit,
  onDelete,
  onStart,
  onStop,
  onRestart,
  onViewLogs,
  onViewProcess
}: StreamCardProps) {
  const { success, error } = useToastFunctions();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAction = async (
    action: 'start' | 'stop' | 'restart',
    handler: (id: string) => Promise<void>
  ) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await handler(stream.id);
      
      success({
        title: 'Success',
        description: `Stream ${action}ed successfully`
      });
    } catch (err) {
      error({
        title: 'Error',
        description: `Failed to ${action} stream: ${err}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    success({
      title: 'Copied',
      description
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(stream.active ? 'online' : 'offline')}`}></div>
          <h3 className="text-base font-medium">{stream.name}</h3>
        </div>
        <div className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
          {stream.category1 || 'Uncategorized'}
        </div>
      </div>
      
      <div className="mb-3 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Stream Key:</span>
          <div className="flex items-center space-x-1">
            <span className="font-mono">{stream.key}</span>
            <button
              onClick={() => copyToClipboard(stream.key, 'Stream key copied to clipboard')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <Clipboard className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Resolution:</span>
          <span>{stream.resolution}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Bitrate:</span>
          <span>{stream.bitrate}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Input:</span>
          <span className="max-w-[200px] truncate" title={stream.link1}>
            {truncateText(stream.link1, 30)}
          </span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-2">
        {stream.active ? (
          <>
            <Button 
              variant="danger" 
              size="sm"
              disabled={isLoading}
              onClick={() => handleAction('stop', onStop)}
              title="Stop Stream"
            >
              <Pause className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="warning" 
              size="sm"
              disabled={isLoading}
              onClick={() => handleAction('restart', onRestart)}
              title="Restart Stream"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onEdit(stream)}
              title="Edit Stream"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="success" 
              size="sm"
              onClick={() => onViewProcess(stream.id)}
              title="View Process Info"
            >
              <Activity className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => onViewLogs(stream.id)}
              title="View Logs"
              className="col-span-2"
            >
              <Eye className="h-4 w-4 mr-1" />
              Logs
            </Button>
            
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => onDelete(stream.id)}
              title="Delete Stream"
              className="col-span-2"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="success" 
              size="sm"
              disabled={isLoading}
              onClick={() => handleAction('start', onStart)}
              title="Start Stream"
            >
              <Play className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onEdit(stream)}
              title="Edit Stream"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => onViewLogs(stream.id)}
              title="View Logs"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => onDelete(stream.id)}
              title="Delete Stream"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
} 