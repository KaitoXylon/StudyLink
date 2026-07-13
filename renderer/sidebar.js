/**
 * sidebar.js — File Manager & Page Thumbnail Sidebar
 */

class Sidebar {
  constructor(pdfViewer, appState) {
    this.pdfViewer = pdfViewer;
    this.appState = appState;
    this.openFiles = []; // Array of { name, path, base64 }
    this.activeFileIndex = -1;
    this.init();
  }

  init() {
    // Tab switching
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Open sidebar button
    document.getElementById('btn-open-sidebar').addEventListener('click', () => {
      this.appState.openFile();
    });

    // Add/delete page buttons in sidebar
    document.getElementById('btn-add-page-sidebar').addEventListener('click', () => {
      this.appState.showInsertPageModal();
    });

    document.getElementById('btn-del-page-sidebar').addEventListener('click', () => {
      const page = this.pdfViewer.getCurrentPage();
      if (confirm(`Delete page ${page + 1}?`)) {
        this.pdfViewer.deletePage(page);
      }
    });

    // Drop zone
    const dropZone = document.getElementById('drop-zone');
    const body = document.body;

    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    body.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget || !body.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });

    body.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.pdf'));
      for (const file of files) {
        await this.appState.openFileFromPath(file.path);
      }
    });
  }

  switchTab(tab) {
    document.querySelectorAll('.sidebar-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.sidebar-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${tab}`);
    });
  }

  addFile(name, path, base64) {
    // Check for duplicate
    const exists = this.openFiles.findIndex(f => f.path === path);
    if (exists >= 0) {
      this.setActiveFile(exists);
      return;
    }
    this.openFiles.push({ name, path, base64 });
    this.setActiveFile(this.openFiles.length - 1);
    this.renderFileList();
    this.appState.saveSettings();
  }

  setActiveFile(index) {
    this.activeFileIndex = index;
    this.renderFileList();
  }

  renderFileList() {
    const list = document.getElementById('file-list');
    const dropZone = document.getElementById('drop-zone');
    list.innerHTML = '';

    if (this.openFiles.length === 0) {
      dropZone.style.display = 'block';
      return;
    }
    dropZone.style.display = this.openFiles.length === 0 ? 'block' : 'none';

    this.openFiles.forEach((file, i) => {
      const item = document.createElement('div');
      item.className = `file-item ${i === this.activeFileIndex ? 'active' : ''}`;
      item.innerHTML = `
        <div class="file-item-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <div class="file-item-info">
          <div class="file-item-name">${file.name}</div>
          <div class="file-item-path">${file.path}</div>
        </div>
        <div class="file-item-close" title="Close">✕</div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('file-item-close')) {
          this.closeFile(i);
        } else {
          this.switchToFile(i);
        }
      });

      list.appendChild(item);
    });
  }

  async switchToFile(index) {
    this.activeFileIndex = index;
    this.renderFileList();
    const file = this.openFiles[index];
    await this.appState.loadPDF(file.path, file.base64, false);
    this.appState.saveSettings();
  }

  closeFile(index) {
    this.openFiles.splice(index, 1);
    if (this.activeFileIndex >= this.openFiles.length) {
      this.activeFileIndex = this.openFiles.length - 1;
    }
    this.renderFileList();
    if (this.openFiles.length > 0) {
      this.switchToFile(this.activeFileIndex);
    } else {
      // Show welcome screen
      document.getElementById('welcome-screen').style.display = 'flex';
      document.getElementById('pdf-viewport').style.display = 'none';
      this.appState.saveSettings();
    }
  }

  getCurrentFile() {
    return this.activeFileIndex >= 0 ? this.openFiles[this.activeFileIndex] : null;
  }
}

window.Sidebar = Sidebar;
