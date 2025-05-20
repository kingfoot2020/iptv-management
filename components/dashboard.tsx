import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { StreamCard } from '@/components/stream-card';
import { StreamForm } from '@/components/stream-form';
import { StreamLogs } from '@/components/stream-logs';
import { StreamProcessInfo } from '@/components/stream-process-info';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { IPTVStream, StreamFormData, StreamStats, SystemStats, CategoryStats } from '@/lib/types';
import { useToastFunctions } from '@/lib/hooks/use-toast';
import { Plus, Search, StopCircle, RefreshCw } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

export function Dashboard() {
  // Get toast functions
  const { success, error } = useToastFunctions();
  
  // State variables
  const [streams, setStreams] = useState<IPTVStream[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<IPTVStream[]>([]);
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [currentStream, setCurrentStream] = useState<IPTVStream | null>(null);
  
  // Fetch all data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/streams');
      
      if (!res.ok) {
        throw new Error('Failed to fetch streams');
      }
      
      const data = await res.json();
      setStreams(data.streams);
      setStats(data.stats);
      setSystemStats(data.systemStats);
      setCategories(data.categories);
    } catch (err) {
      error({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to fetch data'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter streams based on search and category
  useEffect(() => {
    let filtered = [...streams];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(stream => 
        stream.name.toLowerCase().includes(term) || 
        stream.key.toLowerCase().includes(term) ||
        (stream.category1 && stream.category1.toLowerCase().includes(term))
      );
    }
    
    // Apply category filter
    if (activeCategory) {
      filtered = filtered.filter(stream => 
        stream.category1 === activeCategory || 
        (!stream.category1 && activeCategory === 'Uncategorized')
      );
    }
    
    setFilteredStreams(filtered);
  }, [streams, searchTerm, activeCategory]);
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
    
    // Setup auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Stream CRUD operations
  const handleAddStream = async (data: StreamFormData) => {
    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error('Failed to add stream');
      }
      
      const newStream = await res.json();
      setStreams(prev => [...prev, newStream]);
      setShowAddDialog(false);
      fetchData(); // Refresh data
    } catch (err) {
      error({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add stream'
      });
      throw err;
    }
  };
  
  const handleUpdateStream = async (data: StreamFormData) => {
    if (!currentStream) return;
    
    try {
      const res = await fetch(`/api/streams/${currentStream.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update stream');
      }
      
      const updatedStream = await res.json();
      setStreams(prev => prev.map(stream => 
        stream.id === updatedStream.id ? updatedStream : stream
      ));
      setShowEditDialog(false);
      fetchData(); // Refresh data
    } catch (err) {
      error({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update stream'
      });
      throw err;
    }
  };
  
  const handleDeleteStream = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stream?')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/streams/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete stream');
      }
      
      setStreams(prev => prev.filter(stream => stream.id !== id));
      success({
        title: 'Success',
        description: 'Stream deleted successfully'
      });
    } catch (err) {
      error({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete stream'
      });
    }
  };
  
  // Stream control operations
  const handleControlAction = async (id: string, action: 'start' | 'stop' | 'restart') => {
    try {
      const res = await fetch(`/api/streams/${id}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to ${action} stream`);
      }
      
      // Update local state optimistically
      if (action === 'start') {
        setStreams(prev => prev.map(stream => 
          stream.id === id ? { ...stream, active: true } : stream
        ));
      } else if (action === 'stop') {
        setStreams(prev => prev.map(stream => 
          stream.id === id ? { ...stream, active: false } : stream
        ));
      }
      
      // Full refresh after a short delay
      setTimeout(fetchData, 2000);
    } catch (error) {
      error({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} stream`
      });
      throw error;
    }
  };
  
  // Mass actions
  const stopAllStreams = async () => {
    if (!confirm('Are you sure you want to stop all streams?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const activeStreams = streams.filter(stream => stream.active);
      
      for (const stream of activeStreams) {
        await handleControlAction(stream.id, 'stop');
      }
      
      success({
        title: 'Success',
        description: 'All streams stopped successfully'
      });
    } catch (error) {
      error({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop all streams'
      });
    } finally {
      setIsLoading(false);
      fetchData();
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">IPTV Stream Manager</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage and monitor your IPTV streams
          </p>
        </div>
        
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Button
            variant="primary"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Stream
          </Button>
          
          <Button
            variant="danger"
            onClick={stopAllStreams}
            disabled={isLoading || !streams.some(s => s.active)}
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Stop All
          </Button>
          
          <Button
            variant="default"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Streams</h3>
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-500 font-medium">{stats?.active || 0} active</span>
            <span className="mx-2">•</span>
            <span className="text-red-500 font-medium">{stats?.inactive || 0} inactive</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stream Health</h3>
          <div className="mt-1 flex space-x-2">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
              <span className="text-sm">{stats?.health.healthy || 0}</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
              <span className="text-sm">{stats?.health.warning || 0}</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
              <span className="text-sm">{stats?.health.error || 0}</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-gray-500 mr-1"></div>
              <span className="text-sm">{stats?.health.unknown || 0}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="flex h-full">
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${stats ? (stats.health.healthy / stats.total) * 100 : 0}%` }} 
              />
              <div 
                className="bg-yellow-500 h-full" 
                style={{ width: `${stats ? (stats.health.warning / stats.total) * 100 : 0}%` }} 
              />
              <div 
                className="bg-red-500 h-full" 
                style={{ width: `${stats ? (stats.health.error / stats.total) * 100 : 0}%` }} 
              />
              <div 
                className="bg-gray-500 h-full" 
                style={{ width: `${stats ? (stats.health.unknown / stats.total) * 100 : 0}%` }} 
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">System Resource</h3>
          <div className="mt-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs">CPU</span>
              <span className="text-xs font-medium">{systemStats?.cpu || '0%'}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div 
                className="bg-blue-500 h-full rounded-full" 
                style={{ width: `${parseFloat(systemStats?.cpu || '0') || 0}%` }} 
              />
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs">Memory</span>
              <span className="text-xs font-medium">
                {systemStats ? formatFileSize(systemStats.memory.used * 1024 * 1024) : '0'} / 
                {systemStats ? formatFileSize(systemStats.memory.total * 1024 * 1024) : '0'}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div 
                className="bg-purple-500 h-full rounded-full" 
                style={{ width: `${systemStats?.memory.percent || 0}%` }} 
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories</h3>
          <div className="mt-2 max-h-24 overflow-y-auto">
            {categories.length > 0 ? (
              <div className="space-y-1">
                {categories.map(category => (
                  <div 
                    key={category.name} 
                    className="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-1 py-0.5 rounded"
                    onClick={() => setActiveCategory(activeCategory === category.name ? null : category.name)}
                  >
                    <span className={`text-xs ${activeCategory === category.name ? 'font-bold' : ''}`}>
                      {category.name}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-green-500">{category.active}</span>
                      <span className="text-xs text-gray-400">/</span>
                      <span className="text-xs">{category.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No categories</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Search & Filter */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-auto flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search streams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">Filter:</span>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={activeCategory === null ? 'primary' : 'outline'}
                onClick={() => setActiveCategory(null)}
              >
                All
              </Button>
              {categories.slice(0, 5).map(category => (
                <Button
                  key={category.name}
                  size="sm"
                  variant={activeCategory === category.name ? 'primary' : 'outline'}
                  onClick={() => setActiveCategory(activeCategory === category.name ? null : category.name)}
                >
                  {category.name} ({category.total})
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Streams Grid */}
      {isLoading && streams.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Loading streams...</p>
        </div>
      ) : filteredStreams.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-medium">No streams found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {streams.length === 0 
              ? "You haven't added any streams yet." 
              : "No streams match your search criteria."}
          </p>
          {streams.length === 0 && (
            <Button 
              variant="primary" 
              className="mt-4"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add your first stream
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStreams.map(stream => (
            <StreamCard
              key={stream.id}
              stream={stream}
              onEdit={(stream) => {
                setCurrentStream(stream);
                setShowEditDialog(true);
              }}
              onDelete={handleDeleteStream}
              onStart={(id) => handleControlAction(id, 'start')}
              onStop={(id) => handleControlAction(id, 'stop')}
              onRestart={(id) => handleControlAction(id, 'restart')}
              onViewLogs={(id) => {
                const stream = streams.find(s => s.id === id);
                if (stream) {
                  setCurrentStream(stream);
                  setShowLogsDialog(true);
                }
              }}
              onViewProcess={(id) => {
                const stream = streams.find(s => s.id === id);
                if (stream) {
                  setCurrentStream(stream);
                  setShowProcessDialog(true);
                }
              }}
            />
          ))}
        </div>
      )}
      
      {/* Add Stream Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Stream</DialogTitle>
          </DialogHeader>
          <StreamForm
            onSubmit={handleAddStream}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Stream Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Stream</DialogTitle>
          </DialogHeader>
          {currentStream && (
            <StreamForm
              initialData={currentStream}
              onSubmit={handleUpdateStream}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {currentStream && (
            <StreamLogs
              streamId={currentStream.id}
              streamName={currentStream.name}
              onClose={() => setShowLogsDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Process Info Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          {currentStream && (
            <StreamProcessInfo
              streamId={currentStream.id}
              streamName={currentStream.name}
              onClose={() => setShowProcessDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 