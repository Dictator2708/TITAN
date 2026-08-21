import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../common/Button';

/**
 * TITAN's real-time voice pipeline powered by Gemini Live (gemini-3.1-flash-live-preview).
 *
 * This is intentionally a separate, additive component: it does not touch or replace
 * BrowserVoiceAssistant.jsx (Web Speech API + browser TTS), which keeps working as-is.
 *
 * Audio contract with the backend (/api/v1/voice/live/ws):
 *  - mic audio is downsampled to 16-bit PCM, 16kHz, mono, and sent as binary WS frames
 *  - Gemini's spoken reply arrives as binary WS frames: 16-bit PCM, 24kHz, mono
 *  - JSON text frames carry transcripts, tool call/result events, and errors
 */

const TARGET_SEND_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (outputSampleRate === inputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export const GeminiLiveVoiceAssistant = () => {
  const [status, setStatus] = useState('checking'); // checking | unavailable | idle | connecting | live | error
  const [errorMessage, setErrorMessage] = useState('');
  const [events, setEvents] = useState([]); // { role/type, text }

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const playbackCtxRef = useRef(null);
  const nextPlaybackTimeRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        const s = await api.getGeminiLiveStatus();
        if (!isMountedRef.current) return;
        setStatus(s.gemini_live_configured ? 'idle' : 'unavailable');
        if (!s.gemini_live_configured) {
          setErrorMessage('Add GEMINI_API_KEY to backend/.env to enable real-time Gemini voice.');
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setStatus('unavailable');
        setErrorMessage('Could not reach the Gemini Live status endpoint.');
      }
    })();

    return () => {
      isMountedRef.current = false;
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushEvent = (event) => {
    if (!isMountedRef.current) return;
    setEvents((prev) => [...prev.slice(-24), event]);
  };

  const playPcmChunk = (arrayBuffer) => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: PLAYBACK_SAMPLE_RATE,
      });
      nextPlaybackTimeRef.current = playbackCtxRef.current.currentTime;
    }
    const ctx = playbackCtxRef.current;
    const int16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const audioBuffer = ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextPlaybackTimeRef.current);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
  };

  const stopSession = () => {
    try {
      processorRef.current?.disconnect();
    } catch {}
    try {
      sourceNodeRef.current?.disconnect();
    } catch {}
    micStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    try {
      audioContextRef.current?.close();
    } catch {}
    try {
      wsRef.current?.close();
    } catch {}
    processorRef.current = null;
    sourceNodeRef.current = null;
    micStreamRef.current = null;
    audioContextRef.current = null;
    wsRef.current = null;
    if (isMountedRef.current) setStatus('idle');
  };

  const startSession = async () => {
    setErrorMessage('');
    setEvents([]);
    setStatus('connecting');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setErrorMessage('Microphone access was denied or unavailable.');
      setStatus('error');
      return;
    }
    micStreamRef.current = stream;

    const ws = new WebSocket(api.getGeminiLiveWsUrl());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      setStatus('live');

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // ScriptProcessorNode is deprecated but has the broadest browser support for
      // simple raw-PCM capture without shipping a separate AudioWorklet module file.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioContext.sampleRate, TARGET_SEND_SAMPLE_RATE);
        const pcm16 = floatTo16BitPCM(downsampled);
        ws.send(pcm16);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'transcript') {
            pushEvent({ type: 'transcript', role: payload.role, text: payload.text });
          } else if (payload.type === 'tool_call') {
            pushEvent({ type: 'tool_call', text: `Calling ${payload.name}...` });
          } else if (payload.type === 'tool_result') {
            pushEvent({ type: 'tool_result', text: `${payload.name} completed` });
          } else if (payload.type === 'error') {
            setErrorMessage(payload.message);
            setStatus('error');
          }
        } catch {
          // ignore malformed frames
        }
      } else {
        playPcmChunk(event.data);
      }
    };

    ws.onerror = () => {
      if (!isMountedRef.current) return;
      setErrorMessage('Gemini Live connection error.');
      setStatus('error');
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      if (status !== 'error') setStatus('idle');
    };
  };

  if (status === 'checking') {
    return (
      <section className="titan-card" style={{ marginBottom: 20, padding: '18px 22px' }}>
        <Loader2 className="animate-spin" size={18} /> Checking Gemini Live availability...
      </section>
    );
  }

  return (
    <section
      className="titan-card"
      style={{
        marginBottom: 20,
        padding: '22px 24px',
        borderColor: status === 'error' ? 'rgba(198, 79, 92, 0.3)' : 'var(--accent-cyan-border)',
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
              background: status === 'error' ? 'rgba(198, 79, 92, 0.1)' : 'var(--accent-cyan-glow)',
              color: status === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)',
            }}
          >
            {status === 'live' ? <Sparkles size={21} /> : status === 'unavailable' ? <AlertTriangle size={20} /> : <Mic size={21} />}
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 650 }}>TITAN Voice (Gemini Live)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 3 }}>
              {status === 'unavailable'
                ? 'Not configured on the server yet.'
                : status === 'live'
                ? 'Live - speak naturally, TITAN will respond in voice.'
                : 'Real-time, full-duplex voice powered by gemini-3.1-flash-live-preview.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {status === 'live' || status === 'connecting' ? (
            <Button variant="secondary" onClick={stopSession} icon={MicOff}>
              {status === 'connecting' ? 'Connecting...' : 'End voice session'}
            </Button>
          ) : (
            <Button variant="primary" onClick={startSession} icon={Mic} disabled={status === 'unavailable'}>
              Start Gemini Live
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <p style={{ marginTop: 14, fontSize: '0.84rem', color: 'var(--accent-rose)' }}>{errorMessage}</p>
      )}

      {events.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((ev, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10 }}>
              <span style={{ minWidth: 62, fontSize: '0.74rem', color: ev.type === 'transcript' && ev.role === 'assistant' ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', paddingTop: 2 }}>
                {ev.type === 'transcript' ? ev.role : ev.type.replace('_', ' ')}
              </span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ev.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
