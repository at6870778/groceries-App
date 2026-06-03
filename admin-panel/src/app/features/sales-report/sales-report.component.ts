import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface DailySalesDto {
  date: string;
  orderCount: number;
  dailyRevenue: number;
  avgDailyOrderValue: number;
}

interface DateRangeSalesReportDto {
  fromDate: string;
  toDate: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalDays: number;
  dailyBreakdown: DailySalesDto[];
}

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.css']
})
export class SalesReportComponent implements OnInit {
  fromDate: string = '';
  toDate: string = '';
  report: DateRangeSalesReportDto | null = null;
  loading = false;
  error = '';
  
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Set default date range to last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    this.toDate = today.toISOString().split('T')[0];
    this.fromDate = sevenDaysAgo.toISOString().split('T')[0];
  }

  generateReport(): void {
    if (!this.fromDate || !this.toDate) {
      this.error = 'Please select both from and to dates';
      return;
    }

    if (new Date(this.fromDate) > new Date(this.toDate)) {
      this.error = 'From date must be before or equal to To date';
      return;
    }

    this.loading = true;
    this.error = '';
    this.report = null;

    const params = {
      fromDate: this.fromDate,
      toDate: this.toDate
    };

    this.http.get<DateRangeSalesReportDto>(`${environment.apiUrl}/admin/reports/sales`, { params })
      .subscribe({
        next: (data) => {
          this.report = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to generate report';
          this.loading = false;
        }
      });
  }

  downloadReport(): void {
    if (!this.report) return;

    let csv = 'Daily Sales Report\n';
    csv += `Period: ${this.formatDate(this.report.fromDate)} to ${this.formatDate(this.report.toDate)}\n\n`;
    csv += `Total Orders,${this.report.totalOrders}\n`;
    csv += `Total Revenue,₹${this.formatAmount(this.report.totalRevenue)}\n`;
    csv += `Average Order Value,₹${this.formatAmount(this.report.avgOrderValue)}\n`;
    csv += `Total Days,${this.report.totalDays}\n\n`;
    
    csv += 'Daily Breakdown\n';
    csv += 'Date,Orders,Revenue,Avg Order Value\n';
    
    this.report.dailyBreakdown.forEach(daily => {
      csv += `${this.formatDate(daily.date)},${daily.orderCount},₹${this.formatAmount(daily.dailyRevenue)},₹${this.formatAmount(daily.avgDailyOrderValue)}\n`;
    });

    // Create blob and download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `sales-report-${this.fromDate}-to-${this.toDate}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  getDaysLabel(): string {
    if (!this.report) return '';
    const count = this.report.totalDays;
    return count === 1 ? 'day' : 'days';
  }
}
