import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state เพื่อให้ UI แสดงหน้า fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // บันทึก Error ไว้ใน state
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // สามารถส่ง error ไปยัง logging service ได้
    console.error('❌ Error caught by ErrorBoundary:', error, errorInfo);
    
    // TODO: ส่งไปยัง Error Tracking Service เช่น Sentry
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Reload หน้าเว็บ
    window.location.reload();
  };

  handleGoHome = () => {
    // กลับไปหน้าแรก
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>เกิดข้อผิดพลาด</h1>
            <p className="error-message">
              ขออภัย เกิดข้อผิดพลาดบางอย่างในระบบ
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>รายละเอียดข้อผิดพลาด (Development Mode)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReload} className="btn-primary">
                🔄 โหลดหน้าใหม่
              </button>
              <button onClick={this.handleGoHome} className="btn-secondary">
                🏠 กลับหน้าแรก
              </button>
            </div>

            <p className="error-help">
              หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
