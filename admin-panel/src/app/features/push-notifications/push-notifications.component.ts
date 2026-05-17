import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface Customer { id: number; name: string; phone: string; }

@Component({
  selector: 'app-push-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-wrap">
      <h2 class="page-title">📲 Push Notifications</h2>
      <p class="page-sub">Send targeted messages directly to a user's app or broadcast to everyone.</p>

      <!-- ── TARGET SELECTOR ── -->
      <div class="card">
        <div class="target-tabs">
          <button class="tab-btn" [class.active]="target === 'all'" (click)="target = 'all'; selectedUser = null">
            📢 All Customers
          </button>
          <button class="tab-btn" [class.active]="target === 'user'" (click)="target = 'user'">
            👤 Specific User
          </button>
        </div>

        <!-- User search (shown only for specific user mode) -->
        <div class="user-search-wrap" *ngIf="target === 'user'">
          <input class="search-input" type="text" [(ngModel)]="searchTerm"
            (input)="filterUsers()" placeholder="Search by name or phone...">

          <div class="user-list" *ngIf="filteredUsers.length > 0 && !selectedUser">
            <div class="user-row" *ngFor="let u of filteredUsers" (click)="selectUser(u)">
              <span class="user-avatar">👤</span>
              <div>
                <div class="user-name">{{ u.name || 'No name' }}</div>
                <div class="user-phone">{{ u.phone }}</div>
              </div>
            </div>
          </div>

          <div class="selected-user" *ngIf="selectedUser">
            <span class="sel-check">✓</span>
            <div>
              <strong>{{ selectedUser.name || 'No name' }}</strong>
              <span class="sel-phone">{{ selectedUser.phone }}</span>
            </div>
            <button class="clear-btn" (click)="selectedUser = null; searchTerm = ''">✕</button>
          </div>

          <div class="no-users" *ngIf="filteredUsers.length === 0 && searchTerm.length > 1 && !selectedUser">
            No customers found for "{{ searchTerm }}"
          </div>
        </div>
      </div>

      <!-- ── MESSAGE COMPOSE ── -->
      <div class="card">
        <label class="field-label">Notification Title <span class="req">*</span></label>
        <input class="field-input" type="text" [(ngModel)]="notifTitle" maxlength="80"
          placeholder="e.g. Special Offer Today! 🎉">
        <div class="char-count">{{ notifTitle.length }}/80</div>

        <label class="field-label" style="margin-top:14px;">Message <span class="req">*</span></label>
        <textarea class="field-textarea" [(ngModel)]="notifBody" maxlength="200" rows="3"
          placeholder="e.g. Get 20% off on all orders above ₹299 today only!"></textarea>
        <div class="char-count">{{ notifBody.length }}/200</div>

        <!-- Preview -->
        <div class="preview-box" *ngIf="notifTitle || notifBody">
          <div class="preview-label">Preview</div>
          <div class="preview-notif">
            <div class="preview-app">OrderKro</div>
            <div class="preview-title">{{ notifTitle || '(title)' }}</div>
            <div class="preview-body">{{ notifBody || '(message)' }}</div>
          </div>
        </div>

        <div class="error-msg" *ngIf="errorMsg">⚠️ {{ errorMsg }}</div>
        <div class="success-msg" *ngIf="successMsg">✅ {{ successMsg }}</div>

        <button class="send-btn" (click)="send()"
          [disabled]="sending || !notifTitle.trim() || !notifBody.trim() || (target === 'user' && !selectedUser)">
          {{ sending ? 'Sending...' : (target === 'all' ? '📢 Send to All Customers' : '📲 Send to ' + (selectedUser?.name || selectedUser?.phone || '...')) }}
        </button>
      </div>

      <!-- ── SENT LOG ── -->
      <div class="card" *ngIf="sentLog.length > 0">
        <h3 class="log-title">Sent This Session</h3>
        <div class="log-row" *ngFor="let entry of sentLog">
          <span class="log-icon">{{ entry.type === 'all' ? '📢' : '👤' }}</span>
          <div class="log-body">
            <div class="log-target">{{ entry.type === 'all' ? 'All customers (' + entry.count + ')' : entry.name }}</div>
            <div class="log-msg"><strong>{{ entry.title }}</strong> — {{ entry.message }}</div>
            <div class="log-time">{{ entry.time | date:'HH:mm' }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { padding: 24px; max-width: 680px; }
    .page-title { font-size: 1.5rem; font-weight: 800; color: #1a1a1a; margin: 0 0 4px; }
    .page-sub { color: #6f7f95; font-size: 0.9rem; margin: 0 0 20px; }

    .card {
      background: #fff; border-radius: 16px; padding: 20px;
      margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    }

    /* Target tabs */
    .target-tabs { display: flex; gap: 10px; margin-bottom: 16px; }
    .tab-btn {
      flex: 1; padding: 10px 14px; border: 2px solid #e2e8f0;
      border-radius: 10px; background: #f8fafc; font-size: 0.9rem;
      font-weight: 600; color: #6f7f95; cursor: pointer;
    }
    .tab-btn.active { border-color: #667eea; background: #eef2ff; color: #667eea; }

    /* User search */
    .user-search-wrap { margin-top: 8px; }
    .search-input {
      width: 100%; border: 1.5px solid #dbe4f0; border-radius: 10px;
      padding: 10px 14px; font-size: 0.9rem; outline: none; box-sizing: border-box;
    }
    .search-input:focus { border-color: #667eea; }
    .user-list { border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 8px; overflow: hidden; }
    .user-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f4f8;
    }
    .user-row:last-child { border-bottom: none; }
    .user-row:hover { background: #f8fafc; }
    .user-avatar { font-size: 1.3rem; }
    .user-name { font-size: 0.9rem; font-weight: 600; color: #1a1a1a; }
    .user-phone { font-size: 0.8rem; color: #6f7f95; }
    .selected-user {
      display: flex; align-items: center; gap: 12px; margin-top: 10px;
      padding: 12px 14px; background: #f0faf5; border: 1.5px solid #16a34a;
      border-radius: 10px;
    }
    .sel-check { color: #16a34a; font-size: 1.2rem; font-weight: 900; }
    .sel-phone { color: #6f7f95; font-size: 0.8rem; margin-left: 8px; }
    .clear-btn { margin-left: auto; background: none; border: none; color: #d32f2f; font-size: 1rem; cursor: pointer; }
    .no-users { color: #999; font-size: 0.85rem; margin-top: 8px; text-align: center; padding: 12px; }

    /* Compose */
    .field-label { display: block; font-size: 0.8rem; font-weight: 700; color: #4a5568; margin-bottom: 6px; }
    .req { color: #d32f2f; }
    .field-input, .field-textarea {
      width: 100%; border: 1.5px solid #dbe4f0; border-radius: 10px;
      padding: 10px 14px; font-size: 0.9rem; outline: none;
      box-sizing: border-box; font-family: inherit; resize: vertical;
    }
    .field-input:focus, .field-textarea:focus { border-color: #667eea; }
    .char-count { text-align: right; font-size: 0.75rem; color: #999; margin-top: 3px; }

    /* Preview */
    .preview-box { margin-top: 16px; }
    .preview-label { font-size: 0.75rem; font-weight: 700; color: #999; margin-bottom: 6px; text-transform: uppercase; }
    .preview-notif {
      background: #1a1a2e; border-radius: 12px; padding: 12px 14px;
      color: #fff; max-width: 320px;
    }
    .preview-app { font-size: 0.7rem; color: #aaa; margin-bottom: 4px; }
    .preview-title { font-size: 0.9rem; font-weight: 700; margin-bottom: 2px; }
    .preview-body { font-size: 0.8rem; color: #ddd; line-height: 1.4; }

    .error-msg { margin-top: 12px; color: #d32f2f; font-size: 0.85rem; font-weight: 600; }
    .success-msg { margin-top: 12px; color: #16a34a; font-size: 0.85rem; font-weight: 600; }

    .send-btn {
      display: block; width: 100%; margin-top: 16px;
      padding: 14px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer;
    }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Log */
    .log-title { font-size: 0.95rem; font-weight: 700; color: #1a1a1a; margin: 0 0 12px; }
    .log-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f4f8; }
    .log-row:last-child { border-bottom: none; }
    .log-icon { font-size: 1.2rem; }
    .log-target { font-size: 0.85rem; font-weight: 700; color: #1a1a1a; }
    .log-msg { font-size: 0.8rem; color: #6f7f95; margin-top: 2px; }
    .log-time { font-size: 0.75rem; color: #aaa; margin-top: 2px; }
  `]
})
export class PushNotificationsComponent implements OnInit {
  target: 'all' | 'user' = 'all';
  allUsers: Customer[] = [];
  filteredUsers: Customer[] = [];
  selectedUser: Customer | null = null;
  searchTerm = '';

  notifTitle = '';
  notifBody = '';
  sending = false;
  errorMsg = '';
  successMsg = '';

  sentLog: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Fetch all customers for search
    this.api.get<any>('/admin/notifications/users').subscribe({
      next: (res) => {
        this.allUsers = (Array.isArray(res) ? res : []).map((user: any) => ({
          id: Number(user?.id),
          name: String(user?.name || '').trim(),
          phone: String(user?.phone || '').trim()
        }));

        if (this.searchTerm.trim().length >= 2) {
          this.filterUsers();
        }
      },
      error: () => {
        this.errorMsg = 'Could not load customers for specific-user search.';
      }
    });
  }

  filterUsers() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term || term.length < 2) { this.filteredUsers = []; return; }
    
    // Use server-side search for better performance
    this.api.get<any>('/admin/notifications/users/search', { q: term }).subscribe({
      next: (res) => {
        this.filteredUsers = (Array.isArray(res) ? res : []).map((user: any) => ({
          id: Number(user?.id),
          name: String(user?.name || '').trim(),
          phone: String(user?.phone || '').trim()
        }));
      },
      error: () => {
        this.filteredUsers = [];
      }
    });
  }

  selectUser(u: Customer) {
    this.selectedUser = u;
    this.filteredUsers = [];
    this.searchTerm = u.name || u.phone;
  }

  send() {
    if (this.sending) return;
    const title = this.notifTitle.trim();
    const body = this.notifBody.trim();
    if (!title || !body) return;
    if (this.target === 'user' && !this.selectedUser) return;

    this.sending = true;
    this.errorMsg = '';
    this.successMsg = '';

    const url = this.target === 'all'
      ? '/admin/notifications/send-to-all'
      : '/admin/notifications/send-to-user';

    const payload: any = { title, body };
    if (this.target === 'user') payload.userId = this.selectedUser!.id;

    this.api.post<any>(url, payload).subscribe({
      next: (res) => {
        this.sending = false;
        if (this.target === 'all') {
          this.successMsg = `Sent to ${res.totalUsers} customers (${res.pushed} push delivered).`;
          this.sentLog.unshift({ type: 'all', count: res.totalUsers, title, message: body, time: new Date() });
        } else {
          this.successMsg = `Sent to ${res.name || this.selectedUser?.phone}${res.pushed ? ' ✓ Push delivered' : ' (in-app only — no FCM token)'}`;
          this.sentLog.unshift({ type: 'user', name: res.name || this.selectedUser?.phone, title, message: body, time: new Date() });
        }
        this.notifTitle = '';
        this.notifBody = '';
        setTimeout(() => this.successMsg = '', 6000);
      },
      error: (err) => {
        this.sending = false;
        this.errorMsg = err?.error?.error || 'Failed to send. Please try again.';
      }
    });
  }
}
