import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Input, Loader } from '../components/common/Common';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export const RemindersPage = () => {
  const { addToast } = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    reminder_text: '',
    scheduled_time: '',
    status: 'pending',
  });

  const loadReminders = async () => {
    try {
      const data = await api.listReminders(statusFilter !== 'all' ? statusFilter : null);
      setReminders(data);
    } catch (err) {
      console.error('Error loading reminders:', err);
      addToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [statusFilter]);

  const openCreateModal = () => {
    setEditingReminder(null);
    setFormData({
      reminder_text: '',
      scheduled_time: '',
      status: 'pending',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (reminder) => {
    setEditingReminder(reminder);
    const dateObj = new Date(reminder.scheduled_time);
    // Format YYYY-MM-DDTHH:MM for input[type="datetime-local"]
    const pad = (num) => String(num).padStart(2, '0');
    const localIso = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

    setFormData({
      reminder_text: reminder.reminder_text,
      scheduled_time: localIso,
      status: reminder.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    if (!formData.reminder_text.trim() || !formData.scheduled_time) return;

    try {
      const payload = {
        reminder_text: formData.reminder_text.trim(),
        scheduled_time: new Date(formData.scheduled_time).toISOString(),
        status: formData.status,
      };

      if (editingReminder) {
        await api.updateReminder(editingReminder.id, payload);
        addToast('Reminder Updated', 'Changes saved successfully.', 'success');
      } else {
        await api.createReminder(payload);
        addToast('Reminder Scheduled', 'TITAN will alert you at the scheduled time.', 'success');
      }
      setIsModalOpen(false);
      loadReminders();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Delete this scheduled reminder?')) return;
    try {
      await api.deleteReminder(reminderId);
      addToast('Reminder Deleted', '', 'info');
      loadReminders();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleMarkDelivered = async (reminder) => {
    try {
      await api.updateReminder(reminder.id, { status: 'delivered' });
      addToast('Reminder Updated', 'Marked as delivered.', 'info');
      loadReminders();
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
            <Bell size={24} color="var(--accent-amber)" /> Scheduled Reminders
          </h1>
          <p className="page-subtitle">
            Autonomous background scheduler ensuring you never miss critical events and alerts.
          </p>
        </div>

        <Button variant="primary" onClick={openCreateModal} icon={Plus}>
          Set Reminder
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="titan-card"
        style={{
          marginBottom: 24,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select-field"
            style={{ width: 'auto', padding: '6px 12px' }}
          >
            <option value="all">All Reminders</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {reminders.length} reminder{reminders.length !== 1 ? 's' : ''} tracked
        </span>
      </div>

      {loading ? (
        <Loader size={36} label="Loading reminders..." />
      ) : reminders.length === 0 ? (
        <div className="titan-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Clock size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3>No Reminders Found</h3>
          <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
            Schedule an alert or ask TITAN in chat: "Remind me at 8 PM to call Rahul".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reminders.map((rem) => {
            const schedDate = new Date(rem.scheduled_time);
            const isDelivered = rem.status === 'delivered';
            const isPending = rem.status === 'pending';

            return (
              <div
                key={rem.id}
                className="titan-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 22px',
                  opacity: isDelivered ? 0.7 : 1,
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isPending ? 'rgba(255, 171, 0, 0.12)' : 'rgba(0, 230, 118, 0.12)',
                      color: isPending ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                    }}
                  >
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        textDecoration: isDelivered ? 'line-through' : 'none',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {rem.reminder_text}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <Calendar size={13} />
                      <span>{schedDate.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Badge variant={isPending ? 'amber' : isDelivered ? 'emerald' : 'rose'}>
                    {rem.status}
                  </Badge>

                  {isPending && (
                    <Button variant="secondary" size="sm" onClick={() => handleMarkDelivered(rem)}>
                      Mark Delivered
                    </Button>
                  )}

                  <button onClick={() => openEditModal(rem)} className="btn-icon" style={{ padding: 6 }} title="Edit">
                    <Edit2 size={15} />
                  </button>

                  <button onClick={() => handleDeleteReminder(rem.id)} className="btn-icon" style={{ padding: 6, color: 'var(--accent-rose)' }} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReminder ? 'Edit Reminder' : 'Schedule New Reminder'}
      >
        <form onSubmit={handleSaveReminder}>
          <Input
            label="Reminder Description"
            value={formData.reminder_text}
            onChange={(e) => setFormData({ ...formData, reminder_text: e.target.value })}
            placeholder="e.g. Call Rahul at 8 PM"
            required
          />

          <Input
            label="Date & Time"
            type="datetime-local"
            value={formData.scheduled_time}
            onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
            required
          />

          {editingReminder && (
            <Input
              label="Status"
              type="select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Input>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingReminder ? 'Save Changes' : 'Schedule Reminder'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
