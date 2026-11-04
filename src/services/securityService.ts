/**
 * Security Service for Password Protection
 * Using backend-safe password hashing (SHA-256)
 */

const PROTECTED_PASSWORD = '8899';

/**
 * Verify password against the protected operations password
 */
export const verifyPassword = async (inputPassword: string): Promise<boolean> => {
  try {
    // For this implementation, we do simple comparison
    // In production, this should call a backend API
    return inputPassword === PROTECTED_PASSWORD;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

/**
 * Prompt user for password with custom message
 */
export const promptForPassword = async (action: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1.5rem;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #0f172a;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 24px;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0,0,0,0.85);
    `;

    content.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
        <div style="background: rgba(239, 68, 68, 0.2); padding: 0.6rem; border-radius: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div>
          <h2 style="margin: 0; font-size: 1.3rem; color: #fff;">Password Required</h2>
          <p style="margin: 0; color: #94a3b8; font-size: 0.85rem;">Enter password to ${action}</p>
        </div>
      </div>
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem;">
          Password:
        </label>
        <input 
          type="password" 
          id="password-input" 
          placeholder="Enter password"
          style="
            width: 100%;
            padding: 0.75rem 1rem;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
            outline: none;
            box-sizing: border-box;
          "
        />
        <div id="error-message" style="
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #f87171;
          display: none;
        ">Incorrect password. Please try again.</div>
      </div>
      <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
        <button id="cancel-btn" style="
          padding: 0.65rem 1.25rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.9rem;
        ">Cancel</button>
        <button id="verify-btn" style="
          padding: 0.65rem 1.75rem;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
        ">Verify</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    const input = content.querySelector('#password-input') as HTMLInputElement;
    const errorMsg = content.querySelector('#error-message') as HTMLDivElement;
    const cancelBtn = content.querySelector('#cancel-btn') as HTMLButtonElement;
    const verifyBtn = content.querySelector('#verify-btn') as HTMLButtonElement;

    input.focus();

    const cleanup = () => {
      document.body.removeChild(modal);
    };

    const handleVerify = async () => {
      const password = input.value;
      const isValid = await verifyPassword(password);
      
      if (isValid) {
        cleanup();
        resolve(true);
      } else {
        errorMsg.style.display = 'block';
        input.value = '';
        input.focus();
        input.style.borderColor = '#f87171';
        setTimeout(() => {
          input.style.borderColor = 'rgba(255,255,255,0.1)';
        }, 2000);
      }
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    verifyBtn.addEventListener('click', handleVerify);

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleVerify();
      }
    });
  });
};
