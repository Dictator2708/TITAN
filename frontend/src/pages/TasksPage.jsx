import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List as ListIcon,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Badge, Input, Loader } from '../components/common/Common';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export const TasksPage = () => {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    due_time: '',
  });

  const loadTasks = async () => {
    try {
      const data = await api.listTasks({
        search: search.trim() || undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
      addToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [priorityFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTasks();
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      due_date: '',
      due_time: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      due_time: task.due_time ? task.due_time.slice(0, 5) : '',
    });
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null,
      };

      if (editingTask) {
        await api.updateTask(editingTask.id, payload);
        addToast('Task Updated', `"${payload.title}" updated.`, 'success');
      } else {
        await api.createTask(payload);
        addToast('Task Created', `"${payload.title}" added to tasks.`, 'success');
      }
      setIsModalOpen(false);
      loadTasks();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.status === 'completed') {
        await api.updateTask(task.id, { status: 'pending' });
        addToast('Task Status', 'Marked as pending', 'info');
      } else {
        await api.completeTask(task.id);
        addToast('Task Completed', `"${task.title}" finished!`, 'success');
      }
      loadTasks();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      addToast('Task Deleted', '', 'info');
      loadTasks();
    } catch (err) {
      addToast('Error', err.message, 'error');
    }
  };

  const renderTaskCard = (task) => {
    const isCompleted = task.status === 'completed';
    return (
      <div
        key={task.id}
        className="titan-card"
        style={{
          padding: '16px',
          opacity: isCompleted ? 0.7 : 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
            <button
              onClick={() => handleToggleComplete(task)}
              className="btn-icon"
              style={{ padding: 0, marginTop: 2, color: isCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
              title={isCompleted ? 'Mark Pending' : 'Mark Complete'}
            >
              {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <div>
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                }}
              >
                {task.title}
              </h4>
              {task.description && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => openEditModal(task)} className="btn-icon" style={{ padding: 4 }} title="Edit">
              <Edit2 size={14} />
            </button>
            <button onClick={() => handleDeleteTask(task.id)} className="btn-icon" style={{ padding: 4, color: 'var(--accent-rose)' }} title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
          <Badge
            variant={
              task.priority === 'urgent'
                ? 'rose'
                : task.priority === 'high'
                ? 'amber'
                : task.priority === 'low'
                ? 'emerald'
                : 'cyan'
            }
          >
            {task.priority}
          </Badge>

          {task.due_date && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> {task.due_date} {task.due_time ? `@ ${task.due_time.slice(0, 5)}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CheckSquare size={24} color="var(--accent-cyan)" /> Task Management
          </h1>
          <p className="page-subtitle">
            Organize, prioritize, and execute your work with complete AI tool synchronization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: 3, borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setViewMode('kanban')}
              className="btn-icon"
              style={{
                backgroundColor: viewMode === 'kanban' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                padding: '6px 10px',
              }}
              title="Kanban Board"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="btn-icon"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                padding: '6px 10px',
              }}
              title="List View"
            >
              <ListIcon size={16} />
            </button>
          </div>

          <Button variant="primary" onClick={openCreateModal} icon={Plus}>
            New Task
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flex: 1, minWidth: 240 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search tasks by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <Button variant="secondary" type="submit">
            Filter
          </Button>
        </form>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="select-field"
              style={{ width: 'auto', padding: '6px 10px' }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field"
              style={{ width: 'auto', padding: '6px 10px' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Loader size={36} label="Loading tasks..." />
      ) : viewMode === 'kanban' ? (
        /* Kanban Columns View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Column: Pending */}
          <div
            style={{
              backgroundColor: 'var(--bg-sidebar)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>To Do</span>
              <Badge variant="cyan">{pendingTasks.length}</Badge>
            </div>
            {pendingTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No tasks to do
              </div>
            ) : (
              pendingTasks.map(renderTaskCard)
            )}
          </div>

          {/* Column: In Progress */}
          <div
            style={{
              backgroundColor: 'var(--bg-sidebar)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>In Progress</span>
              <Badge variant="amber">{inProgressTasks.length}</Badge>
            </div>
            {inProgressTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No tasks in progress
              </div>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>

          {/* Column: Completed */}
          <div
            style={{
              backgroundColor: 'var(--bg-sidebar)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Completed</span>
              <Badge variant="emerald">{completedTasks.length}</Badge>
            </div>
            {completedTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No completed tasks
              </div>
            ) : (
              completedTasks.map(renderTaskCard)
            )}
          </div>
        </div>
      ) : (
        /* Matrix List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.length === 0 ? (
            <div className="titan-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No tasks found matching your criteria.
            </div>
          ) : (
            tasks.map(renderTaskCard)
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <form onSubmit={handleSaveTask}>
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Study Distributed Systems Architecture"
            required
          />
          <Input
            label="Description (Optional)"
            type="textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed notes or subtasks..."
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Priority"
              type="select"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Input>

            <Input
              label="Status"
              type="select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Input>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
            <Input
              label="Due Time"
              type="time"
              value={formData.due_time}
              onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
