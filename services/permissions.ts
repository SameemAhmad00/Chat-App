
export const checkMediaPermissions = async (type: 'video' | 'voice'): Promise<boolean> => {
  try {
    const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Permission denied:', error);
    alert(`Please enable ${type === 'video' ? 'camera and microphone' : 'microphone'} access to make calls.`);
    return false;
  }
};
