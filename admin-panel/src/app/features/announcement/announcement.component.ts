import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatSlideToggleModule, MatSnackBarModule, MatCardModule, MatTooltipModule],
  template: `
    <h2 class="page-title">📢 Announcement Banner</h2>

    <mat-card style="max-width:640px">
      <mat-card-content>
        <p style="color:#666;margin-bottom:20px;">
          This banner appears as a dismissible strip at the top of the customer app home screen.
          Great for offers, service alerts, or new area launches.
        </p>

        <!-- Live preview -->
        <div class="preview-strip" [style.background]="message.bgColor" *ngIf="message.message?.trim()">
          <span>{{ message.message }}</span>
        </div>

        <mat-form-field appearance="outline" style="width:100%;margin-top:16px;">
          <mat-label>Banner Message</mat-label>
          <textarea matInput [(ngModel)]="message.message" rows="3"
            placeholder="e.g. 🎉 Free delivery on orders above ₹299 today!"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px;">
          <mat-label>Notification Image URL <span style="font-weight:400;color:#999">(optional)</span></mat-label>
          <input matInput [(ngModel)]="message.imageUrl"
            placeholder="https://res.cloudinary.com/... or any public image URL">
          <mat-hint>Leave blank to send text-only notification. Must be a public HTTPS image link.</mat-hint>
        </mat-form-field>

        <!-- Image preview -->
        <div *ngIf="message.imageUrl?.trim()" style="margin-bottom:14px;">
          <img [src]="message.imageUrl" alt="Preview" style="max-height:120px;border-radius:8px;border:1px solid #ddd;object-fit:cover;">
          <div style="font-size:11px;color:#888;margin-top:4px;">Preview — this image will appear in the push notification</div>
        </div>

        <div style="display:flex;align-items:center;gap:24px;margin:8px 0 16px;">
          <mat-slide-toggle [(ngModel)]="message.active" color="primary">
            {{ message.active ? '✅ Active (visible to users)' : '⏸ Inactive (hidden)' }}
          </mat-slide-toggle>

          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:14px;color:#555;">Background Color:</label>
            <input type="color" [(ngModel)]="message.bgColor" style="width:40px;height:32px;border:none;cursor:pointer;border-radius:6px;">
            <span style="font-size:12px;color:#888;">{{ message.bgColor }}</span>
          </div>
        </div>

        <div style="display:flex;gap:12px;">
          <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : '💾 Save & Publish' }}
          </button>
          <button mat-stroked-button color="warn" (click)="deactivate()" [disabled]="saving()">
            🔕 Hide Banner
          </button>
          <button mat-stroked-button color="accent" (click)="sendPush()" [disabled]="saving() || !message.message?.trim()"
                  matTooltip="Send current message as a push notification to all users now">
            {{ pushing() ? 'Sending...' : '📱 Send Push Now' }}
          </button>
        </div>

        <p style="font-size:12px;color:#888;margin-top:12px;">
          💡 <strong>Push notification</strong> is sent automatically when you activate the banner.
          Use <em>"Send Push Now"</em> to re-send without changing banner state.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-title { margin-bottom: 20px; }
    .preview-strip {
      padding: 10px 16px;
      border-radius: 8px;
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
      margin-bottom: 8px;
    }
  `]
})
export class AnnouncementComponent implements OnInit {
  // Default hero banner — replace with your actual Cloudinary URL after uploading home-banner.png
  private readonly DEFAULT_BANNER_URL = '';

  message = { message: '', active: false, bgColor: '#667eea', imageUrl: '' };
  saving = signal(false);
  pushing = signal(false);

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit() {
    this.api.get<any>('/admin/announcement').subscribe({
      next: (res) => {
        this.message.message  = res.message  || '';
        this.message.active   = res.active   || false;
        this.message.bgColor  = res.bgColor  || '#667eea';
        // Use saved imageUrl, or fall back to default hero banner
        this.message.imageUrl = res.imageUrl || this.DEFAULT_BANNER_URL;
      }
    });
  }

  save() {
    this.saving.set(true);
    this.api.put<any>('/admin/announcement', {
      message: this.message.message,
      active:  this.message.active,
      bgColor: this.message.bgColor,
      imageUrl: this.message.imageUrl?.trim() || null
    }).subscribe({
      next: () => {
        this.snack.open('✅ Banner saved!', '', { duration: 2500 });
        this.saving.set(false);
      },
      error: () => {
        this.snack.open('❌ Failed to save', '', { duration: 3000 });
        this.saving.set(false);
      }
    });
  }

  deactivate() {
    this.message.active = false;
    this.save();
  }

  sendPush() {
    this.pushing.set(true);
    this.api.post<any>('/admin/announcement/push', {}).subscribe({
      next: (res) => {
        const msg = res?.status === 'skipped'
          ? `⚠️ ${res.reason}`
          : '📱 Push notification sent to all users!';
        this.snack.open(msg, '', { duration: 3000 });
        this.pushing.set(false);
      },
      error: () => {
        this.snack.open('❌ Failed to send push notification', '', { duration: 3000 });
        this.pushing.set(false);
      }
    });
  }
}
