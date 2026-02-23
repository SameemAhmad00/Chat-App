
import React, { useRef, useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { EndCallIcon, MicrophoneIcon, MicrophoneOffIcon, VideoIcon, VideoOffIcon, SpeakerphoneIcon, SpeakerphoneOffIcon, SwitchCameraIcon } from './Icons';
import type { ActiveCall } from '../App';
import Avatar from './Avatar';
import type { UserProfile } from '../types';

interface CallScreenProps {
  profile: UserProfile;
  activeCall: ActiveCall;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: (duration: number) => void;
  peerConnectionRef: React.RefObject<RTCPeerConnection | null>;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CallScreen: React.FC<CallScreenProps> = ({ profile, activeCall, localStream, remoteStream, onEndCall, peerConnectionRef }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSpeakerphoneOn, setIsSpeakerphoneOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const draggableNodeRef = React.useRef(null);

  useEffect(() => {
    if (activeCall.status === 'connected') {
      const timer = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeCall.status]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    localStream?.getAudioTracks().forEach(track => {
      track.enabled = !newMutedState;
    });
    setIsMuted(newMutedState);
    setStatusMessage(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
  };

  const handleToggleCamera = () => {
    const newCameraState = !isCameraOff;
    localStream?.getVideoTracks().forEach(track => {
      track.enabled = !newCameraState;
    });
    setIsCameraOff(newCameraState);
    setStatusMessage(newCameraState ? 'Camera off' : 'Camera on');
  };

  const handleToggleSpeakerphone = () => {
    const newSpeakerphoneState = !isSpeakerphoneOn;
    const videoElement = remoteVideoRef.current as HTMLVideoElement | HTMLAudioElement;
    if (videoElement) {
      (videoElement as any).speaker = newSpeakerphoneState;
    }
    setIsSpeakerphoneOn(newSpeakerphoneState);
    setStatusMessage(newSpeakerphoneState ? 'Speakerphone on' : 'Speakerphone off');
  };

  const handleSwitchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: newFacingMode },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
          localStream?.getVideoTracks().forEach(track => track.stop());
          localStream?.removeTrack(localStream.getVideoTracks()[0]);
          localStream?.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
          setFacingMode(newFacingMode);
          setStatusMessage(`Switched to ${newFacingMode} camera`);
        } else {
          throw new Error('Video sender not found');
        }
      } else {
        throw new Error('Peer connection not available');
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      setStatusMessage('Failed to switch camera');
    }
  };

  const isVideoCall = activeCall.type === 'video';

    return (
    <div className="relative h-full w-full bg-black flex flex-col">
      <div className="sr-only" aria-live="polite">{statusMessage}</div>

      {/* Remote Video Stream */}
      {isVideoCall && remoteStream && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute top-0 left-0 h-full w-full object-cover" />
      )}

      {/* Voice Call UI */}
      {!isVideoCall && (
        <div className="flex-1 flex flex-col items-center justify-center text-white space-y-4">
          <Avatar photoURL={activeCall.partner.photoURL} username={activeCall.partner.username} className="w-40 h-40 text-7xl" />
          <div className="text-center">
            <p className="text-3xl font-semibold">@{activeCall.partner.username}</p>
            <p className="text-gray-300 mt-2 text-lg">{formatDuration(duration)}</p>
          </div>
        </div>
      )}

      {/* Call Info Overlay (Video Call Only) */}
      {isVideoCall && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 z-10">
          <div className="text-white text-center">
            <p className="text-xl font-bold">@{activeCall.partner.username}</p>
            <p className="text-sm opacity-80">{formatDuration(duration)}</p>
          </div>
        </div>
      )}

      {/* Draggable Local Video Preview (Video Call Only) */}
      {isVideoCall && (
        <Draggable nodeRef={draggableNodeRef} bounds="parent">
          <div ref={draggableNodeRef} className="absolute top-24 right-4 w-28 h-40 bg-black rounded-xl border-2 border-white/20 shadow-lg overflow-hidden flex items-center justify-center cursor-move">
            {isCameraOff ? (
              <Avatar photoURL={profile.photoURL} username={profile.username} className="w-full h-full text-4xl" />
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </Draggable>
      )}

      {/* Call Controls */}
      <div className="mt-auto p-4 z-10">
        <div className="bg-black/30 backdrop-blur-md rounded-full max-w-sm mx-auto p-3">
          <div className="flex justify-center items-center space-x-4">
            <button onClick={handleToggleMute} className={`w-14 h-14 ${isMuted ? 'bg-white text-black' : 'bg-white/20 text-white'} rounded-full flex items-center justify-center transition-colors`} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <MicrophoneOffIcon className="w-7 h-7" /> : <MicrophoneIcon className="w-7 h-7" />}
            </button>

            {isVideoCall && (
              <button onClick={handleToggleCamera} className={`w-14 h-14 ${isCameraOff ? 'bg-white text-black' : 'bg-white/20 text-white'} rounded-full flex items-center justify-center transition-colors`} aria-label={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}>
                {isCameraOff ? <VideoOffIcon className="w-7 h-7" /> : <VideoIcon className="w-7 h-7" />}
              </button>
            )}

            {!isVideoCall && (
              <button onClick={handleToggleSpeakerphone} className={`w-14 h-14 ${isSpeakerphoneOn ? 'bg-white text-black' : 'bg-white/20 text-white'} rounded-full flex items-center justify-center transition-colors`} aria-label={isSpeakerphoneOn ? 'Turn Speakerphone Off' : 'Turn Speakerphone On'}>
                {isSpeakerphoneOn ? <SpeakerphoneOffIcon className="w-7 h-7" /> : <SpeakerphoneIcon className="w-7 h-7" />}
              </button>
            )}

            {isVideoCall && (
              <button onClick={handleSwitchCamera} className="w-14 h-14 bg-white/20 text-white rounded-full flex items-center justify-center transition-colors" aria-label="Switch Camera">
                <SwitchCameraIcon className="w-7 h-7" />
              </button>
            )}

            <button onClick={() => onEndCall(duration)} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center transform transition hover:scale-110 shadow-lg" aria-label="End Call">
              <EndCallIcon className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </div>
      <audio ref={remoteVideoRef as any} autoPlay />
    </div>
  );
};

export default CallScreen;
