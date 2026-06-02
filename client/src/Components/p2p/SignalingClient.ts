export type SignalMessage = {
  type: 'signal';
  payload: any; // RTCSessionDescriptionInit or RTCIceCandidateInit
};

export type JoinMessage = {
  type: 'join';
  roomId: string;
};

export type RoleMessage = {
  type: 'role';
  payload: { isInitiator: boolean };
};

export type IncomingMessage = JoinMessage | SignalMessage | RoleMessage;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private onSignalCallback: ((payload: any) => void) | null = null;
  private onRoleCallback: ((isInitiator: boolean) => void) | null = null;
  private onOpenCallback: (() => void) | null = null;

  connect(serverUrl: string, roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(serverUrl);
      this.ws.onopen = () => {
        console.log('Signaling WebSocket open');
        // Send join message
        this.ws!.send(JSON.stringify({ type: 'join', roomId }));
        this.onOpenCallback?.();
        resolve();
      };
      this.ws.onerror = (err) => {
        console.error('Signaling error', err);
        reject(err);
      };
      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
    });
  }

  private handleMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data) as IncomingMessage;
    if (msg.type === 'signal') {
      this.onSignalCallback?.(msg.payload);
    } else if (msg.type === 'role') {
      this.onRoleCallback?.(msg.payload.isInitiator);
    }
  }

  sendSignal(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'signal', payload }));
    }
  }

  onSignal(cb: (payload: any) => void) {
    this.onSignalCallback = cb;
  }

  onRole(cb: (isInitiator: boolean) => void) {
    this.onRoleCallback = cb;
  }

  onOpen(cb: () => void) {
    this.onOpenCallback = cb;
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}