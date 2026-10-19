document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('playground-form');
    const gatewayInput = document.getElementById('playground-gateway');
    const routeSelect = document.getElementById('playground-route');
    const methodSelect = document.getElementById('playground-method');
    const pathInput = document.getElementById('playground-path');
    const countInput = document.getElementById('playground-count');
    const attachToken = document.getElementById('playground-attach-token');
    const tokenButton = document.getElementById('demo-token-btn');
    const sendButton = document.getElementById('playground-send');
    const allButton = document.getElementById('playground-run-all');
    const status = document.getElementById('playground-status');
    const output = document.getElementById('playground-output');
    let routes = [];
    let running = false;

    const gatewayUrl = new URL(window.location.origin);
    gatewayUrl.port = '3000';
    gatewayInput.value = gatewayUrl.origin;

    function savedToken() {
        try {
            return localStorage.getItem('kite_jwt');
        } catch (err) {
            return null;
        }
    }

    function updateTokenStatus() {
        document.getElementById('playground-token-status').textContent = savedToken()
            ? 'Saved token available. Generate a new one if expired.'
            : 'No saved token. Generate one for protected routes.';
    }

    function examplePath(route) {
        return route.path.replace(/:[^/]+/g, '123').replace(/\*/g, '123');
    }

    function updateBodyVisibility() {
        document.getElementById('playground-body-group').hidden = ['GET', 'HEAD'].includes(methodSelect.value);
    }

    function selectRoute() {
        const route = routes.find(item => String(item.id) === routeSelect.value);
        methodSelect.replaceChildren();
        if (!route) return;
        route.methods.forEach(method => methodSelect.add(new Option(method, method)));
        pathInput.value = examplePath(route);
        document.getElementById('playground-route-info').textContent =
            `${route.target} · ${route.authRequired ? 'Token required' : 'Public route'}`;
        updateBodyVisibility();
    }

    async function loadRoutes() {
        if (running) return;
        try {
            const selected = routeSelect.value;
            routes = await api.getRoutes();
            routeSelect.replaceChildren();
            routes.forEach(route => routeSelect.add(new Option(route.path, String(route.id))));
            if (routes.some(route => String(route.id) === selected)) routeSelect.value = selected;
            selectRoute();
            sendButton.disabled = routes.length === 0;
            allButton.disabled = !routes.some(route => route.methods.includes('GET'));
            if (!routes.length) status.textContent = 'No routes configured. Add a route in Routes, then refresh.';
        } catch (err) {
            status.textContent = `Could not load routes: ${err.message}. Use Refresh to retry.`;
            sendButton.disabled = true;
            allButton.disabled = true;
        }
    }

    async function loadActivity() {
        try {
            const logs = await api.getLogs(8);
            const tbody = document.getElementById('playground-logs');
            tbody.replaceChildren();
            logs.forEach(log => {
                const row = document.createElement('tr');
                [UI.formatTime(log.timestamp), log.method, log.path, log.statusCode, log.responseTimeMs].forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                });
                tbody.appendChild(row);
            });
            if (!logs.length) tbody.innerHTML = '<tr><td colspan="5">Send a request to see gateway activity.</td></tr>';
        } catch (err) {
            document.getElementById('playground-logs').innerHTML = '<tr><td colspan="5">Activity unavailable. Use Refresh to retry.</td></tr>';
        }
    }

    tokenButton.addEventListener('click', async () => {
        tokenButton.disabled = true;
        try {
            const result = await api.post('/admin/jwt/sign', { sub: 'demo-developer' });
            localStorage.setItem('kite_jwt', result.token);
            updateTokenStatus();
            UI.showToast('Demo token ready');
        } catch (err) {
            UI.showToast(`Could not save demo token: ${err.message}`, 'error');
        } finally {
            tokenButton.disabled = false;
        }
    });

    async function runRequests(allRoutes) {
        if (running || !form.reportValidity()) return;
        let baseUrl;
        let body;
        const repeat = Number(countInput.value);
        const jobs = allRoutes
            ? routes.filter(route => route.methods.includes('GET')).map(route => ({ method: 'GET', path: examplePath(route) }))
            : [{ method: methodSelect.value, path: pathInput.value.trim() }];
        try {
            baseUrl = new URL(gatewayInput.value);
            if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
                throw new Error('Use an HTTP or HTTPS gateway URL without credentials.');
            }
            if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) throw new Error('Choose 1–10 requests per route.');
            if (!jobs.length) throw new Error('No GET routes available.');
            if (jobs.length * repeat > 50) throw new Error('Keep each run to 50 requests or fewer.');
            jobs.forEach(job => {
                if (!job.path.startsWith('/') || job.path.startsWith('//') || new URL(job.path, baseUrl).origin !== baseUrl.origin) {
                    throw new Error('Use a request path on this gateway, starting with a single /.');
                }
            });
            if (!allRoutes && !['GET', 'HEAD'].includes(methodSelect.value)) {
                body = JSON.stringify(JSON.parse(document.getElementById('playground-body').value));
            }
        } catch (err) {
            UI.showToast(err.message, 'error');
            return;
        }

        running = true;
        sendButton.disabled = true;
        allButton.disabled = true;
        output.replaceChildren();
        let completed = 0;
        let succeeded = 0;
        const total = jobs.length * repeat;
        const token = attachToken.checked ? savedToken() : null;
        try {
            for (let round = 0; round < repeat; round++) {
                for (const job of jobs) {
                    status.textContent = `Sending ${completed + 1} of ${total}: ${job.method} ${job.path}`;
                    const headers = {};
                    if (token) headers.Authorization = `Bearer ${token}`;
                    if (body !== undefined) headers['Content-Type'] = 'application/json';
                    const started = performance.now();
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 35000);
                    let summary;
                    let responseBody;
                    let ok = false;
                    try {
                        const response = await fetch(new URL(job.path, baseUrl), {
                            method: job.method, headers, body, signal: controller.signal, redirect: 'error'
                        });
                        responseBody = await response.text();
                        try { responseBody = JSON.stringify(JSON.parse(responseBody), null, 2); } catch (err) {}
                        ok = response.ok;
                        if (ok) succeeded++;
                        summary = `${response.status} ${response.statusText}`;
                    } catch (err) {
                        summary = 'Network error';
                        responseBody = `${err.message}. Check the gateway URL and make sure the demo services are running.`;
                    } finally {
                        clearTimeout(timeout);
                    }
                    const details = document.createElement('details');
                    details.className = 'playground-response';
                    details.open = total === 1;
                    const heading = document.createElement('summary');
                    const badge = document.createElement('span');
                    badge.className = `status-badge ${ok ? 'success' : 'error'}`;
                    badge.textContent = summary;
                    heading.append(badge, document.createTextNode(` ${job.method} ${job.path} · ${Math.round(performance.now() - started)} ms`));
                    const pre = document.createElement('pre');
                    pre.textContent = responseBody;
                    details.append(heading, pre);
                    output.appendChild(details);
                    completed++;
                    document.dispatchEvent(new Event('kite:request-complete'));
                    await loadActivity();
                }
            }
            status.textContent = `Complete: ${completed} requests · ${succeeded} succeeded · ${completed - succeeded} failed. Counters and activity refreshed.`;
        } finally {
            running = false;
            sendButton.disabled = !routes.length;
            allButton.disabled = !routes.some(route => route.methods.includes('GET'));
        }
    }

    form.addEventListener('submit', event => { event.preventDefault(); runRequests(false); });
    allButton.addEventListener('click', () => runRequests(true));
    routeSelect.addEventListener('change', selectRoute);
    methodSelect.addEventListener('change', updateBodyVisibility);
    document.addEventListener('kite:refresh-playground', () => { loadRoutes(); loadActivity(); updateTokenStatus(); });
    window.addEventListener('storage', updateTokenStatus);
    updateTokenStatus();
    loadRoutes();
    loadActivity();
});
