/**
 * Capacitor TTS Wrapper
 *
 * Uses Capacitor Text-to-Speech plugin on mobile (Android/iOS)
 * Falls back to browser TTS on Web
 */

import { Capacitor } from '@capacitor/core';

// Check if running on Capacitor mobile
const isNative = Capacitor.isNativePlatform();

// Dynamically load TextToSpeech to avoid server-side errors
let TextToSpeech: any = null;
if (typeof window !== 'undefined') {
  try {
    TextToSpeech = require('@capacitor-community/text-to-speech').TextToSpeech;
  } catch (e) {
    console.log('[CapacitorTTS] Plugin not available, falling back to browser TTS');
  }
}

export interface TTSOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
}

// Calculate reading time for text
function calculateReadingTime(text: string): number {
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishCharCount = text.length - chineseCharCount;
  const timeForChinese = chineseCharCount * 333;
  const timeForEnglish = (englishCharCount / 5) * 500;
  return Math.max(timeForChinese + timeForEnglish, 1000);
}

// Wait for voices to load (Chrome loads them asynchronously)
async function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    return voices;
  }

  // Chrome: voices load asynchronously — wait for the voiceschanged event
  return new Promise((resolve) => {
    const onVoicesChanged = () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis?.getVoices() || []);
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    // Timeout after 3s to avoid hanging
    setTimeout(() => {
      window.speechSynthesis?.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis?.getVoices() || []);
    }, 3000);
  });
}

// Browser TTS implementation
class BrowserTTS {
  private static utteranceRef: SpeechSynthesisUtterance | null = null;
  private static currentResolve: (() => void) | null = null;
  private static currentReject: ((error: string) => void) | null = null;

  // Call this on user interaction (click, touch, etc.)
  // This primes the speech synthesis engine
  static onUserInteraction() {
    console.log('[BrowserTTS] User interaction detected');
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Prime with a silent utterance
      const testUtterance = new SpeechSynthesisUtterance('\u200B');
      testUtterance.lang = 'zh-CN';
      window.speechSynthesis.speak(testUtterance);
      console.log('[BrowserTTS] Speech synthesis primed');
    }
  }

  // Synchronous speak - MUST be called inside user interaction handler
  // Returns true if speech started, false otherwise
  static speakImmediate(options: TTSOptions): boolean {
    console.log('[BrowserTTS] speakImmediate called:', options.text.substring(0, 30));
    
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.log('[BrowserTTS] ERROR: speechSynthesis not available');
      return false;
    }

    const { text, lang = 'zh-CN', rate = 1.0, pitch = 1.0, volume = 1.0 } = options;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Get voices synchronously
    const voices = window.speechSynthesis.getVoices();
    const voiceMatch = voices.find(v => v.lang.includes(lang.split('-')[0]));
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    if (voiceMatch) {
      utterance.voice = voiceMatch;
      console.log('[BrowserTTS] Using voice:', voiceMatch.name);
    }
    
    utterance.onstart = () => {
      console.log('[BrowserTTS] onstart: speech started');
    };
    
    utterance.onend = () => {
      console.log('[BrowserTTS] onend: speech ended');
      BrowserTTS.utteranceRef = null;
      BrowserTTS.currentResolve?.();
      BrowserTTS.currentResolve = null;
      BrowserTTS.currentReject = null;
    };
    
    utterance.onerror = (event) => {
      console.log('[BrowserTTS] onerror:', event.error);
      BrowserTTS.utteranceRef = null;
      BrowserTTS.currentReject?.(event.error);
      BrowserTTS.currentResolve = null;
      BrowserTTS.currentReject = null;
    };
    
    BrowserTTS.utteranceRef = utterance;
    
    try {
      window.speechSynthesis.speak(utterance);
      console.log('[BrowserTTS] speechSynthesis.speak() called successfully');
      return true;
    } catch (err) {
      console.log('[BrowserTTS] speechSynthesis.speak() failed:', err);
      BrowserTTS.currentReject?.(err instanceof Error ? err.message : 'speak failed');
      BrowserTTS.currentResolve = null;
      BrowserTTS.currentReject = null;
      return false;
    }
  }

  // Async speak - can be called anywhere
  static speak(options: TTSOptions): Promise<void> {
    console.log('[BrowserTTS] speak() called:', options.text.substring(0, 30));

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.log('[BrowserTTS] ERROR: speechSynthesis not available');
      return Promise.reject(new Error('Browser does not support speech synthesis'));
    }

    return new Promise((resolve, reject) => {
      BrowserTTS.currentResolve = resolve;
      BrowserTTS.currentReject = reject;
      
      // Try to speak immediately
      BrowserTTS.speakImmediate(options);
    });
  }

  static stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    BrowserTTS.utteranceRef = null;
  }

  static getSupportedVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      return window.speechSynthesis.getVoices();
    }
    return [];
  }
}

// Capacitor TTS wrapper
export class CapacitorTTS {
  private static timerRef: number | null = null;

  static async speak(options: TTSOptions): Promise<void> {
    const {
      text,
      lang = 'zh-CN',
      rate = 1.0,
      pitch = 1.0,
      volume = 1.0,
    } = options;

    if (typeof window === 'undefined') {
      throw new Error('Not in browser environment');
    }

    if (isNative && TextToSpeech) {
      console.log('[CapacitorTTS] Using native TTS');
      try {
        await TextToSpeech.speak({
          text,
          lang,
          rate,
          pitch,
          volume,
        });
        
        console.log('[CapacitorTTS] Plugin completed');
        const readingMs = calculateReadingTime(text);
        console.log(`[CapacitorTTS] Waiting ${readingMs}ms for audio to finish`);
        
        return new Promise<void>((resolve) => {
          CapacitorTTS.timerRef = window.setTimeout(() => {
            CapacitorTTS.timerRef = null;
            resolve();
          }, readingMs);
        });
      } catch (err: any) {
        console.log('[CapacitorTTS] Plugin error:', err);
        // Fall back to browser TTS
        return BrowserTTS.speak(options);
      }
    } else {
      console.log('[CapacitorTTS] Using browser TTS');
      return BrowserTTS.speak(options);
    }
  }

  // Synchronous speak - MUST be called inside user interaction handler
  // Returns true if speech started, false otherwise
  static speakImmediate(options: TTSOptions): boolean {
    console.log('[CapacitorTTS] speakImmediate called');
    
    if (typeof window === 'undefined') {
      return false;
    }

    if (isNative && TextToSpeech) {
      // Native doesn't need synchronous call
      return false;
    } else {
      return BrowserTTS.speakImmediate(options);
    }
  }

  // Call this on user interaction to prime TTS
  static onUserInteraction() {
    BrowserTTS.onUserInteraction();
  }

  static stop() {
    if (typeof window !== 'undefined') {
      if (isNative && TextToSpeech) {
        TextToSpeech.stop();
      } else {
        BrowserTTS.stop();
      }
      if (CapacitorTTS.timerRef) {
        clearTimeout(CapacitorTTS.timerRef);
        CapacitorTTS.timerRef = null;
      }
    }
  }

  static getSupportedVoices() {
    if (typeof window === 'undefined') return [];
    
    if (isNative && TextToSpeech) {
      return TextToSpeech.getSupportedLanguages();
    }
    return BrowserTTS.getSupportedVoices();
  }

  static isAvailable() {
    if (typeof window === 'undefined') return false;
    return isNative ? !!TextToSpeech : 'speechSynthesis' in window;
  }

  static calculateReadingTime(text: string): number {
    return calculateReadingTime(text);
  }
}

