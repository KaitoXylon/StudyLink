/**
 * search.js — Full-text PDF Search
 */

class SearchManager {
  constructor(pdfViewer) {
    this.pdfViewer = pdfViewer;
    this.results = [];
    this.currentIndex = -1;
    this.init();
  }

  init() {
    const input = document.getElementById('search-input');
    const goBtn = document.getElementById('btn-search-go');
    const prevBtn = document.getElementById('btn-search-prev');
    const nextBtn = document.getElementById('btn-search-next');

    goBtn.addEventListener('click', () => this.search(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search(input.value);
    });
    prevBtn.addEventListener('click', () => this.navigate(-1));
    nextBtn.addEventListener('click', () => this.navigate(1));
  }

  async search(query) {
    if (!query.trim() || !this.pdfViewer.pdfDoc) {
      document.getElementById('search-results').innerHTML = '';
      document.getElementById('search-nav').style.display = 'none';
      return;
    }

    this.results = [];
    const pdfDoc = this.pdfViewer.pdfDoc;
    const lowerQuery = query.toLowerCase();

    const resultsEl = document.getElementById('search-results');
    resultsEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">Searching...</div>';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ');
      const lowerText = text.toLowerCase();

      let idx = 0;
      while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + query.length + 40);
        const snippet = text.slice(start, end);
        this.results.push({ page: i - 1, text: snippet, matchIdx: idx - start, query });
        idx += query.length;
      }
    }

    this.renderResults(query);
    if (this.results.length > 0) {
      this.currentIndex = 0;
      this.navigate(0);
    }
  }

  renderResults(query) {
    const resultsEl = document.getElementById('search-results');
    const navEl = document.getElementById('search-nav');
    const countEl = document.getElementById('search-count');

    if (this.results.length === 0) {
      resultsEl.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px">No results found.</div>';
      navEl.style.display = 'none';
      return;
    }

    navEl.style.display = 'flex';
    countEl.textContent = `${this.results.length} results`;

    resultsEl.innerHTML = '';
    this.results.forEach((result, i) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      const highlighted = this.highlightMatch(result.text, result.matchIdx, query.length);
      item.innerHTML = `
        <div class="sri-page">Page ${result.page + 1}</div>
        <div class="sri-text">...${highlighted}...</div>
      `;
      item.addEventListener('click', () => {
        this.currentIndex = i;
        this.pdfViewer.scrollToPage(result.page);
        this.updateHighlight();
      });
      resultsEl.appendChild(item);
    });
  }

  highlightMatch(text, matchIdx, matchLen) {
    const before = this.escapeHtml(text.slice(0, matchIdx));
    const match = this.escapeHtml(text.slice(matchIdx, matchIdx + matchLen));
    const after = this.escapeHtml(text.slice(matchIdx + matchLen));
    return `${before}<mark>${match}</mark>${after}`;
  }

  escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  navigate(dir) {
    if (this.results.length === 0) return;
    if (dir === 0) {
      // Stay at current
    } else {
      this.currentIndex = (this.currentIndex + dir + this.results.length) % this.results.length;
    }
    const result = this.results[this.currentIndex];
    this.pdfViewer.scrollToPage(result.page);
    this.updateHighlight();
    document.getElementById('search-count').textContent = `${this.currentIndex + 1} / ${this.results.length}`;
  }

  updateHighlight() {
    document.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.style.background = i === this.currentIndex ? 'var(--accent-dim)' : '';
      el.style.borderColor = i === this.currentIndex ? 'var(--accent-glow)' : '';
    });
  }
}

window.SearchManager = SearchManager;
