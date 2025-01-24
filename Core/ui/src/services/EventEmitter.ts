export class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return this;
  }

  off(event: string, callback: Function) {
    if (!this.events[event]) return this;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
    return this;
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return false;
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }

  listeners(event: string): Function[] {
    return this.events[event] || [];
  }
}