/**
 * Mobile Playback Hook
 *
 * Handles scene playback with actions (speech, spotlight, etc.)
 * Uses AudioPlayer to play pre-generated audio files
 * Falls back to browser TTS when no pre-generated audio is available
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { CapacitorTTS } from './use-capacitor-tts';
import { AudioPlayer } from '@/lib/utils/audio-player';
import type { Action, SpeechAction, SpotlightAction, LaserAction } from '@/lib/types/action';

export type PlaybackState = 'idle' | 'playing' | 'paused';

export interface UseMobilePlaybackProps {
  actions: Action[];
  onSpeechStart?: (text: string) => void;
  onSpeechEnd?: () => void;
  onSpotlight?: (action: SpotlightAction) => void;
  onLaserPointer?: (action: LaserAction) => void;
  onWhiteboard?: (action: any) => void;
  onNextAction?: () => void;
  onEnd?: () => void;
  disableTTS?: boolean;
}

export function useMobilePlayback({
  actions,
  onSpeechStart,
  onSpeechEnd,
  onSpotlight,
  onLaserPointer,
  onWhiteboard,
  onNextAction,
  onEnd,
  disableTTS = false,
}: UseMobilePlaybackProps) {
  const [state, setState] = useState<PlaybackState>('idle');
  const [currentActionIndex, setCurrentActionIndex] = useState(-1);
  const [lectureText, setLectureText] = useState<string | null>(null);
  const [activeSpotlight, setActiveSpotlight] = useState<SpotlightAction | null>(null);
  const [activeLaser, setActiveLaser] = useState<LaserAction | null>(null);
  const [whiteboardStack, setWhiteboardStack] = useState<any[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isPlayingRef = useRef(false);
  const isMountedRef = useRef(true);
  const actionIndexRef = useRef(-1);
  const shouldStopRef = useRef(false);
  const isProcessingRef = useRef(false);
  
  // Audio player for pre-generated audio files
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // Initialize audio player
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    return () => {
      audioPlayerRef.current?.destroy();
    };
  }, []);

  // Sync currentActionIndex with ref
  useEffect(() => {
    actionIndexRef.current = currentActionIndex;
  }, [currentActionIndex]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      shouldStopRef.current = true;
      audioPlayerRef.current?.stop();
      CapacitorTTS.stop();
    };
  }, []);

  // Advance to next action
  const advanceToNext = useCallback(() => {
    if (shouldStopRef.current) return;
    
    const nextIndex = actionIndexRef.current + 1;
    
    if (nextIndex >= actions.length) {
      // All actions completed
      setState('idle');
      setCurrentActionIndex(-1);
      onEnd?.();
      return;
    }
    
    setCurrentActionIndex(nextIndex);
    onNextAction?.();
  }, [actions.length, onEnd, onNextAction]);

  // Process current action
  const processAction = useCallback(async (index: number) => {
    if (!isMountedRef.current) return;
    if (index < 0 || index >= actions.length) {
      return;
    }

    // Set processing flag
    isProcessingRef.current = true;
    
    try {
      const action = actions[index];

    switch (action.type) {
      case 'speech': {
        const speechAction = action as SpeechAction;
        
        console.log('[MobilePlayback] Processing speech action:', speechAction.text.substring(0, 30));
        
        setLectureText(speechAction.text);
        setIsSpeaking(true);
        onSpeechStart?.(speechAction.text);

        // Stop any previous audio/tts before starting new one
        audioPlayerRef.current?.stop();
        CapacitorTTS.stop();

        // Try to play pre-generated audio first
        let audioStarted = false;
        try {
          audioStarted = await audioPlayerRef.current?.play(
            speechAction.audioId || '', 
            speechAction.audioUrl
          ) ?? false;
        } catch (error: any) {
          // Handle expected interrupt errors gracefully
          if (error?.message?.includes('interrupted')) {
            console.log('[MobilePlayback] Audio interrupted (expected)');
          } else {
            console.log('[MobilePlayback] Audio play error:', error);
          }
          // Fall through to TTS on error
        }

        if (audioStarted) {
          // Audio is playing, wait for it to finish
          console.log('[MobilePlayback] Playing pre-generated audio');
          audioPlayerRef.current?.onEnded(() => {
            if (isMountedRef.current && !shouldStopRef.current) {
              console.log('[MobilePlayback] Audio finished');
              setLectureText(null);
              setIsSpeaking(false);
              onSpeechEnd?.();
              advanceToNext();
            }
          });
        } else if (!disableTTS) {
          // No pre-generated audio, fall back to TTS
          console.log('[MobilePlayback] No pre-generated audio, using TTS');
          
          try {
            await CapacitorTTS.speak({
              text: speechAction.text,
              lang: 'zh-CN',
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
            });
            
            if (isMountedRef.current && !shouldStopRef.current) {
              console.log('[MobilePlayback] TTS finished');
              setLectureText(null);
              setIsSpeaking(false);
              onSpeechEnd?.();
              advanceToNext();
            }
          } catch (error) {
            console.log('[MobilePlayback] TTS error:', error);
            // Even if TTS fails, advance to next
            if (isMountedRef.current && !shouldStopRef.current) {
              setLectureText(null);
              setIsSpeaking(false);
              onSpeechEnd?.();
              advanceToNext();
            }
          }
        } else {
          // TTS is disabled and no pre-generated audio, skip directly to next action
          console.log('[MobilePlayback] TTS disabled and no pre-generated audio, skipping speech');
          setTimeout(() => {
            if (isMountedRef.current && !shouldStopRef.current) {
              setLectureText(null);
              setIsSpeaking(false);
              onSpeechEnd?.();
              advanceToNext();
            }
          }, 100);
        }
        break;
      }

      case 'spotlight': {
        const spotlightAction = action as SpotlightAction;
        setActiveSpotlight(spotlightAction);
        onSpotlight?.(spotlightAction);
        advanceToNext();
        break;
      }

      case 'laser': {
        const laserAction = action as LaserAction;
        setActiveLaser(laserAction);
        onLaserPointer?.(laserAction);
        advanceToNext();
        break;
      }

      // Handle whiteboard actions - they all start with 'wb_'
      default: {
        if (action.type.startsWith('wb_')) {
          setWhiteboardStack((prev) => [...prev, action]);
          onWhiteboard?.(action);
        }
        advanceToNext();
        break;
      }
    }
    } finally {
      // Reset processing flag
      isProcessingRef.current = false;
    }
  }, [actions, onSpeechStart, onSpotlight, onLaserPointer, onWhiteboard, advanceToNext]);

  // Start playing from beginning or current position
  const play = useCallback(() => {
    // Prime TTS engine on user interaction
    CapacitorTTS.onUserInteraction();
    
    if (state === 'paused') {
      setState('playing');
    } else if (state === 'idle') {
      shouldStopRef.current = false;
      actionIndexRef.current = -1;
      setCurrentActionIndex(-1);
      setActiveSpotlight(null);
      setActiveLaser(null);
      setWhiteboardStack([]);
      setState('playing');
      advanceToNext();
    }
  }, [state, advanceToNext]);

  // Pause playback
  const pause = useCallback(() => {
    shouldStopRef.current = true;
    
    // Only pause if not currently processing (avoid race condition)
    if (!isProcessingRef.current) {
      audioPlayerRef.current?.pause();
      CapacitorTTS.stop();
      setState('paused');
    }
  }, []);

  // Resume playback
  const resume = useCallback(() => {
    shouldStopRef.current = false;
    setState('playing');
    audioPlayerRef.current?.resume();
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    shouldStopRef.current = true;
    audioPlayerRef.current?.stop();
    CapacitorTTS.stop();
    setState('idle');
    setCurrentActionIndex(-1);
    setLectureText(null);
    setIsSpeaking(false);
    setActiveSpotlight(null);
    setActiveLaser(null);
    setWhiteboardStack([]);
  }, []);

  // Go to specific action
  const goToAction = useCallback((index: number) => {
    if (index >= 0 && index < actions.length) {
      stop();
      actionIndexRef.current = index - 1;
      setTimeout(() => {
        play();
      }, 100);
    }
  }, [actions.length, stop, play]);

  // Auto-process action when currentActionIndex changes
  useEffect(() => {
    if (state === 'playing' && currentActionIndex >= 0) {
      actionIndexRef.current = currentActionIndex;
      processAction(currentActionIndex);
    }
  }, [currentActionIndex, state, processAction]);

  return {
    state,
    currentActionIndex,
    lectureText,
    isSpeaking,
    activeSpotlight,
    activeLaser,
    whiteboardStack,
    play,
    pause,
    resume,
    stop,
    goToAction,
    hasNext: currentActionIndex < actions.length - 1,
    hasPrevious: currentActionIndex > 0,
    prev: () => goToAction(actionIndexRef.current - 1),
    next: () => goToAction(actionIndexRef.current + 1),
  };
}