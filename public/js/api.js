// API Interactor
class KiteAPI {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    async get(path) {
        try {
            const res = await fetch(`${this.baseUrl}${path}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`GET ${path} failed:`, err);
            throw err;
        }
    }

    async post(path, data) {
        try {
            const res = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            return json;
        } catch (err) {
            console.error(`POST ${path} failed:`, err);
            throw err;
        }
    }

    async put(path, data) {
        try {
            const res = await fetch(`${this.baseUrl}${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
            return json;
        } catch (err) {
            console.error(`PUT ${path} failed:`, err);
            throw err;
        }
    }

    async delete(path) {
        try {
            const res = await fetch(`${this.baseUrl}${path}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return true;
        } catch (err) {
            console.error(`DELETE ${path} failed:`, err);
            throw err;
        }
    }

    // specific endpoints
    getHealth() { return this.get('/admin/health'); }
    getRoutes() { return this.get('/admin/routes'); }
    createRoute(route) { return this.post('/admin/routes', route); }
    updateRoute(id, route) { return this.put(`/admin/routes/${id}`, route); }
    deleteRoute(id) { return this.delete(`/admin/routes/${id}`); }
    getLogs(limit = 50) { return this.get(`/admin/logs?limit=${limit}`); }
    getMetrics() { return this.get('/admin/metrics'); }
    askAI(message) { return this.post('/ai/chat', { message }); }
}

window.api = new KiteAPI();
