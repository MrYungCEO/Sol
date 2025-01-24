import { mockWebSocketMessages } from './mockData';
import { EventEmitter } from './EventEmitter';

export class MockWebSocketService extends EventEmitter {
  private connected = false;
  private messageInterval: number | null = null;
  private currentMessageIndex = 0;

  connect() {
    if (this.connected) return;
    
    this.connected = true;
    this.emit('connected');

    // Simulate periodic messages
    this.messageInterval = window.setInterval(() => {
      if (this.connected) {
        const message = mockWebSocketMessages[this.currentMessageIndex];
        this.emit('message', message);
        
        this.currentMessageIndex = (this.currentMessageIndex + 1) % mockWebSocketMessages.length;
      }
    }, 5000); // Send a message every 5 seconds
  }

  disconnect() {
    if (!this.connected) return;
    
    this.connected = false;
    if (this.messageInterval !== null) {
      window.clearInterval(this.messageInterval);
      this.messageInterval = null;
    }
    
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }
}