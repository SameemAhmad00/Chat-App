
import type { MutableRefObject } from 'react';
import { ref, onValue, off, push, set, serverTimestamp, remove, onChildAdded } from 'firebase/database';
import { rtcConfig } from '../constants';
import type { User } from 'firebase/auth';
import type { Database } from 'firebase/database';
import type { UserProfile, Contact, Call } from '../types';
import type { ActiveCall } from '../App';

type PeerConnectionRef = MutableRefObject<RTCPeerConnection | null>;

export const startOutgoingCall = async (
  user: User,
  profile: UserProfile,
  partner: Contact,
  type: 'video' | 'voice',
  db: Database,
  pcRef: PeerConnectionRef,
  setLocalStream: (stream: MediaStream | null) => void,
  setRemoteStream: (stream: MediaStream | null) => void,
  setActiveCall: (call: ActiveCall | null) => void,
  cleanup: () => void
): Promise<(() => void)[]> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      type === 'video' ? { video: true, audio: true } : { audio: true }
    );
    setLocalStream(stream);

    const callId = push(ref(db, `calls/${partner.uid}`)).key;
    if (!callId) throw new Error("Failed to create call ID");
    
    // Log call for both users
    const callTimestamp = serverTimestamp();
    const callerLogRef = push(ref(db, `callLogs/${user.uid}`));
    set(callerLogRef, {
        partner: { uid: partner.uid, username: partner.username, photoURL: partner.photoURL || null },
        type,
        direction: 'outgoing',
        ts: callTimestamp,
    });
    const calleeLogRef = push(ref(db, `callLogs/${partner.uid}`));
    set(calleeLogRef, {
        partner: { uid: user.uid, username: profile.username, photoURL: profile.photoURL || null },
        type,
        direction: 'incoming',
        ts: callTimestamp,
    });


    const newActiveCall: ActiveCall = { id: callId, partner, type, role: 'caller', status: 'connecting' };
    setActiveCall(newActiveCall);

    pcRef.current = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));

    pcRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    const callPayload: Omit<Call, 'id'> = {
      type,
      from: user.uid,
      fromUsername: profile.username,
      fromPhotoURL: profile.photoURL,
      offer,
      ts: serverTimestamp() as any,
    };
    await set(ref(db, `calls/${partner.uid}/${callId}`), callPayload);
    
    return setupCallListeners(callId, newActiveCall, db, pcRef);

  } catch (error) {
    console.error("Error starting call:", error);
    cleanup();
    return [];
  }
};

export const acceptIncomingCall = async (
  user: User,
  profile: UserProfile,
  incomingCall: Call,
  db: Database,
  pcRef: PeerConnectionRef,
  setLocalStream: (stream: MediaStream | null) => void,
  setRemoteStream: (stream: MediaStream | null) => void,
  setActiveCall: (call: ActiveCall | null) => void,
  cleanup: () => void
): Promise<(() => void)[]> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      incomingCall.type === 'video' ? { video: true, audio: true } : { audio: true }
    );
    setLocalStream(stream);

    const newActiveCall: ActiveCall = { 
      id: incomingCall.id, 
      partner: { uid: incomingCall.from, username: incomingCall.fromUsername, photoURL: incomingCall.fromPhotoURL },
      type: incomingCall.type, 
      role: 'callee', 
      status: 'connecting' 
    };
    setActiveCall(newActiveCall);

    pcRef.current = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));

    pcRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    await set(ref(db, `calls/${user.uid}/${incomingCall.id}/answer`), answer);

    return setupCallListeners(incomingCall.id, newActiveCall, db, pcRef);
    
  } catch (error) {
    console.error("Error accepting call:", error);
    cleanup();
    return [];
  }
};

export const setupCallListeners = (
  callId: string,
  activeCall: ActiveCall,
  db: Database,
  pcRef: PeerConnectionRef
): (() => void)[] => {
  const pc = pcRef.current;
  if (!pc) return [];

  const unsubscribers: (() => void)[] = [];

  const iceCandidateRef = ref(db, `iceCandidates/${callId}/${activeCall.role}`);
  pc.onicecandidate = event => {
    if (event.candidate) {
      push(iceCandidateRef, event.candidate.toJSON());
    }
  };
  
  const remoteRole = activeCall.role === 'caller' ? 'callee' : 'caller';
  const remoteIceCandidateRef = ref(db, `iceCandidates/${callId}/${remoteRole}`);
  const iceUnsubscribe = onChildAdded(remoteIceCandidateRef, (snapshot) => {
    if (snapshot.exists()) {
      pc.addIceCandidate(new RTCIceCandidate(snapshot.val())).catch(e => console.error("Error adding ICE candidate:", e));
    }
  });
  unsubscribers.push(iceUnsubscribe);

  if (activeCall.role === 'caller') {
    const answerRef = ref(db, `calls/${activeCall.partner.uid}/${callId}/answer`);
    const answerUnsubscribe = onValue(answerRef, async (snapshot) => {
      if (snapshot.exists()) {
        const answer = snapshot.val();
        if (pc.signalingState !== 'stable' && pc.remoteDescription === null) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      }
    });
    unsubscribers.push(answerUnsubscribe);
  }

  return unsubscribers;
};

export const endCall = (
  pcRef: PeerConnectionRef,
  localStream: MediaStream | null,
  activeCall: ActiveCall | null,
  user: User | null,
  db: Database,
) => {
  pcRef.current?.close();
  pcRef.current = null;
  localStream?.getTracks().forEach(track => track.stop());
  
  if (activeCall && user) {
    const callRefPath = activeCall.role === 'caller' 
      ? `calls/${activeCall.partner.uid}/${activeCall.id}`
      // Callee is listening on their own UID for calls
      : `calls/${user.uid}/${activeCall.id}`;
      
    remove(ref(db, callRefPath));
    remove(ref(db, `iceCandidates/${activeCall.id}`));
  }
};