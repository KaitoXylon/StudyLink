/**
 * flashcard.js — Free-form Flashcard System
 */

class FlashcardManager {
  constructor(pdfViewer) {
    this.pdfViewer = pdfViewer;
    this.cards = [];
    this.editingId = null;
    this.init();
  }

  init() {
    document.getElementById('btn-new-card').addEventListener('click', () => this.openEditor());
    document.getElementById('btn-save-fc').addEventListener('click', () => this.saveCard());
    document.getElementById('btn-delete-fc').addEventListener('click', () => this.deleteCard());
    document.getElementById('btn-close-fc').addEventListener('click', () => this.closeEditor());
    document.getElementById('flashcard-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('flashcard-modal')) this.closeEditor();
    });
  }

  openEditor(card = null) {
    this.editingId = card ? card.id : null;
    const modal = document.getElementById('flashcard-modal');
    const titleEl = document.getElementById('flashcard-modal-title');
    const delBtn = document.getElementById('btn-delete-fc');

    titleEl.textContent = card ? 'Edit Flashcard' : 'New Flashcard';
    document.getElementById('fc-question').value = card ? card.question : '';
    document.getElementById('fc-answer').value = card ? card.answer : '';
    document.getElementById('fc-page').value = card ? (card.page !== null ? card.page + 1 : '') : (this.pdfViewer.getCurrentPage() + 1);
    document.getElementById('fc-tag').value = card ? (card.tag || '') : '';
    delBtn.style.display = card ? 'block' : 'none';

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('fc-question').focus(), 100);
  }

  closeEditor() {
    document.getElementById('flashcard-modal').classList.add('hidden');
    this.editingId = null;
  }

  saveCard() {
    const question = document.getElementById('fc-question').value.trim();
    const answer = document.getElementById('fc-answer').value.trim();
    const pageVal = document.getElementById('fc-page').value;
    const tag = document.getElementById('fc-tag').value.trim();

    if (!question) { showToast('Please enter a question', 'error'); return; }

    const page = pageVal ? parseInt(pageVal) - 1 : null;

    if (this.editingId) {
      const card = this.cards.find(c => c.id === this.editingId);
      if (card) { card.question = question; card.answer = answer; card.page = page; card.tag = tag; }
    } else {
      this.cards.push({ id: Date.now(), question, answer, page, tag, created: new Date().toISOString() });
    }

    this.closeEditor();
    this.renderCards();
    showToast('Flashcard saved ✓', 'success');
    if (window.appState) window.appState.scheduleAutoSave();
  }

  deleteCard() {
    if (!this.editingId) return;
    this.cards = this.cards.filter(c => c.id !== this.editingId);
    this.closeEditor();
    this.renderCards();
    showToast('Flashcard deleted');
    if (window.appState) window.appState.scheduleAutoSave();
  }

  renderCards() {
    const list = document.getElementById('flashcard-list');
    list.innerHTML = '';

    if (this.cards.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:16px">No flashcards yet.<br><small>Click + to create your first card.</small></div>';
      return;
    }

    this.cards.forEach(card => {
      const item = document.createElement('div');
      item.className = 'flashcard-item';
      item.innerHTML = `
        ${card.tag ? `<div class="fc-item-tag">${card.tag}</div>` : ''}
        <div class="fc-item-question">${card.question}</div>
        <div class="fc-item-answer">${card.answer}</div>
        <button class="fc-reveal-btn">Reveal answer ▾</button>
        ${card.page !== null ? `<div class="fc-item-page">📄 Page ${card.page + 1}</div>` : ''}
      `;

      const revealBtn = item.querySelector('.fc-reveal-btn');
      const answerEl = item.querySelector('.fc-item-answer');
      revealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const revealed = answerEl.classList.toggle('revealed');
        revealBtn.textContent = revealed ? 'Hide answer ▴' : 'Reveal answer ▾';
      });

      item.addEventListener('click', (e) => {
        if (e.target === revealBtn) return;
        this.openEditor(card);
      });

      if (card.page !== null) {
        item.querySelector('.fc-item-page')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.pdfViewer.scrollToPage(card.page);
        });
      }

      list.appendChild(item);
    });
  }

  serialize() { return this.cards; }
  deserialize(data) { this.cards = data || []; this.renderCards(); }
}

window.FlashcardManager = FlashcardManager;
