import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IPTVStream, StreamFormData } from '@/lib/types';
import { useToastFunctions } from '@/lib/hooks/use-toast';

interface StreamFormProps {
  initialData?: IPTVStream;
  onSubmit: (data: StreamFormData) => Promise<void>;
  onCancel: () => void;
}

export function StreamForm({ initialData, onSubmit, onCancel }: StreamFormProps) {
  const { success, error } = useToastFunctions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<StreamFormData>({
    name: initialData?.name || '',
    key: initialData?.key || '',
    link1: initialData?.link1 || '',
    rtmp: initialData?.rtmp || '',
    category1: initialData?.category1 || '',
    bitrate: initialData?.bitrate || '1000k',
    resolution: initialData?.resolution || '1280x720',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.key || !formData.link1 || !formData.rtmp) {
      error({
        title: "Validation Error",
        description: "Please fill out all required fields."
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      success({
        title: "Success",
        description: initialData 
          ? `Stream "${formData.name}" updated successfully` 
          : `Stream "${formData.name}" created successfully`
      });
    } catch (err) {
      error({
        title: "Error",
        description: `Failed to ${initialData ? 'update' : 'create'} stream: ${err}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            Stream Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Sport TV 1"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="key" className="block text-sm font-medium">
            Stream Key <span className="text-red-500">*</span>
          </label>
          <input
            id="key"
            name="key"
            type="text"
            value={formData.key}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="tv1"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="link1" className="block text-sm font-medium">
            Input URL <span className="text-red-500">*</span>
          </label>
          <input
            id="link1"
            name="link1"
            type="text"
            value={formData.link1}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="https://example.com/stream.m3u8"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="rtmp" className="block text-sm font-medium">
            RTMP URL <span className="text-red-500">*</span>
          </label>
          <input
            id="rtmp"
            name="rtmp"
            type="text"
            value={formData.rtmp}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="rtmp://server.example.com/live"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="category1" className="block text-sm font-medium">
            Category
          </label>
          <input
            id="category1"
            name="category1"
            type="text"
            value={formData.category1}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Sports"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="bitrate" className="block text-sm font-medium">
            Bitrate
          </label>
          <select
            id="bitrate"
            name="bitrate"
            value={formData.bitrate}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="500k">500k</option>
            <option value="800k">800k</option>
            <option value="1000k">1000k</option>
            <option value="1500k">1500k</option>
            <option value="2000k">2000k</option>
            <option value="3000k">3000k</option>
            <option value="4000k">4000k</option>
            <option value="5000k">5000k</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="resolution" className="block text-sm font-medium">
            Resolution
          </label>
          <select
            id="resolution"
            name="resolution"
            value={formData.resolution}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="640x360">640x360</option>
            <option value="854x480">854x480</option>
            <option value="1280x720">1280x720 (720p)</option>
            <option value="1920x1080">1920x1080 (1080p)</option>
            <option value="2560x1440">2560x1440 (1440p)</option>
            <option value="3840x2160">3840x2160 (4K)</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Stream' : 'Add Stream'}
        </Button>
      </div>
    </form>
  );
} 