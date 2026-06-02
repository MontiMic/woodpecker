import { SignalingClient } from './SignalingClient';

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signaling: SignalingClient;
  private onDataChannelMessage: ((msg: string) => void) | null = null;

  constructor(signaling: SignalingClient) {
    this.signaling = signaling;
  }

  async init(isInitiator: boolean): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Log ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.pc?.iceConnectionState);
      if (this.pc?.iceConnectionState === 'connected') {
        console.log('WebRTC connection established!');
      }
    };

    // Log ICE gathering state
    this.pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.pc?.iceGatheringState);
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        this.signaling.sendSignal({ candidate: event.candidate });
      } else {
        console.log('ICE candidate gathering complete');
      }
    };

    // Listen for remote SDP/ICE via signaling
    this.signaling.onSignal(async (payload) => {
      console.log('Received signal:', Object.keys(payload));
      if (payload.sdp) {
        console.log('Setting remote description', payload.sdp.type);
        await this.pc!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        if (payload.sdp.type === 'offer') {
          console.log('Creating answer');
          const answer = await this.pc!.createAnswer();
          await this.pc!.setLocalDescription(answer);
          console.log('Sending answer');
          this.signaling.sendSignal({ sdp: answer });
        }
      } else if (payload.candidate) {
        console.log('Adding ICE candidate');
        await this.pc!.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    if (isInitiator) {
      console.log('Creating data channel (initiator)');
      this.dataChannel = this.pc.createDataChannel('board-sync');
      this.setupDataChannel();
      console.log('Creating offer');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('Sending offer');
      this.signaling.sendSignal({ sdp: offer });
    } else {
      console.log('Waiting for data channel (responder)');
      this.pc.ondatachannel = (event) => {
        console.log('Data channel received from remote');
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;
    this.dataChannel.onopen = () => {
      console.log('✅ Data channel opened');
      // Send a hello message to confirm
      this.sendMessage(JSON.stringify({ type: 'test', data: 'hello from ' + (this.dataChannel?.label || 'unknown') }));
    };
    this.dataChannel.onmessage = (event) => {
      console.log('📨 Received via data channel:', event.data);
      this.onDataChannelMessage?.(event.data);
    };
    this.dataChannel.onerror = (err) => console.error('Data channel error', err);
    this.dataChannel.onclose = () => console.log('Data channel closed');
  }

  sendMessage(message: string) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(message);
      console.log('📤 Sent via data channel:', message);
    } else {
      console.warn('Data channel not ready, state:', this.dataChannel?.readyState);
    }
  }

  onMessage(cb: (msg: string) => void) {
    this.onDataChannelMessage = cb;
  }

  close() {
    this.dataChannel?.close();
    this.pc?.close();
  }
}