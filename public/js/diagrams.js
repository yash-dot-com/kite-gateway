// Render diagram fences from assistant responses using Pele, keeping source available.
window.KiteDiagrams = {
    async renderWithin(container) {
        if (document.fonts) await document.fonts.ready;
        const chat = container.closest('.ai-chat-area');
        const follow = chat && chat.scrollHeight - chat.scrollTop - chat.clientHeight < 48;
        const blocks = container.querySelectorAll('pre > code.language-mermaid, pre > code.language-pele');
        blocks.forEach((code, index) => {
            const pre = code.parentElement;
            const source = code.textContent.trim();
            const figure = document.createElement('figure');
            figure.className = 'ai-diagram';
            const caption = document.createElement('figcaption');
            caption.textContent = 'Gateway diagram';
            const canvas = document.createElement('div');
            canvas.className = 'ai-diagram-canvas';
            const error = document.createElement('p');
            error.className = 'ai-diagram-error';
            error.setAttribute('role', 'status');
            error.hidden = true;
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = 'Diagram source';
            const sourcePre = document.createElement('pre');
            const sourceCode = document.createElement('code');
            sourceCode.textContent = source;
            sourcePre.appendChild(sourceCode);
            details.append(summary, sourcePre);
            figure.append(caption, canvas, error, details);
            pre.replaceWith(figure);

            const showError = message => {
                error.textContent = `Diagram unavailable: ${message}`;
                error.hidden = false;
                details.open = true;
            };
            try {
                if (index >= 3) throw new Error('Only three diagrams can be displayed per response.');
                if (source.length > 12000) throw new Error('Please ask for a smaller diagram.');
                if (/^\s*---|%%\s*\{/.test(source)) throw new Error('Diagram configuration directives are not supported.');
                if (!window.pele) throw new Error('Pele could not load. The editable source is available below.');
                if (!['flowchart', 'sequence'].includes(window.pele.detectType(source))) {
                    throw new Error('Use a flowchart or sequence diagram.');
                }
                window.pele.mount(canvas, source, {
                    links: false,
                    images: false,
                    limit: 12000,
                    outputLimit: 1000000,
                    maxEdges: 80,
                    padding: 16,
                    onError: err => showError(err.message || 'The diagram syntax could not be rendered.')
                });
            } catch (err) {
                showError(err.message);
            }
        });
        if (follow) chat.scrollTop = chat.scrollHeight;
    }
};
