import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Input, Loader } from '../components/common/Common';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export const NotesPage = () => {
  const { addToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    is_pinned: false,
  });

  const loadNotes = async () => {
    try {
      const data = await api.listNotes(search.trim() || '');
      setNotes(data);
    } catch (err) {
      console.error('Error loading notes:', err);
      addToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadNotes();
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      tags: '',
      is_pinned: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      tags: note.tags || '',
      is_pinned: note.is_pinned,
    });
    setIsModalOpen(true);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags.trim() || null,
        is_pinned: formData.is_pinned,
      };

      if (editingNote) {
        await api.updateNote(editingNote.id, payload);
        addToast('Note Updated', `"${payload.title}" saved.`, 'success');
      } else {
        await api.createNote(payload);
        addToast('Note Created', `"${payload.title}" added to notes.`, 'success');
      }
      setIsModalOpen(false);
      loadNotes();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await api.updateNote(note.id, { is_pinned: !note.is_pinned });
      addToast('Note Updated', note.is_pinned ? 'Unpinned note' : 'Pinned note to top', 'info');
      loadNotes();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.deleteNote(noteId);
      addToast('Note Deleted', '', 'info');
      loadNotes();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const regularNotes = notes.filter((n) => !n.is_pinned);

  const renderNoteCard = (note) => (
    <div
      key={note.id}
      className="titan-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 240,
        border: note.is_pinned ? '1px solid var(--accent-cyan-border)' : '1px solid var(--border-card)',
        backgroundColor: note.is_pinned ? 'var(--accent-cyan-glow)' : 'var(--bg-card)',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
            {note.title}
          </h3>
          <button
            onClick={() => handleTogglePin(note)}
            className="btn-icon"
            style={{ padding: 4, color: note.is_pinned ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
            title={note.is_pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin size={15} style={{ fill: note.is_pinned ? 'currentColor' : 'none' }} />
          </button>
        </div>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            whiteSpace: 'pre-wrap',
          }}
        >
          {note.content}
        </p>
      </div>

      <div>
        {note.tags && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {note.tags.split(',').map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--accent-cyan)',
                }}
              >
                #{tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {new Date(note.updated_at).toLocaleDateString()}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => openEditModal(note)} className="btn-icon" style={{ padding: 4 }} title="Edit">
              <Edit2 size={13} />
            </button>
            <button onClick={() => handleDeleteNote(note.id)} className="btn-icon" style={{ padding: 4, color: 'var(--accent-rose)' }} title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={24} color="var(--accent-purple)" /> Knowledge & Notes
          </h1>
          <p className="page-subtitle">
            Central repository for thoughts, project documentation, and AI-captured knowledge.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={Plus}>
          New Note
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="titan-card" style={{ marginBottom: 24, padding: '14px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search notes by title, body, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <Button variant="secondary" type="submit">
            Search
          </Button>
        </form>
      </div>

      {loading ? (
        <Loader size={36} label="Loading knowledge base..." />
      ) : notes.length === 0 ? (
        <div className="titan-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3>No Notes Recorded</h3>
          <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
            Create a note here or tell TITAN in chat: "Save this as a note: [content]".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {pinnedNotes.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Pin size={16} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Pinned Notes</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {pinnedNotes.map(renderNoteCard)}
              </div>
            </div>
          )}

          <div>
            {pinnedNotes.length > 0 && (
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>All Notes</h3>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {regularNotes.map(renderNoteCard)}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Edit Note' : 'Create New Note'}
      >
        <form onSubmit={handleSaveNote}>
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. System Architecture Diagram"
            required
          />

          <Input
            label="Content"
            type="textarea"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Type your markdown notes or ideas here..."
            style={{ minHeight: 160 }}
            required
          />

          <Input
            label="Tags (Comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g. architecture, database, backend"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input
              type="checkbox"
              id="is_pinned"
              checked={formData.is_pinned}
              onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              style={{ accentColor: 'var(--accent-cyan)', width: 16, height: 16 }}
            />
            <label htmlFor="is_pinned" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Pin this note to the top
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingNote ? 'Save Changes' : 'Create Note'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
