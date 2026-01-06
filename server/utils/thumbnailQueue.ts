interface QueuedThumbnail {
  thumbnailId: string;
  userId: string;
  prompt: string;
  config: any;
  timestamp: number;
}

class ThumbnailQueue {
  private queue: QueuedThumbnail[] = [];
  private processing = false;

  addToQueue(item: QueuedThumbnail) {
    this.queue.push(item);
    console.log(`Added thumbnail to queue. Queue length: ${this.queue.length}`);
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    console.log('Processing thumbnail queue...');
    
    // Process queue items when quota is available
    // Implementation would go here
    
    this.processing = false;
  }

  getQueueLength() {
    return this.queue.length;
  }

  getQueuePosition(thumbnailId: string) {
    return this.queue.findIndex(item => item.thumbnailId === thumbnailId) + 1;
  }
}

export const thumbnailQueue = new ThumbnailQueue();
export default thumbnailQueue;