import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatSlideToggleModule, MatSnackBarModule, MatCardModule, MatTooltipModule, MatIconModule],
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

        <div style="margin-top: 16px;">
          <label style="font-weight: 600; color: #333; display: block; margin-bottom: 8px;">
            Notification Image <span style="font-size: 12px; color: #999;">(optional - upload directly)</span>
          </label>
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <input type="text" [(ngModel)]="message.imageUrl" placeholder="Auto-filled after upload"
              style="flex: 1; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; font-size: 14px;">
            <div style="display: flex; gap: 8px; margin-top: 0;">
              <input #imgFileInput type="file" accept="image/*" style="display:none"
                (change)="onFileSelected($event)" />
              <button mat-stroked-button type="button" [disabled]="uploading()" (click)="imgFileInput.click()"
                style="white-space: nowrap;">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px; margin-right: 4px;">cloud_upload</mat-icon>
                {{ uploading() ? 'Uploading...' : 'Upload' }}
              </button>
            </div>
          </div>
          <small style="color: #999; margin-top: 4px; display: block;">✨ Upload image - URL fills automatically!</small>
        </div>

        <!-- Image preview -->
        <div *ngIf="message.imageUrl?.trim()" style="margin-top:14px;">
          <img [src]="message.imageUrl" alt="Preview" style="max-height:120px;border-radius:8px;border:1px solid #ddd;object-fit:cover;">
          <div style="font-size:11px;color:#888;margin-top:4px;">✓ Preview — this image will appear in the push notification</div>
        </div>

        <div style="display:flex;align-items:center;gap:24px;margin:16px 0;">
          <mat-slide-toggle [(ngModel)]="message.active" color="primary">
            {{ message.active ? '✅ Active (visible to users)' : '⏸ Inactive (hidden)' }}
          </mat-slide-toggle>

          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:14px;color:#555;">Background Color:</label>
            <input type="color" [(ngModel)]="message.bgColor" style="width:40px;height:32px;border:none;cursor:pointer;border-radius:6px;">
            <span style="font-size:12px;color:#888;">{{ message.bgColor }}</span>
          </div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;">
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

  @ViewChild('imgFileInput') imgFileInput!: ElementRef<HTMLInputElement>;

  message = { message: '', active: false, bgColor: '#667eea', imageUrl: '' };
  saving = signal(false);
  pushing = signal(false);
  uploading = signal(false);

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

  /**
   * Handle file selection from input
   */
  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      this.uploadImage(file);
    }
  }

  /**
   * Upload announcement image directly
   * Uploads to Cloudinary and auto-fills the image URL
   */
  uploadImage(file: File) {
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadFile<{ url: string }>('/admin/catalog/upload-image', file).subscribe({
      next: (res) => {
        this.message.imageUrl = res.url;
        this.uploading.set(false);
        this.snack.open('✅ Image uploaded! URL auto-filled.', '', { duration: 2000 });
      },
      error: (err) => {
        this.uploading.set(false);
        this.snack.open('❌ Upload failed: ' + (err?.error?.message || 'Unknown error'), '', { duration: 3000 });
      }
    });
  }
}
