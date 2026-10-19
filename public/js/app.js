// Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // ── Navigation ──────────────────────────────────────────────
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            UI.switchView(item.dataset.target);
            if (item.dataset.target === 'routes-view') loadRoutes();
            else if (item.dataset.target === 'logs-view') loadLogs();
            else if (item.dataset.target === 'dashboard-view') loadDashboard();
            else if (item.dataset.target === 'playground-view') document.dispatchEvent(new Event('kite:refresh-playground'));
        });
    });

    document.getElementById('refresh-btn').addEventListener('click', () => {
        const activeView = document.querySelector('.view-section.active').id;
        if (activeView === 'routes-view') loadRoutes();
        else if (activeView === 'logs-view') loadLogs();
        else loadDashboard();
        document.dispatchEvent(new Event('kite:refresh-playground'));
        UI.showToast('Data refreshed');
    });

    // ── Global State ────────────────────────────────────────────
    let currentRoutes = [];

    // ── Dashboard Data ──────────────────────────────────────────
    async function loadDashboard() {
        try {
            const [health, metrics] = await Promise.all([
                api.getHealth(),
                api.getMetrics()
            ]);

            // Update top cards
            document.getElementById('dash-total-req').innerText = health.totalRequests.toLocaleString();
            document.getElementById('dash-total-routes').innerText = health.routes;
            document.getElementById('dash-uptime').innerText = UI.formatUptime(health.uptime);
            
            // Calc global avg time from metrics
            if (metrics && metrics.length > 0) {
                const totalTime = metrics.reduce((sum, m) => sum + (m.avgResponseTimeMs * m.totalRequests), 0);
                const totalReq = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
                const avg = totalReq > 0 ? (totalTime / totalReq).toFixed(1) : 0;
                document.getElementById('dash-avg-time').innerHTML = `${avg} <span class="unit">ms</span>`;
            }

            // Populate Metrics Table
            const tbody = document.querySelector('#dashboard-metrics-table tbody');
            tbody.innerHTML = '';
            
            // Group by route
            const routeMetrics = {};
            metrics.forEach(m => {
                if (!routeMetrics[m.routePath]) {
                    routeMetrics[m.routePath] = { req: 0, succ: 0, err: 0, time: 0, p95: 0, count: 0 };
                }
                routeMetrics[m.routePath].req += m.totalRequests;
                routeMetrics[m.routePath].succ += m.successCount;
                routeMetrics[m.routePath].err += m.errorCount;
                routeMetrics[m.routePath].time += m.avgResponseTimeMs;
                routeMetrics[m.routePath].p95 = Math.max(routeMetrics[m.routePath].p95, m.p95ResponseTimeMs);
                routeMetrics[m.routePath].count++;
            });

            for (const [route, m] of Object.entries(routeMetrics)) {
                const tr = document.createElement('tr');
                const successRate = m.req > 0 ? ((m.succ / m.req) * 100).toFixed(1) : 100;
                const avgTime = (m.time / m.count).toFixed(1);
                
                tr.innerHTML = `
                    <td><strong>${UI.escapeHtml(route)}</strong></td>
                    <td>${m.req.toLocaleString()}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;height:4px;background:var(--bg-prompt);border-radius:2px;overflow:hidden;">
                                <div style="height:100%;width:${successRate}%;background:var(--status-green);"></div>
                            </div>
                            <span style="font-size:0.8rem;color:var(--text-secondary)">${successRate}%</span>
                        </div>
                    </td>
                    <td>${avgTime} ms</td>
                    <td>${m.p95} ms</td>
                `;
                tbody.appendChild(tr);
            }

        } catch (err) {
            UI.showToast('Failed to load dashboard', 'error');
        }
    }

    // ── Routes Management ───────────────────────────────────────
    const routeModal = document.getElementById('route-modal');
    const routeForm = document.getElementById('route-form');

    document.getElementById('add-route-btn').addEventListener('click', () => {
        routeForm.reset();
        document.getElementById('route-id').value = '';
        document.getElementById('modal-title').innerText = 'Add New Route';
        routeModal.classList.add('active');
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        routeModal.classList.remove('active');
    });
    document.getElementById('cancel-modal-btn').addEventListener('click', () => {
        routeModal.classList.remove('active');
    });

    async function loadRoutes() {
        try {
            currentRoutes = await api.getRoutes();
            renderRoutesTable();
        } catch (err) {
            UI.showToast('Failed to load routes', 'error');
        }
    }

    function renderRoutesTable() {
        const tbody = document.querySelector('#routes-table tbody');
        tbody.innerHTML = '';
        
        currentRoutes.forEach(route => {
            const tr = document.createElement('tr');
            
            const methodsHtml = route.methods.map(m => 
                `<span class="tag ${UI.getMethodTagClass(m)}">${m}</span>`
            ).join(' ');

            tr.innerHTML = `
                <td><strong>${UI.escapeHtml(route.path)}</strong></td>
                <td><span style="color:var(--text-secondary)">${UI.escapeHtml(route.target)}</span></td>
                <td>${methodsHtml}</td>
                <td>${route.authRequired ? '<span class="status-badge error">Required</span>' : '<span class="status-badge success">None</span>'}</td>
                <td>${route.rateLimit} <span style="font-size:0.8rem;color:var(--text-muted)">/min</span></td>
                <td>
                    <button class="btn btn-sm btn-outline edit-route-btn" data-id="${route.id}">Edit</button>
                    <button class="btn btn-sm btn-danger del-route-btn" data-id="${route.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach listeners
        document.querySelectorAll('.edit-route-btn').forEach(btn => {
            btn.addEventListener('click', (e) => editRoute(parseInt(e.target.dataset.id)));
        });
        document.querySelectorAll('.del-route-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteRoute(parseInt(e.target.dataset.id)));
        });
    }

    function editRoute(id) {
        const route = currentRoutes.find(r => r.id === id);
        if (!route) return;

        document.getElementById('route-id').value = route.id;
        document.getElementById('route-path').value = route.path;
        document.getElementById('route-target').value = route.target;
        document.getElementById('route-auth').value = route.authRequired.toString();
        document.getElementById('route-ratelimit').value = route.rateLimit;
        document.getElementById('route-strip').value = route.stripPrefix || '';

        // Checkboxes
        document.querySelectorAll('input[name="methods"]').forEach(cb => {
            cb.checked = route.methods.includes(cb.value);
        });

        document.getElementById('modal-title').innerText = 'Edit Route';
        routeModal.classList.add('active');
    }

    async function deleteRoute(id) {
        if (!confirm('Are you sure you want to delete this route?')) return;
        try {
            await api.deleteRoute(id);
            UI.showToast('Route deleted');
            loadRoutes();
        } catch (err) {
            UI.showToast(err.message, 'error');
        }
    }

    routeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('route-id').value;
        const methods = Array.from(document.querySelectorAll('input[name="methods"]:checked')).map(cb => cb.value);
        
        if (methods.length === 0) {
            UI.showToast('Select at least one method', 'error');
            return;
        }

        const data = {
            path: document.getElementById('route-path').value,
            target: document.getElementById('route-target').value,
            methods: methods,
            authRequired: document.getElementById('route-auth').value === 'true',
            rateLimit: parseInt(document.getElementById('route-ratelimit').value, 10),
        };
        
        const strip = document.getElementById('route-strip').value;
        if (strip) data.stripPrefix = strip;

        try {
            if (id) {
                await api.updateRoute(id, data);
                UI.showToast('Route updated');
            } else {
                await api.createRoute(data);
                UI.showToast('Route created');
            }
            routeModal.classList.remove('active');
            loadRoutes();
        } catch (err) {
            UI.showToast(err.message, 'error');
        }
    });

    // ── Logs Data ───────────────────────────────────────────────
    const logStatusFilter = document.getElementById('log-status-filter');
    let logsRequestId = 0;
    logStatusFilter.addEventListener('change', loadLogs);

    async function loadLogs() {
        const requestId = ++logsRequestId;
        const query = new URLSearchParams({ limit: '50' });
        if (logStatusFilter.value) query.set('status', logStatusFilter.value);
        try {
            const logs = await api.get(`/admin/logs?${query}`);
            if (requestId !== logsRequestId) return;
            const tbody = document.querySelector('#logs-table tbody');
            tbody.innerHTML = '';

            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6">${logStatusFilter.value ? 'No logs match the selected status range.' : 'No request logs yet.'}</td></tr>`;
            }
            
            logs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="color:var(--text-secondary);font-size:0.85rem">${UI.formatTime(log.timestamp)}</td>
                    <td><span class="tag ${UI.getMethodTagClass(log.method)}">${log.method}</span></td>
                    <td>${UI.escapeHtml(log.path)}</td>
                    <td><span class="status-badge ${UI.getStatusBadgeClass(log.statusCode)}">${log.statusCode}</span></td>
                    <td>${log.responseTimeMs}</td>
                    <td style="font-family:monospace;font-size:0.85rem;color:var(--text-muted)">${log.clientIp}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error("Failed to load logs", err);
        }
    }

    // ── AI Ops Assistant ────────────────────────────────────────
    const aiChatBox = document.getElementById('ai-chat-box');
    const aiChatForm = document.getElementById('ai-chat-form');
    const aiInput = document.getElementById('ai-prompt-input');

    function addMessage(text, isUser = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${isUser ? 'user-msg' : 'system-msg'}`;
        
        const avatarSvg = isUser 
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 12L12 22L22 12L12 2Z" fill="currentColor"/></svg>';

        const content = isUser ? `<p>${UI.escapeHtml(text)}</p>` : UI.parseMarkdown(text);

        msgDiv.innerHTML = `
            <div class="msg-avatar">${avatarSvg}</div>
            <div class="msg-bubble">${content}</div>
        `;
        
        aiChatBox.appendChild(msgDiv);
        aiChatBox.scrollTop = aiChatBox.scrollHeight;
        if (!isUser) window.KiteDiagrams.renderWithin(msgDiv).catch(err => console.error('Diagram rendering failed', err));
    }

    aiChatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = aiInput.value.trim();
        if (!msg) return;

        addMessage(msg, true);
        aiInput.value = '';
        aiInput.disabled = true;
        
        // loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message system-msg';
        loadingDiv.id = 'ai-loading';
        loadingDiv.innerHTML = `
            <div class="msg-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 12L12 22L22 12L12 2Z" fill="currentColor"/></svg></div>
            <div class="msg-bubble" style="opacity:0.7;display:flex;gap:4px;align-items:center;">
                <span style="animation: pulse 1s infinite;">●</span>
                <span style="animation: pulse 1s infinite 0.2s;">●</span>
                <span style="animation: pulse 1s infinite 0.4s;">●</span>
            </div>
        `;
        aiChatBox.appendChild(loadingDiv);
        aiChatBox.scrollTop = aiChatBox.scrollHeight;

        try {
            const res = await api.askAI(msg);
            document.getElementById('ai-loading').remove();
            addMessage(res.answer);
        } catch (err) {
            document.getElementById('ai-loading').remove();
            addMessage(`*Error:* Failed to get response from AI. Check API Key or logs. (${err.message})`);
        } finally {
            aiInput.disabled = false;
            aiInput.focus();
        }
    });

    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            aiInput.value = btn.innerText;
            aiChatForm.dispatchEvent(new Event('submit'));
        });
    });

    // Start with dashboard
    loadDashboard();

    document.addEventListener('kite:request-complete', () => {
        loadDashboard();
        loadLogs();
    });
    
    // Auto refresh logs if in view
    setInterval(() => {
        if (document.getElementById('logs-view').classList.contains('active')) {
            loadLogs();
        }
        if (document.getElementById('dashboard-view').classList.contains('active')) {
            loadDashboard();
        }
    }, 5000);
});
