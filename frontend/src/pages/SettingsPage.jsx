import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Key,
  User,
  Database,
  Cpu,
  Radio,
  CloudSun,
  Newspaper,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Input, Loader } from '../components/common/Common';
import { useToast } from '../context/ToastContext';

export const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [healthData, setHealthData] = useState(null);

  // User Profile Form
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Assistant Settings Form
  const [timezone, setTimezone] = useState('UTC');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [customPrompt, setCustomPrompt] = useState('');

  const loadSettingsAndHealth = async () => {
    try {
      const [settingsData, health] = await Promise.all([
        api.getSettings().catch(() => ({})),
        api.checkHealth().catch(() => null),
      ]);

      if (user) {
        setProfileName(user.full_name || '');
        setProfileEmail(user.email || '');
      }

      if (settingsData) {
        setTimezone(settingsData.timezone || 'UTC');
        setVoiceSpeed(settingsData.voice_speed || 1.0);
        setCustomPrompt(settingsData.custom_prompt_instructions || '');
      }

      setHealthData(health);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndHealth();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser({
        full_name: profileName,
        email: profileEmail,
      });
      addToast('Profile Updated', 'Your profile details have been saved.', 'success');
    } catch (err) {
      addToast('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings({
        timezone,
        theme,
        voice_speed: parseFloat(voiceSpeed),
        custom_prompt_instructions: customPrompt.trim() || null,
      });
      addToast('Preferences Saved', 'Assistant parameters and personality updated.', 'success');
    } catch (err) {
      addToast('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader size={36} label="Loading system settings and diagnostics..." />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <SettingsIcon size={24} color="var(--accent-cyan)" /> Configuration & Diagnostics
          </h1>
          <p className="page-subtitle">
            Manage account preferences, assistant persona, and inspect live external integrations.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        
        {/* User Account Settings */}
        <div className="titan-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <User size={18} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Operator Profile</h3>
          </div>

          <form onSubmit={handleSaveProfile}>
            <Input
              label="Full Name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="primary" type="submit" loading={saving} icon={Save}>
                Save Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Assistant Personality & Behavior */}
        <div className="titan-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Cpu size={18} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Assistant Behavior & Preferences</h3>
          </div>

          <form onSubmit={handleSavePreferences}>
            <Input
              label="Timezone"
              type="select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="America/Chicago">Central Time (US & Canada)</option>
              <option value="America/Denver">Mountain Time (US & Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              <option value="Europe/London">London (GMT / BST)</option>
              <option value="Europe/Paris">Paris, Berlin (CET)</option>
              <option value="Asia/Tokyo">Tokyo, Japan (JST)</option>
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
            </Input>

            <Input
              label="Voice Playback Speed"
              type="select"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(e.target.value)}
            >
              <option value="0.85">0.85x (Slow & Deliberate)</option>
              <option value="1.0">1.0x (Natural Default)</option>
              <option value="1.15">1.15x (Brisk & Efficient)</option>
              <option value="1.3">1.3x (Rapid Briefing)</option>
            </Input>

            <Input
              label="Custom AI System Instructions (Optional)"
              type="textarea"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Always provide concise executive summaries first. Prioritize Python code snippets."
              helper="Injected into TITAN's context on every reasoning turn."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="primary" type="submit" loading={saving} icon={Save}>
                Save Preferences
              </Button>
            </div>
          </form>
        </div>

      </div>

      {/* System Health & Live Credentials Diagnostic Panel */}
      <div className="titan-card titan-card-glass" style={{ marginTop: 24, border: '1px solid var(--accent-cyan-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} color="var(--accent-cyan)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>System Health & Service Integrations</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Real-time connection verification and environment variable credentials status.
              </p>
            </div>
          </div>

          <Badge variant={healthData?.database_connected ? 'emerald' : 'rose'}>
            DATABASE: {healthData?.database_connected ? 'CONNECTED (POSTGRESQL)' : 'DISCONNECTED'}
          </Badge>
        </div>

        {healthData?.credentials && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {healthData.credentials.map((cred, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: cred.configured ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 171, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{cred.name}</strong>
                    <Badge variant={cred.configured ? 'emerald' : 'amber'}>
                      {cred.configured ? 'CONFIGURED' : 'OPTIONAL / READY'}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cred.description}</p>
                </div>

                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Env: <code>{cred.env_var}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
