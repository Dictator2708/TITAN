import React from 'react';

export const Input = ({
  label,
  error,
  helper,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea id={inputId} className="textarea-field" {...props} />
      ) : type === 'select' ? (
        <select id={inputId} className="select-field" {...props}>
          {props.children}
        </select>
      ) : (
        <input id={inputId} type={type} className="input-field" {...props} />
      )}
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: 2 }}>
          {error}
        </span>
      )}
      {helper && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {helper}
        </span>
      )}
    </div>
  );
};

export const Badge = ({ variant = 'cyan', children, className = '' }) => {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>;
};

export const Loader = ({ size = 32, label }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 16,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: '3px solid var(--accent-cyan-border)',
          borderTopColor: 'var(--accent-cyan)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {label && (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{label}</p>
      )}
    </div>
  );
};
