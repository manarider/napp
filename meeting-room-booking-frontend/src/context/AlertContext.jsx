import { createContext, useContext, useState } from 'react';
import Alert from '../components/common/Alert';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = (type, message, duration = 3000) => {
    const id = Date.now();
    const newAlert = { id, type, message, duration };
    
    setAlerts(prev => [...prev, newAlert]);

    setTimeout(() => {
      removeAlert(id);
    }, duration + 300);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const success = (message, duration) => showAlert('success', message, duration);
  const error = (message, duration) => showAlert('error', message, duration);
  const warning = (message, duration) => showAlert('warning', message, duration);
  const info = (message, duration) => showAlert('info', message, duration);

  return (
    <AlertContext.Provider value={{ success, error, warning, info }}>
      {children}
      <div className="alerts-container">
        {alerts.map((alert, index) => (
          <div 
            key={alert.id} 
            style={{ 
              position: 'fixed',
              top: `${20 + index * 90}px`,
              right: '20px',
              zIndex: 9999
            }}
          >
            <Alert
              type={alert.type}
              message={alert.message}
              duration={alert.duration}
              onClose={() => removeAlert(alert.id)}
            />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};