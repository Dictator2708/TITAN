import React, { useState, useEffect } from 'react';
import {
  Brain,
  Plus,
  Search,
  Trash2,
  Edit2,
  Tag,
  Lightbulb,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Input, Loader } from '../components/common/Common';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'preference', label: 'Preferences' },
  { id: 'project', label: 'Projects' },
  { id: 'fact', label: 'Facts' },
  { id: 'goal', label: 'Goals' },
  { id: 'personal', label: 'Personal' },
  { id: 'general', label: 'General' },
];

export const MemoryPage = () => {
  const { addToast } = useToast();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [formData, setFormData] = useState({
    key: '',
    content: '',
    category: 'general',
  });

  const loadMemories = async () => {
    try {
      let data;
      if (search.trim()) {
        data = await api.searchMemories(search.trim(), activeCategory);
      } else {
        data = await api.listMemories(activeCategory);
      }
      setMemories(data);
    } catch (err) {
      console.error('Error loading memories:', err);
      addToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [activeCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMemories();
  };

  const openCreateModal = () => {
    setEditingMemory(null);
    setFormData({
      key: '',
      content: '',
      category: 'preference',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (mem) => {
    setEditingMemory(mem);
    setFormData({
      key: mem.key,
      content: mem.content,
      category: mem.category,
    });
    setIsModalOpen(true);
  };

  const handleSaveMemory = async (e) => {
    e.preventDefault();
    if (!formData.key.trim() || !formData.content.trim()) return;

    try {
      const payload = {
        key: formData.key.trim(),
        content: formData.content.trim(),
        category: formData.category,
      };

      if (editingMemory) {
        await api.updateMemory(editingMemory.id, payload);
        addToast('Memory Updated', `Updated memory for "${payload.key}".`, 'success');
      } else {
        await api.saveMemory(payload);
        addToast('Memory Saved', `TITAN will remember "${payload.key}".`, 'success');
      }
      setIsModalOpen(false);
      loadMemories();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleDeleteMemory = async (memId) => {
    if (!window.confirm('Forget this memory item?')) return;
    try {
      await api.deleteMemory(memId);
      addToast('Memory Deleted', 'Memory forgotten.', 'info');
      loadMemories();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Brain size={24} color="var(--accent-cyan)" /> Persistent Memory
          </h1>
          <p className="page-subtitle">
            Intentional facts, preferences, and details TITAN actively recalls across every conversation.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={Plus}>
          Add Memory
        </Button>
      </div>

      {/* Info Notice */}
      <div
        className="titan-card"
        style={{
          marginBottom: 20,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid var(--accent-cyan-border)',
          background: 'var(--accent-cyan-glow)',
        }}
      >
        <Lightbulb size={20} color="var(--accent-cyan)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Intentional Long-Term Storage:</strong> Only explicitly stored or assistant-saved memories persist here. Conversation turns remain ephemeral and isolated.
        </span>
      </div>

      {/* Category Tabs & Search */}
      <div
        className="titan-card"
        style={{
          marginBottom: 24,
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: activeCategory === cat.id ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                backgroundColor: activeCategory === cat.id ? 'var(--accent-cyan-glow)' : 'var(--bg-surface)',
                color: activeCategory === cat.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, minWidth: 240 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 30, fontSize: '0.85rem', padding: '6px 10px 6px 30px' }}
            />
          </div>
          <Button variant="secondary" size="sm" type="submit">
            Find
          </Button>
        </form>
      </div>

      {loading ? (
        <Loader size={36} label="Loading persistent memories..." />
      ) : memories.length === 0 ? (
        <div className="titan-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Brain size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3>No Memories Recorded</h3>
          <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
            Add a preference or say in chat: "Remember that I prefer Python and dark mode."
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="titan-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 18,
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-cyan)',
                      fontWeight: 600,
                    }}
                  >
                    #{mem.key}
                  </span>
                  <Badge
                    variant={
                      mem.category === 'preference'
                        ? 'purple'
                        : mem.category === 'project'
                        ? 'cyan'
                        : mem.category === 'goal'
                        ? 'emerald'
                        : 'amber'
                    }
                  >
                    {mem.category}
                  </Badge>
                </div>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {mem.content}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Updated: {new Date(mem.updated_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditModal(mem)} className="btn-icon" style={{ padding: 4 }} title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDeleteMemory(mem.id)} className="btn-icon" style={{ padding: 4, color: 'var(--accent-rose)' }} title="Forget">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMemory ? 'Edit Memory' : 'Store New Memory'}
      >
        <form onSubmit={handleSaveMemory}>
          <Input
            label="Memory Key / Topic"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder="e.g. backend_language_preference"
            required
          />

          <Input
            label="Category"
            type="select"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="preference">Preference</option>
            <option value="project">Project</option>
            <option value="fact">Fact</option>
            <option value="goal">Goal</option>
            <option value="personal">Personal</option>
            <option value="general">General</option>
          </Input>

          <Input
            label="Content to Remember"
            type="textarea"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="e.g. User specializes in Python 3.12 and high-performance async FastAPI backends."
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingMemory ? 'Save Changes' : 'Store Memory'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
