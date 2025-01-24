import { WS_RECONNECT_DELAY, WS_MAX_RECONNECT_ATTEMPTS } from '../config/api';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPongTime: number = Date.now();
  private messageQueue: string[] = [];

  constructor(
    private url: string,
    private onMessage: (data: any) => void,
    private onConnected: () => void,
    private onDisconnected: () => void,
    private onError: (error: any) => void
  ) {
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      throw new Error('Invalid WebSocket URL. Must start with ws:// or wss://');
    }
  }

  connect() {
    try {
      console.log('Connecting to WebSocket:', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startPingInterval();
        this.onConnected();
        
        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message) this.send(message);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') {
            this.lastPongTime = Date.now();
            return;
          }

          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          this.onError(error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.cleanup();
        this.onDisconnected();
        
        // Don't reconnect if it was a normal closure
        if (event.code !== 1000) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError(error);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.onError(error);
    }
  }

  private startPingInterval() {
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        
        // Check if we haven't received a pong in 45 seconds
        if (Date.now() - this.lastPongTime > 45000) {
          console.log('No pong received, reconnecting...');
          this.reconnect();
        }
      }
    }, 30000);
  }

  private cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private reconnect() {
    this.cleanup();

    if (this.reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      const delay = Math.min(WS_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1), 30000);
      
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${WS_MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('Max reconnection attempts reached');
      this.onError(new Error('Max reconnection attempts reached'));
    }
  }

  disconnect() {
    this.cleanup();

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(message: any) {
    if (!this.isConnected()) {
      // Queue message if not connected
      this.messageQueue.push(typeof message === 'string' ? message : JSON.stringify(message));
      return;
    }
    
    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws?.send(messageString);
    } catch (error) {
      console.error('Error sending message:', error);
      this.onError(error);
    }
  }
}