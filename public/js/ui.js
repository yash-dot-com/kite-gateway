// UI Controller
class UI {
    static showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') {
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        } else {
            icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        }

        toast.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Trigger reflow to ensure transition happens
        void toast.offsetWidth;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static switchView(viewId) {
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(el => {
            if (el.dataset.target === viewId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Update view sections
        document.querySelectorAll('.view-section').forEach(el => {
            if (el.id === viewId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Update Title
        const titles = {
            'dashboard-view': 'Dashboard Overview',
            'routes-view': 'Gateway Routes',
            'logs-view': 'Request Logs',
            'ai-view': 'AI Ops Assistant'
        };
        document.getElementById('current-view-title').innerText = titles[viewId] || 'Dashboard';
    }

    static formatUptime(seconds) {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${Math.floor(seconds % 60)}s`;
    }

    static getMethodTagClass(method) {
        const m = method.toLowerCase();
        if (['get', 'post', 'put', 'delete'].includes(m)) {
            return `method-${m}`;
        }
        return '';
    }

    static getStatusBadgeClass(status) {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 400) return 'error';
        return '';
    }

    static formatTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
    }

    static escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
    
    // Markdown parser for AI responses using marked.js
    static parseMarkdown(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        // Fallback if marked fails to load
        let html = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return html.split('\n\n').map(p => `<p>${p}</p>`).join('');
    }
}

window.UI = UI;
