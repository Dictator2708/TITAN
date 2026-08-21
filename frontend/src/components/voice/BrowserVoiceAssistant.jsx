import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../common/Button';

const STATUS_COPY = {
  idle: {
    title: 'Talk to TITAN',
    description: 'Speak naturally to plan, remember, check in, or get a quick answer.',
  },
  listening: {
    title: 'TITAN is listening…',
    description: 'Speak when you are ready. TITAN will send your request when you finish.',
  },
  thinking: {
    title: 'TITAN is thinking…',
    description: 'Working with your tasks, reminders, memory, and available live information.',
  },
  speaking: {
    title: 'TITAN is speaking…',
    description: 'You can stop the response at any time.',
  },
  error: {
    title: 'Voice needs attention',
    description: 'Check microphone access, then try again.',
  },
};

const cleanSpeechText = (text) => text.replace(/[*_#`]/g, '');

export const BrowserVoiceAssistant = () => {
  const navigate = useNavigate();
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);
  const controllerRef = useRef(null);
  const statusRef = useRef('idle');
  const isMountedRef = useRef(true);

  const setStatus = (status) => {
    statusRef.current = status;
    if (isMountedRef.current) setVoiceStatus(status);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (statusRef.current === 'speaking') setStatus('idle');
  };

  const processVoiceRequest = async (text) => {
    const requestText = text.trim();
    if (!requestText) {
      setStatus('idle');
      return;
    }

    setRecognizedText(requestText);
    setErrorMessage('');
    setStatus('thinking');
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await api.sendMessage(requestText, null, { signal: controller.signal });
      if (controller.signal.aborted || !isMountedRef.current) return;

      const responseText = response?.assistant_message?.content || 'I was unable to prepare a response.';
      setAssistantText(responseText);

      if (!('speechSynthesis' in window)) {
        setStatus('idle');
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanSpeechText(responseText));
      utterance.rate = 1.05;
      utterance.onend = () => {
        if (isMountedRef.current && statusRef.current === 'speaking') setStatus('idle');
      };
      utterance.onerror = () => {
        if (isMountedRef.current && statusRef.current === 'speaking') setStatus('idle');
      };
      setStatus('speaking');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setErrorMessage(error.message || 'TITAN could not process that request.');
      setStatus('error');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => {
      setErrorMessage('');
      setStatus('listening');
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim();
      if (transcript) {
        recognition.stop();
        processVoiceRequest(transcript);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      const message = event.error === 'not-allowed'
        ? 'Microphone access was not allowed.'
        : event.error === 'no-speech'
        ? 'No speech was detected. Try again when you are ready.'
        : `Voice recognition error: ${event.error}.`;
      setErrorMessage(message);
      setStatus('error');
    };
    recognition.onend = () => {
      if (statusRef.current === 'listening') setStatus('idle');
    };
    recognitionRef.current = recognition;

    return () => {
      isMountedRef.current = false;
      recognition.abort();
      controllerRef.current?.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setErrorMessage('Speech recognition is not available in this browser. You can still type a message to TITAN.');
      setStatus('error');
      return;
    }

    stopSpeaking();
    setAssistantText('');
    setRecognizedText('');
    try {
      recognition.start();
    } catch {
      setErrorMessage('Voice recognition is already starting. Please try again in a moment.');
      setStatus('error');
    }
  };

  const stopListening = () => {
    recognitionRef.current?.abort();
    setStatus('idle');
  };

  const cancelRequest = () => {
    controllerRef.current?.abort();
    setStatus('idle');
  };

  const copy = STATUS_COPY[voiceStatus];
  const isListening = voiceStatus === 'listening';
  const isThinking = voiceStatus === 'thinking';
  const isSpeaking = voiceStatus === 'speaking';

  return (
    <section
      className="titan-card"
      style={{
        marginBottom: 20,
        padding: '22px 24px',
        borderColor: voiceStatus === 'error' ? 'rgba(198, 79, 92, 0.3)' : 'var(--accent-cyan-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: voiceStatus === 'error' ? 'rgba(198, 79, 92, 0.1)' : 'var(--accent-cyan-glow)',
              color: voiceStatus === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)',
            }}
          >
            {isSpeaking ? <Volume2 size={21} /> : isListening ? <Mic size={21} /> : <MicOff size={20} />}
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 650 }}>{copy.title}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 3 }}>{copy.description}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isListening ? (
            <Button variant="secondary" onClick={stopListening} icon={Square}>Stop listening</Button>
          ) : isThinking ? (
            <Button variant="secondary" onClick={cancelRequest} icon={Square}>Cancel</Button>
          ) : isSpeaking ? (
            <Button variant="secondary" onClick={stopSpeaking} icon={VolumeX}>Stop speaking</Button>
          ) : (
            <Button variant="primary" onClick={startListening} icon={Mic}>Talk to TITAN</Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/chat')} icon={Send}>Type a message</Button>
        </div>
      </div>

      {errorMessage && (
        <p style={{ marginTop: 14, fontSize: '0.84rem', color: 'var(--accent-rose)' }}>{errorMessage}</p>
      )}

      {(recognizedText || assistantText) && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recognizedText && (
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ minWidth: 62, fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', paddingTop: 2 }}>You said</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{recognizedText}</p>
            </div>
          )}
          {assistantText && (
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ minWidth: 62, fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', paddingTop: 2 }}>TITAN</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{assistantText}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
