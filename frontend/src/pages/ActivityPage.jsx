import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckSquare,
  Bell,
  FileText,
  Brain,
  Terminal,
  User,
  Filter,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { Badge, Loader } from '../components/common/Common';
import { useToast } from '../context/ToastContext';

const ACTION_ICONS = {
  task_created: CheckSquare,
  task_completed: CheckSquare,
  task_updated: CheckSquare,
  task_deleted: CheckSquare,
  reminder_scheduled: Bell,
  reminder_delivered: Bell,
  reminder_updated: Bell,
  reminder_deleted: Bell,
  note_created: FileText,
  note_updated: FileText,
  note_deleted: FileText,
  memory_saved: Brain,
  memory_updated: Brain,
  memory_deleted: Brain,
  tool_executed: Terminal,
  account_created: User,
  conversation_started: Activity,
};

export const ActivityPage = () => {
  const { addToast } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');

  const loadActivities = async () => {
    try {
      const data = await api.listActivities(100, filterAction !== 'all' ? filterAction : null);
      setActivities(data);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      addToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [filterAction]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={24} color="var(--accent-emerald)" /> System Activity Timeline
          </h1>
          <p className="page-subtitle">
            Comprehensive chronological audit trail of all autonomous actions, user updates, and tool invocations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filter Event:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="select-field"
            style={{ width: 'auto', padding: '6px 12px' }}
          >
            <option value="all">All Events</option>
            <option value="task_created">Task Created</option>
            <option value="task_completed">Task Completed</option>
            <option value="reminder_scheduled">Reminder Scheduled</option>
            <option value="reminder_delivered">Reminder Delivered</option>
            <option value="note_created">Note Created</option>
            <option value="memory_saved">Memory Saved</option>
            <option value="tool_executed">Tool Executed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Loader size={36} label="Compiling system audit logs..." />
      ) : activities.length === 0 ? (
        <div className="titan-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <Activity size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3>No Activity Logged</h3>
          <p style={{ fontSize: '0.9rem', marginTop: 4 }}>
            System events, task updates, and tool executions will be chronicled here automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activities.map((act) => {
            const Icon = ACTION_ICONS[act.action_type] || Activity;
            const dateObj = new Date(act.created_at);

            return (
              <div
                key={act.id}
                className="titan-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--accent-cyan-glow)',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {act.action_type.replace(/_/g, ' ').toUpperCase()}
                      </strong>
                      <Badge variant="cyan">{act.entity_type}</Badge>
                    </div>

                    {act.details && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {typeof act.details === 'object'
                          ? Object.entries(act.details)
                              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                              .join(' | ')
                          : String(act.details)}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} />
                  <span>{dateObj.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
