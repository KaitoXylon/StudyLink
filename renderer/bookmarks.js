/**
 * bookmarks.js — Bookmark System
 */

class BookmarkManager {
  constructor(pdfViewer) {
    this.pdfViewer = pdfViewer;
    this.bookmarks = []; // Array of { page, label, id }
    this.init();
  }

  init() {
    document.getElementById('btn-bookmark').addEventListener('click', () => {
      this.toggleBookmark();
    });
  }

  toggleBookmark() {
    const page = this.pdfViewer.getCurrentPage();
    const existing = this.bookmarks.findIndex(b => b.page === page);
    if (existing >= 0) {
      this.bookmarks.splice(existing, 1);
      showToast(`Bookmark removed from page ${page + 1}`);
    } else {
      const label = prompt(`Label for page ${page + 1} bookmark:`, `Page ${page + 1}`);
      if (label === null) return; // cancelled
      this.bookmarks.push({ page, label: label || `Page ${page + 1}`, id: Date.now() });
      showToast(`Bookmarked page ${page + 1} ✓`, 'success');
    }
    this.renderBookmarkList();
    this.updateThumbnailDots();
    if (window.appState) window.appState.scheduleAutoSave();
  }

  addBookmark(page, label) {
    if (this.bookmarks.findIndex(b => b.page === page) >= 0) return;
    this.bookmarks.push({ page, label, id: Date.now() });
    this.renderBookmarkList();
    this.updateThumbnailDots();
  }

  renderBookmarkList() {
    const list = document.getElementById('bookmark-list');
    list.innerHTML = '';

    if (this.bookmarks.length === 0) {
      list.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:12px;text-align:center">No bookmarks yet.<br><small>Press B on any page to bookmark it.</small></div>';
      return;
    }

    const sorted = [...this.bookmarks].sort((a, b) => a.page - b.page);
    sorted.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.innerHTML = `
        <span class="bookmark-page">P${bm.page + 1}</span>
        <span class="bookmark-label">${bm.label}</span>
        <span class="bookmark-del" title="Remove">✕</span>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('bookmark-del')) {
          this.bookmarks = this.bookmarks.filter(b => b.id !== bm.id);
          this.renderBookmarkList();
          this.updateThumbnailDots();
          if (window.appState) window.appState.scheduleAutoSave();
        } else {
          this.pdfViewer.scrollToPage(bm.page);
        }
      });
      list.appendChild(item);
    });
  }

  updateThumbnailDots() {
    // Remove all dots
    document.querySelectorAll('.thumb-bookmark-dot').forEach(d => d.remove());
    // Add dots for bookmarked pages
    this.bookmarks.forEach(bm => {
      const thumb = document.querySelector(`.thumb-item[data-page="${bm.page}"]`);
      if (thumb) {
        const dot = document.createElement('div');
        dot.className = 'thumb-bookmark-dot';
        thumb.appendChild(dot);
      }
    });
  }

  serialize() {
    return this.bookmarks;
  }

  deserialize(data) {
    this.bookmarks = data || [];
    this.renderBookmarkList();
  }
}

window.BookmarkManager = BookmarkManager;
