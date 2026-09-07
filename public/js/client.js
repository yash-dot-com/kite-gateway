document.addEventListener('DOMContentLoaded', () => {

    const authStatusContainer = document.getElementById('auth-status-container');
    const loginSection = document.getElementById('login-section');
    const loginForm = document.getElementById('client-login-form');
    
    const reqEndpoint = document.getElementById('req-endpoint');
    const reqMethod = document.getElementById('req-method');
    const reqAttachToken = document.getElementById('req-attach-token');
    const sendReqBtn = document.getElementById('send-req-btn');
    
    const resOutput = document.getElementById('res-output');
    const resStatusBadge = document.getElementById('res-status-badge');

    // ── Authentication Management ────────────────────────────────

    function updateAuthUI() {
        const token = localStorage.getItem('kite_jwt');
        if (token) {
            // Very naive JWT decode just to get username (sub)
            let username = 'User';
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                username = payload.sub || 'User';
            } catch(e) {}

            authStatusContainer.innerHTML = `
                <div class="auth-badge">
                    <span class="username">Logged in as ${username}</span>
                    <button class="btn btn-sm btn-danger" id="client-logout-btn">Log Out</button>
                </div>
            `;
            loginSection.style.display = 'none';
            document.getElementById('client-logout-btn').addEventListener('click', () => {
                localStorage.removeItem('kite_jwt');
                updateAuthUI();
                UI.showToast('Logged out');
            });
        } else {
            authStatusContainer.innerHTML = `<span style="color:var(--text-muted);font-size:0.9rem;">Not Logged In</span>`;
            loginSection.style.display = 'block';
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('login-user').value.trim();
        const pass = document.getElementById('login-pass').value;
        if (!user || !pass) return;

        try {
            // Hit the admin auth endpoint to get a token
            const res = await api.post('/admin/auth/login', { username: user, password: pass });
            if (res.token) {
                localStorage.setItem('kite_jwt', res.token);
                updateAuthUI();
                UI.showToast('Logged in successfully', 'success');
                loginForm.reset();
            }
        } catch (err) {
            UI.showToast(err.message, 'error');
        }
    });

    // ── Request Execution ──────────────────────────────────────

    // Function to highlight JSON
    function syntaxHighlight(json) {
        if (typeof json != 'string') {
            json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    sendReqBtn.addEventListener('click', async () => {
        const endpoint = reqEndpoint.value;
        const method = reqMethod.value;
        const attachToken = reqAttachToken.value === 'yes';
        const token = localStorage.getItem('kite_jwt');

        // We make the request to the Gateway port 3000!
        // We use the full URL since we are currently on the admin port 3001
        const targetUrl = `http://localhost:3000${endpoint}`;

        resOutput.innerHTML = `Sending ${method} request to ${targetUrl}...`;
        resStatusBadge.style.display = 'none';

        const headers = {
            'Content-Type': 'application/json'
        };

        if (attachToken && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers
        };

        if (method === 'POST') {
            options.body = JSON.stringify({ clientData: "Hello from client demo UI" });
        }

        const startTime = Date.now();

        try {
            const response = await fetch(targetUrl, options);
            const endTime = Date.now();
            const timeMs = endTime - startTime;

            // Handle status badge
            resStatusBadge.style.display = 'block';
            resStatusBadge.textContent = `${response.status} ${response.statusText} (${timeMs}ms)`;
            
            resStatusBadge.className = 'status-badge';
            if (response.status >= 200 && response.status < 300) resStatusBadge.classList.add('status-2xx');
            else if (response.status >= 400 && response.status < 500) resStatusBadge.classList.add('status-4xx');
            else resStatusBadge.classList.add('status-5xx');

            // Handle Body
            const contentType = response.headers.get('content-type');
            let bodyText = await response.text();

            if (contentType && contentType.includes('application/json')) {
                try {
                    const jsonObj = JSON.parse(bodyText);
                    resOutput.innerHTML = syntaxHighlight(jsonObj);
                } catch(e) {
                    resOutput.textContent = bodyText;
                }
            } else {
                resOutput.textContent = bodyText;
            }

        } catch (err) {
            resStatusBadge.style.display = 'block';
            resStatusBadge.textContent = `Fetch Error`;
            resStatusBadge.className = 'status-badge status-5xx';
            resOutput.textContent = String(err);
        }
    });

    // Initialize
    updateAuthUI();
});
