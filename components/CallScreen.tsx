
import React, { useRef, useEffect, useState } from 'react';
import { EndCallIcon, MicrophoneIcon, MicrophoneOffIcon, VideoIcon, VideoOffIcon } from './Icons';
import type { ActiveCall } from '../App';
import Avatar from './Avatar';
import type { UserProfile } from '../types';

interface CallScreenProps {
  profile: UserProfile;
  activeCall: ActiveCall;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: (duration: number) => void;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CallScreen: React.FC<CallScreenProps> = ({ profile, activeCall, localStream, remoteStream, onEndCall }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

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

  const isVideoCall = activeCall.type === 'video';

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center">
      <div className="sr-only" aria-live="polite">{statusMessage}</div>
      {/* Remote Video/Audio */}
      {isVideoCall ? (
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
      ) : (
        <audio ref={remoteVideoRef as any} autoPlay />
      )}
      
      {/* UI for Voice Call */}
      {!isVideoCall && (
        <div className="flex flex-col items-center text-white">
          <Avatar photoURL={activeCall.partner.photoURL} username={activeCall.partner.username} className="w-40 h-40 text-7xl" />
          <p className="mt-6 text-3xl font-semibold">@{activeCall.partner.username}</p>
          <p className="text-gray-300 mt-2 text-lg">{formatDuration(duration)}</p>
        </div>
      )}

      {/* Local Video Preview */}
      {isVideoCall && (
        <div className="absolute top-4 right-4 w-28 h-40 bg-black rounded-lg border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
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
      )}

      {/* Call Overlay and Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 flex flex-col items-center">
        {isVideoCall && (
            <div className="text-white text-center mb-6">
                <p className="text-xl font-bold">@{activeCall.partner.username}</p>
                <p className="text-sm opacity-80">{formatDuration(duration)}</p>
            </div>
        )}
        <div className="flex justify-center items-center space-x-6">
          {isVideoCall && (
            <>
              <button
                onClick={handleToggleMute}
                className={`w-14 h-14 ${isMuted ? 'bg-white' : 'bg-white/30'} rounded-full flex items-center justify-center transition-colors`}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicrophoneOffIcon className="w-7 h-7 text-black" /> : <MicrophoneIcon className="w-7 h-7 text-white" />}
              </button>
              <button
                onClick={handleToggleCamera}
                className={`w-14 h-14 ${isCameraOff ? 'bg-white' : 'bg-white/30'} rounded-full flex items-center justify-center transition-colors`}
                aria-label={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? <VideoOffIcon className="w-7 h-7 text-black" /> : <VideoIcon className="w-7 h-7 text-white" />}
              </button>
            </>
          )}

          <button
            onClick={() => onEndCall(duration)}
            className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center transform transition hover:scale-110 shadow-lg"
            aria-label="End Call"
          >
            <EndCallIcon className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
