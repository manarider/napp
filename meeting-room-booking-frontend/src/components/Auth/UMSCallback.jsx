import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const UMSCallback = () => {
  const [status, setStatus] = useState('กำลังเข้าสู่ระบบ...');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [receivedInfo, setReceivedInfo] = useState(null); // ข้อมูลที่ได้รับจาก UMS
  const { loginWithUMS } = useAuth();
  const navigate = useNavigate();
  const hasRunRef = useRef(false); // ป้องกัน double execution จาก React StrictMode

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const handleCallback = async () => {
      let received = null; // เก็บไว้นอก try เพื่อให้ catch ใช้ได้
      try {
        // 1. ดึงข้อมูลจาก URL (รองรับทั้ง query string และ hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash
        );

        // เก็บ parameters ทั้งหมดที่ได้รับ
        const allQueryParams = {};
        urlParams.forEach((value, key) => { allQueryParams[key] = value; });
        const allHashParams = {};
        hashParams.forEach((value, key) => { allHashParams[key] = value; });

        // 🔍 รวบรวมข้อมูลที่ได้รับจาก UMS (debug)
        received = {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          queryParams: allQueryParams,
          hashParams: allHashParams,
          referrer: document.referrer || '(ไม่มี referrer)',
          userAgent: navigator.userAgent,
          sessionStorage_projectCode: sessionStorage.getItem('ums_project_code'),
          localStorage_hasNappToken: !!localStorage.getItem('napp_token'),
          localStorage_hasUmsUser: !!localStorage.getItem('umsUser'),
        };
        setReceivedInfo(received);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 UMS Callback - Received from UMS:');
        console.log(JSON.stringify(received, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');


        // ลองหา code จาก parameter ชื่อต่างๆ (รองรับหลายรูปแบบ)
        const possibleCodeNames = ['code', 'authCode', 'auth_code', 'authorization_code', 'token', 'accessCode', 'access_code'];
        let code = null;
        let foundParamName = null;

        for (const name of possibleCodeNames) {
          if (urlParams.get(name)) {
            code = urlParams.get(name);
            foundParamName = name;
            break;
          }
          if (hashParams.get(name)) {
            code = hashParams.get(name);
            foundParamName = `hash.${name}`;
            break;
          }
        }

        if (!code) {
          // ถ้าไม่พบ code เลย ให้แสดง parameters ทั้งหมด
          setError('ไม่พบ authorization code ใน URL');
          setDebugInfo({
            url: window.location.href,
            search: window.location.search,
            hash: window.location.hash,
            queryParams: allQueryParams,
            hashParams: allHashParams,
            triedParamNames: possibleCodeNames,
            hint: 'UMS อาจส่ง parameter ชื่ออื่น กรุณาดู queryParams/hashParams ด้านบน'
          });
          return;
        }

        console.log(`✅ Found code from param: ${foundParamName}`);

        setStatus('กำลังตรวจสอบข้อมูล...');

        // 2. ดึง projectCode จาก sessionStorage (Flow 1: NAPP → UMS → callback)
        //    หรือใช้ fallback (Flow 2: UMS deep link → callback โดยตรง)
        const storedProjectCode = sessionStorage.getItem('ums_project_code');
        const projectCode = storedProjectCode || 'MEETBOOKING';
        const flowType = storedProjectCode ? 'Flow 1 (NAPP-initiated)' : 'Flow 2 (UMS deep link)';

        console.log(`🔀 Login Flow: ${flowType}`);
        console.log('🔐 UMS Callback:', { code, projectCode, foundParamName });

        // 3. ล้าง session เดิม (ถ้ามี) เพื่อป้องกัน state ค้างจาก local login
        if (localStorage.getItem('napp_token')) {
          console.log('🧹 Clearing existing NAPP session before UMS login');
          localStorage.removeItem('napp_token');
          localStorage.removeItem('umsUser');
        }

        setStatus('กำลังเชื่อมต่อกับ UMS...');

        // 3. เรียก API เพื่อแลก code เป็น token
        const data = await loginWithUMS(code, projectCode);

        console.log('✅ UMS Login Success:', data);

        setStatus('เข้าสู่ระบบสำเร็จ กำลังเปลี่ยนหน้า...');

        // 4. ลบ code ออกจาก URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // 5. ลบ projectCode ออกจาก sessionStorage
        sessionStorage.removeItem('ums_project_code');

        // 6. Redirect ไป dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);

      } catch (err) {
        console.error('❌ UMS Callback Error:', err);
        
        const errResponse = err.response?.data;
        const errorMsg = errResponse?.error || err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        
        setError(errorMsg);
        setDebugInfo({
          received: received,
          backendResponse: {
            status: err.response?.status,
            data: errResponse,
          },
          errorMessage: err.message,
          step: 'exchange-code',
        });
      }
    };

    handleCallback();
  }, [loginWithUMS, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <img 
            src={process.env.PUBLIC_URL + "/logo1.webp"} 
            alt="Logo" 
            className="logo-image" 
          />
          <h1>🔐 UMS Authentication</h1>
        </div>

        {!error ? (
          <>
            <div className="ums-loader" style={{ margin: '2rem auto' }}></div>
            <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '1rem' }}>
              {status}
            </p>

            {/* 🔍 แสดงข้อมูลที่ได้รับจาก UMS (Debug — กดเปิดเพื่อดู) */}
            {receivedInfo && (
              <details style={{
                marginTop: '1.5rem',
                padding: '0.75rem',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '4px',
                fontSize: '0.75rem',
                textAlign: 'left',
                color: '#0369a1'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  🔍 ข้อมูลที่ได้รับจาก UMS (Debug)
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontSize: '0.7rem'
                }}>
                  {JSON.stringify(receivedInfo, null, 2)}
                </pre>
              </details>
            )}
          </>
        ) : (
          <>
            <div className="error-message" style={{ textAlign: 'left' }}>
              <strong>❌ เข้าสู่ระบบไม่สำเร็จ</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</p>
            </div>

            {debugInfo && (
              <details open style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: '#f8fafc', 
                borderRadius: '4px',
                fontSize: '0.75rem',
                textAlign: 'left',
                color: '#64748b'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  🔍 Debug Information
                </summary>
                <pre style={{ 
                  marginTop: '0.5rem', 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}

            <button 
              className="submit-btn" 
              onClick={() => navigate('/login')}
              style={{ marginTop: '1.5rem' }}
            >
              กลับไปหน้าล็อกอิน
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default UMSCallback;
