import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatSlideToggleModule, MatSnackBarModule, MatCardModule],
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
        </div>
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
  message = { message: '', active: false, bgColor: '#667eea' };
  saving = signal(false);

  constructor(private api: ApiService, private snack: MatSnackBar) {}

  ngOnInit() {
    this.api.get<any>('/admin/announcement').subscribe({
      next: (res) => {
        this.message.message = res.message || '';
        this.message.active  = res.active  || false;
        this.message.bgColor = res.bgColor || '#667eea';
      }
    });
  }

  save() {
    this.saving.set(true);
    this.api.put<any>('/admin/announcement', {
      message: this.message.message,
      active:  this.message.active,
      bgColor: this.message.bgColor
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
}
