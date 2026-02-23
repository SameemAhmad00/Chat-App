
import type { MutableRefObject } from 'react';
// FIX: Use firebase v9 compat imports to resolve module errors.
import firebase from 'firebase/compat/app';
import { rtcConfig } from '../constants';
// FIX: Use User and Database types from firebase compat library.
import type { UserProfile, Contact, Call } from '../types';
import type { ActiveCall } from '../App';

type PeerConnectionRef = MutableRefObject<RTCPeerConnection | null>;
type User = firebase.User;
type Database = firebase.database.Database;

export const startOutgoingCall = async (
  user: User,
  profile: UserProfile,
  partner: Contact,
  type: 'video' | 'voice',
  db: Database,
  pcRef: PeerConnectionRef,
  setLocalStream: (stream: MediaStream | null) => void,
  setRemoteStream: (stream: MediaStream | null) => void,
  cleanup: () => void
): Promise<{ activeCall: ActiveCall | null; unsubscribers: (() => void)[] }> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      type === 'video' ? { video: true, audio: true } : { audio: true }
    );
    setLocalStream(stream);

    const callId = db.ref().push().key; // Generate a unique key for the call.
if (!callId) throw new Error("Failed to create call ID");

// Clean up any previous ICE candidates for this call ID.
db.ref(`iceCandidates/${callId}`).remove();
    if (!callId) throw new Error("Failed to create call ID");
    
    // Log the outgoing call for the current user ONLY.
    const callTimestamp = firebase.database.ServerValue.TIMESTAMP;
    const callerLogRef = db.ref(`callLogs/${user.uid}`).push();
    callerLogRef.set({
        partner: { uid: partner.uid, username: partner.username, photoURL: partner.photoURL || null },
        type,
        direction: 'outgoing',
        ts: callTimestamp,
    });

    const newActiveCall: ActiveCall = { id: callId, partner, type, role: 'caller', status: 'connecting' };

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
      fromPhotoURL: profile.photoURL || null,
      offer,
      ts: firebase.database.ServerValue.TIMESTAMP as any,
    };
    await db.ref(`calls/${partner.uid}/${callId}`).set(callPayload);
    
    const unsubscribers = setupCallListeners(callId, newActiveCall, db, pcRef);
    return { activeCall: newActiveCall, unsubscribers };

  } catch (error) {
    console.error("Error starting call:", error);
    cleanup();
    return { activeCall: null, unsubscribers: [] };
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
  cleanup: () => void
): Promise<{ activeCall: ActiveCall | null; unsubscribers: (() => void)[] }> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      incomingCall.type === 'video' ? { video: true, audio: true } : { audio: true }
    );
    setLocalStream(stream);

    // Clean up any previous ICE candidates for this call ID.
    db.ref(`iceCandidates/${incomingCall.id}`).remove();

    const newActiveCall: ActiveCall = { 
      id: incomingCall.id, 
      partner: { uid: incomingCall.from, username: incomingCall.fromUsername, photoURL: incomingCall.fromPhotoURL || null },
      type: incomingCall.type, 
      role: 'callee', 
      status: 'connecting' 
    };

    // Log the incoming call for the current user upon accepting.
    const callTimestamp = firebase.database.ServerValue.TIMESTAMP;
    db.ref(`callLogs/${user.uid}`).push().set({
        partner: { uid: incomingCall.from, username: incomingCall.fromUsername, photoURL: incomingCall.fromPhotoURL || null },
        type: incomingCall.type,
        direction: 'incoming',
        ts: callTimestamp,
    });

    pcRef.current = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));

    pcRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
    
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    await db.ref(`calls/${user.uid}/${incomingCall.id}/answer`).set(answer);

    const unsubscribers = setupCallListeners(incomingCall.id, newActiveCall, db, pcRef);
    return { activeCall: newActiveCall, unsubscribers };
    
  } catch (error) {
    console.error("Error accepting call:", error);
    cleanup();
    return { activeCall: null, unsubscribers: [] };
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

  const iceCandidateRef = db.ref(`iceCandidates/${callId}/${activeCall.role}`);
  pc.onicecandidate = event => {
    if (event.candidate) {
      iceCandidateRef.push(event.candidate.toJSON());
    }
  };
  
  const remoteRole = activeCall.role === 'caller' ? 'callee' : 'caller';
  const remoteIceCandidateRef = db.ref(`iceCandidates/${callId}/${remoteRole}`);
  const iceCallback = (snapshot: firebase.database.DataSnapshot) => {
    if (snapshot.exists()) {
      pc.addIceCandidate(new RTCIceCandidate(snapshot.val())).catch(e => console.error("Error adding ICE candidate:", e));
    }
  };
  remoteIceCandidateRef.on('child_added', iceCallback);
  unsubscribers.push(() => remoteIceCandidateRef.off('child_added', iceCallback));

  if (activeCall.role === 'caller') {
    const answerRef = db.ref(`calls/${activeCall.partner.uid}/${callId}/answer`);
    const answerCallback = async (snapshot: firebase.database.DataSnapshot) => {
      if (snapshot.exists()) {
        const answer = snapshot.val();
        if (pc.signalingState !== 'stable' && pc.remoteDescription === null) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.error("Failed to set remote description from answer:", e);
          }
        }
      }
    };
    answerRef.on('value', answerCallback);
    unsubscribers.push(() => answerRef.off('value', answerCallback));
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
    if (activeCall) {
    db.ref(`iceCandidates/${activeCall.id}`).remove();
  }
  pcRef.current?.close();
  pcRef.current = null;
  localStream?.getTracks().forEach(track => track.stop());
  
  if (activeCall && user) {
    const callRefPath = activeCall.role === 'caller' 
      ? `calls/${activeCall.partner.uid}/${activeCall.id}`
      : `calls/${user.uid}/${activeCall.id}`;
      
    db.ref(callRefPath).remove();
    db.ref(`iceCandidates/${activeCall.id}`).remove();
  }
};