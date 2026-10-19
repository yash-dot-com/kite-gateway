// Apply the saved theme before the page paints. Light is the default.
(() => {
    const root = document.documentElement;
    const storageKey = 'kite_theme';

    function applyTheme(theme) {
        root.dataset.theme = theme === 'dark' ? 'dark' : 'light';
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            const isDark = root.dataset.theme === 'dark';
            button.setAttribute('aria-pressed', String(isDark));
            button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
            button.querySelector('[data-theme-label]').textContent = isDark ? 'Light mode' : 'Dark mode';
        });
    }

    let savedTheme;
    try {
        savedTheme = localStorage.getItem(storageKey);
    } catch (err) {
        // Theme switching still works when browser storage is unavailable.
    }
    applyTheme(savedTheme);

    document.addEventListener('DOMContentLoaded', () => {
        applyTheme(root.dataset.theme);
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
                try {
                    localStorage.setItem(storageKey, root.dataset.theme);
                } catch (err) {}
            });
        });
    });

    window.addEventListener('storage', event => {
        if (event.key === storageKey || event.key === null) applyTheme(event.newValue);
    });
})();
