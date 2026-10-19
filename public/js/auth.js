document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authSuccess = document.getElementById('auth-success');
    const tokenDisplay = document.getElementById('token-display');
    const copyTokenBtn = document.getElementById('copy-token-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Tab Switching Logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = tab.dataset.target;
            forms.forEach(f => f.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Check if already authenticated
    function checkAuth() {
        const token = localStorage.getItem('kite_jwt');
        if (token) {
            showSuccessState(token);
        } else {
            showFormsState();
        }
    }

    function showSuccessState(token) {
        forms.forEach(f => f.classList.remove('active'));
        document.querySelector('.auth-tabs').style.display = 'none';
        authSuccess.classList.add('active');
        tokenDisplay.textContent = token;
    }

    function showFormsState() {
        authSuccess.classList.remove('active');
        document.querySelector('.auth-tabs').style.display = 'flex';
        // Reset to login tab
        document.querySelector('[data-target="login-form"]').click();
        loginForm.reset();
        signupForm.reset();
    }

    // Mock API Calls
    // (Using our regular api.post but pointing to the new endpoints)

    async function handleAuth(username, password, isSignup = false) {
        const endpoint = isSignup ? '/admin/auth/signup' : '/admin/auth/login';
        try {
            // Disable buttons during request
            const btns = document.querySelectorAll('button[type="submit"]');
            btns.forEach(b => { b.disabled = true; b.style.opacity = '0.7'; });

            const res = await api.post(endpoint, { username, password });
            
            if (res.token) {
                localStorage.setItem('kite_jwt', res.token);
                UI.showToast(isSignup ? 'Mock account created & Signed In!' : 'Signed in successfully!', 'success');
                showSuccessState(res.token);
            }
        } catch (err) {
            UI.showToast(err.message, 'error');
        } finally {
            const btns = document.querySelectorAll('button[type="submit"]');
            btns.forEach(b => { b.disabled = false; b.style.opacity = '1'; });
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value;
        if (!user || !pass) return;
        handleAuth(user, pass, false);
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('signup-username').value.trim();
        const pass = document.getElementById('signup-password').value;
        if (!user || !pass) return;
        handleAuth(user, pass, true);
    });

    // Copy Token
    copyTokenBtn.addEventListener('click', async () => {
        const token = tokenDisplay.textContent;
        if (!token) return;
        
        try {
            await navigator.clipboard.writeText(token);
            copyTokenBtn.textContent = 'Copied!';
            copyTokenBtn.style.background = 'rgba(16, 185, 129, 0.2)';
            copyTokenBtn.style.color = 'var(--status-green)';
            copyTokenBtn.style.borderColor = 'var(--status-green)';
            
            setTimeout(() => {
                copyTokenBtn.textContent = 'Copy';
                copyTokenBtn.style.background = 'transparent';
                copyTokenBtn.style.color = '';
                copyTokenBtn.style.borderColor = '';
            }, 2000);
        } catch (err) {
            UI.showToast('Failed to copy to clipboard', 'error');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('kite_jwt');
        showFormsState();
        UI.showToast('Signed out. Token cleared.', 'success');
    });

    // Init
    checkAuth();

});
