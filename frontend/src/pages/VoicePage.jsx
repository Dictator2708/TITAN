import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Send,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Common';
import { useToast } from '../context/ToastContext';
import { GeminiLiveVoiceAssistant } from '../components/voice/GeminiLiveVoiceAssistant';

export const VoicePage = () => {
  const { addToast } = useToast();

  const [voiceStatus, setVoiceStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([
    {
      sender: 'assistant',
      text: 'TITAN Voice Matrix online. Tap "Connect Voice Room" or speak to initiate audio pipeline.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [spokenInput, setSpokenInput] = useState('');
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const checkVoiceConfig = async () => {
      try {
        const status = await api.getVoiceStatus();
        setVoiceStatus(status);
      } catch (err) {
        console.error('Error checking voice status:', err);
      }
    };
    checkVoiceConfig();

    // Setup Web Speech API for local client-side mic testing fallback
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (text) {
          handleProcessVoiceInput(text);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleConnect = async () => {
    try {
      setLoading(true);
      if (voiceStatus?.voice_agent_configured) {
        const tokenData = await api.getVoiceToken();
        setIsConnected(true);
        addToast('Connected to LiveKit', `Joined room ${tokenData.room_name}`, 'success');
      } else {
        // Run in local WebRTC & Speech Recognition Bridge mode
        setIsConnected(true);
        addToast('Voice Bridge Active', 'Client speech synthesis & recognition connected.', 'info');
      }
    } catch (err) {
      addToast('Voice Connection Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    addToast('Voice Disconnected', '', 'info');
  };

  const toggleMicListening = () => {
    if (!isConnected) {
      handleConnect();
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
        }
      } else {
        addToast('Mic Notice', 'Web Speech recognition not supported in this browser. You can type audio commands below.', 'warning');
      }
    }
  };

  const handleProcessVoiceInput = async (spokenText) => {
    if (!spokenText.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscript((prev) => [...prev, { sender: 'user', text: spokenText, time }]);
    setIsListening(false);
    setIsSpeaking(true);

    try {
      const response = await api.sendMessage(spokenText);
      const answer = response.assistant_message.content;
      setTranscript((prev) => [...prev, { sender: 'assistant', text: answer, time }]);

      // Speak response using Web Speech Synthesis if available
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(answer.replace(/[*_#`]/g, ''));
        utterance.rate = 1.05;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      setIsSpeaking(false);
      addToast('Voice Processing Error', err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Radio size={24} color="var(--accent-cyan)" /> Real-Time Voice Cockpit
          </h1>
          <p className="page-subtitle">
            Bidirectional real-time voice streaming powered by LiveKit + Python agent architecture.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Badge variant={isConnected ? 'emerald' : 'amber'}>
            {isConnected ? 'ROOM CONNECTED' : 'DISCONNECTED'}
          </Badge>
          {isConnected ? (
            <Button variant="danger" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleConnect} loading={loading}>
              Connect Voice Room
            </Button>
          )}
        </div>
      </div>

      {/* Primary voice interaction: Gemini Live (real-time audio-to-audio) */}
      <GeminiLiveVoiceAssistant />

      {/* Voice Status Alert if missing LiveKit keys */}
      {voiceStatus && !voiceStatus.voice_agent_configured && (
        <div
          className="titan-card"
          style={{
            marginBottom: 24,
            padding: '14px 20px',
            border: '1px solid rgba(214, 146, 46, 0.25)',
            backgroundColor: 'rgba(214, 146, 46, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <strong>LiveKit Server Setup:</strong> To stream low-latency audio through a LiveKit cloud room, configure <code>LIVEKIT_URL</code> and API keys in <code>.env</code>. The in-browser WebRTC speech bridge is currently active.
            </span>
          </div>
        </div>
      )}

      {/* Visualizer & Orb Cockpit */}
      <div
        className="titan-card"
        style={{
          padding: 48,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
        }}
      >
        {/* Mic status orb */}
        <div
          onClick={toggleMicListening}
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: isSpeaking
              ? 'var(--accent-purple)'
              : isListening
              ? 'var(--accent-cyan)'
              : isConnected
              ? 'var(--accent-blue)'
              : 'var(--bg-surface)',
            boxShadow: isListening || isSpeaking
              ? '0 0 0 8px var(--accent-cyan-glow)'
              : 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isListening || isSpeaking ? 'scale(1.05)' : 'scale(1)',
            marginBottom: 24,
          }}
        >
          {isListening ? (
            <Mic size={48} color="#ffffff" />
          ) : isSpeaking ? (
            <Volume2 size={48} color="#ffffff" />
          ) : (
            <MicOff size={44} color="var(--text-muted)" />
          )}
        </div>

        {/* State Label */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>
          {isListening
            ? 'Listening to your voice...'
            : isSpeaking
            ? 'TITAN is speaking...'
            : isConnected
            ? 'Connected & Ready (Click Orb to Speak)'
            : 'Voice Standby'}
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 460 }}>
          {isConnected
            ? 'Speak commands naturally: "Schedule a reminder for tomorrow", "What is the weather?", or "Give me tech news".'
            : 'Click the button above or tap the orb to establish audio session.'}
        </p>

        {/* Waveform Bars Animation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 48, marginTop: 24 }}>
          {[18, 32, 44, 28, 48, 22, 38, 16, 40, 26, 34, 20].map((h, i) => (
            <span
              key={i}
              style={{
                width: 4,
                borderRadius: 4,
                backgroundColor: isSpeaking
                  ? 'var(--accent-purple)'
                  : isListening
                  ? 'var(--accent-cyan)'
                  : 'var(--border-subtle)',
                height: isListening || isSpeaking ? h : 8,
                transition: 'height 0.15s ease-in-out',
                animation: isListening || isSpeaking ? `waveBar 1.${(i % 5) + 2}s infinite ease-in-out` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Spoken Dialogue Transcript Log */}
      <div className="titan-card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>
          Voice Dialogue Transcript
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
          {transcript.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: item.sender === 'user' ? 'rgba(76, 110, 245, 0.08)' : 'var(--bg-surface)',
                border: item.sender === 'user' ? '1px solid rgba(76, 110, 245, 0.25)' : '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: item.sender === 'user' ? 'var(--accent-blue)' : 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', minWidth: 70 }}>
                {item.sender}:
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {item.text}
                </p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Manual Speech Query Simulation Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (spokenInput.trim()) {
              handleProcessVoiceInput(spokenInput);
              setSpokenInput('');
            }
          }}
          style={{ display: 'flex', gap: 10 }}
        >
          <input
            type="text"
            placeholder="Simulate voice command via text (e.g. 'What are my top tasks?')..."
            value={spokenInput}
            onChange={(e) => setSpokenInput(e.target.value)}
            className="input-field"
          />
          <Button variant="primary" type="submit" disabled={!spokenInput.trim()}>
            <Send size={16} /> Send
          </Button>
        </form>
      </div>
    </div>
  );
};
