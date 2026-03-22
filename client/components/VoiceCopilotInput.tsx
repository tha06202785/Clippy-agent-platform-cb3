import { useState, useRef } from 'react';
import { Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VoiceCopilotInputProps {
  onTranscriptionComplete: (text: string, copilotResponse?: string) => void;
  disabled?: boolean;
  orgId?: string;
  agentUserId?: string;
}

export function VoiceCopilotInput({
  onTranscriptionComplete,
  disabled = false,
  orgId = 'test_org',
  agentUserId = 'test_user',
}: VoiceCopilotInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const getStatusText = () => {
    if (error) return 'Error occurred';
    if (isTranscribing) return 'Transcribing...';
    if (isRecording) return 'Listening...';
    if (transcript) return 'Done!';
    return 'Tap to speak';
  };

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  const handleMicrophonePress = async () => {
    if (isRecording) {
      // Stop recording
      await handleStopRecording();
    } else {
      // Start recording
      await handleStartRecording();
    }
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      setTranscript(null);
      setIsRecording(true);
      audioChunksRef.current = [];

      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onerror = (event: Event) => {
        const error = event as any;
        console.error('MediaRecorder error:', error.error);
        setError(`Recording error: ${error.error}`);
        stopMediaTracks();
        setIsRecording(false);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Microphone access error:', err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Unable to access microphone. Please check permissions.';
      setError(errorMsg);
      stopMediaTracks();
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    try {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all media tracks immediately
      stopMediaTracks();

      // Wait briefly for final data to be available
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, {
        type: 'audio/webm',
      });

      if (audioBlob.size === 0) {
        setError('No audio recorded. Please try again.');
        return;
      }

      // Send to Supabase edge function for transcription
      await sendAudioForTranscription(audioBlob);
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    }
  };

  const sendAudioForTranscription = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      setError(null);

      // Create FormData with audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      // Call Supabase edge function to transcribe audio
      const { data, error: invokeError } = await supabase.functions.invoke(
        'whisper-transcribe',
        {
          body: formData,
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Transcription failed');
      }

      if (!data || !data.text) {
        throw new Error('No transcription received');
      }

      const transcribedText = data.text;

      // Display transcribed text briefly
      setTranscript(transcribedText);

      // Send transcribed text to copilot-assistant edge function
      await sendToCopilotAssistant(transcribedText);

      // Clear transcript display after 2 seconds
      setTimeout(() => {
        setTranscript(null);
      }, 2000);
    } catch (err) {
      console.error('Transcription error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Transcription failed. Please try again.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const sendToCopilotAssistant = async (transcribedText: string) => {
    try {
      // Use raw fetch to bypass Supabase JWT verification
      const response = await fetch(
        'https://mqydieqeybgxtjqogrwh.supabase.co/functions/v1/copilot-assistant',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            org_id: orgId,
            agent_user_id: agentUserId,
            message: transcribedText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Copilot API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Copilot Reply:', data.content);

      // Call parent callback with both transcribed text and copilot response
      onTranscriptionComplete(transcribedText, data.content);
    } catch (error) {
      console.error('Copilot handoff error:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to get copilot response'
      );
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status Text */}
      <div className="h-6 text-center">
        {error && (
          <p className="text-xs font-medium text-red-400">⚠️ {error}</p>
        )}
        {!error && transcript && (
          <p className="text-xs font-medium text-green-400">✓ {transcript}</p>
        )}
        {!error && !transcript && (
          <p
            className={`text-xs font-medium transition-colors ${
              isTranscribing
                ? 'text-slate-400 animate-pulse'
                : isRecording
                  ? 'text-red-400 animate-pulse'
                  : 'text-slate-400'
            }`}
          >
            {getStatusText()}
          </p>
        )}
      </div>

      {/* Microphone Button */}
      <button
        onClick={handleMicrophonePress}
        onMouseDown={(e) => {
          if (!isRecording) e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onTouchStart={(e) => {
          if (!isRecording) e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        disabled={disabled || isTranscribing}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl font-bold text-2xl ${
          isRecording
            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white animate-pulse'
            : isTranscribing
              ? 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
              : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 hover:scale-110 active:scale-95'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
      >
        <Mic className="w-10 h-10" />
      </button>

      {/* Visual Feedback - Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-3 w-3 animate-ping rounded-full bg-red-500" />
          <span className="text-xs font-semibold text-red-400">
            Release to send
          </span>
        </div>
      )}
    </div>
  );
}
