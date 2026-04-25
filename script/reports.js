/* ============================================
   FinSmart – Reports & Analytics Logic
   Beginner → Intermediate friendly
   ============================================ */
'use strict';

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guard()) return;
  initReports();
});

// Initialize all reports
async function initReports() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Fetch all report data in parallel
    const [summary, monthly, topBorrowers, distribution] = await Promise.all([
      API.reports.getSummary(user.id),
      API.reports.getMonthlyTrends(user.id),
      API.reports.getTopBorrowers(user.id),
      API.reports.getInterestDistribution(user.id)
    ]);

    renderReportStats(summary);
    renderCollectionTrend(monthly);
    renderInterestDistribution(distribution);
    renderTopBorrowers(topBorrowers);

    // Remove skeleton loading styles
    document.querySelectorAll('.stat-value').forEach(el => el.classList.remove('skeleton-text'));
    const chart = document.getElementById('collectionTrendChart');
    if (chart) chart.classList.remove('skeleton-chart');

    initExport();
  } catch (error) {
    console.error('Reports Load Error:', error);
    Toast.error('Failed to load report data');
  }
}

/* ── Render Interest Distribution ── */
function renderInterestDistribution(distribution) {
  const container = document.getElementById('interestSplitChart');
  if (!container) return;

  const totalInterest = distribution.reduce((sum, d) => sum + d.total_interest_earned, 0) || 1;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);width:100%;">
      ${distribution.map(d => {
        const label = 'Monthly Interest Yield';
        const color = 'var(--primary-500)';
        return renderStatusBar(label, Utils.formatCurrency(d.total_interest_earned), totalInterest, color, d.total_interest_earned);
      }).join('')}
    </div>`;
}

// Helper to create a progress bar row
function renderStatusBar(label, valueText, total, color, rawValue) {
  const pct = total > 0 ? ((rawValue / total) * 100).toFixed(0) : 0;
  return `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1);">
        <span style="font-size:var(--text-sm);font-weight:500;">${label}</span>
        <span style="font-size:var(--text-sm);color:var(--text-tertiary);">${valueText} (${pct}%)</span>
      </div>
      <div class="progress-bar" style="background:var(--gray-100); height:8px;">
        <div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>`;
}

/* ── Render Summary Stats ── */
function renderReportStats(summary) {
  Utils.animateValue('reportTotalLent', 0, summary.total_lent || 0, 1000);
  Utils.animateValue('reportCollected', 0, summary.total_collected || 0, 1000);
  Utils.animateValue('reportInterest', 0, summary.total_interest_earned || 0, 1000);
  Utils.animateValue('reportOutstanding', 0, summary.total_outstanding || 0, 1000);
}

/* ── Render Monthly Collection Trend ── */
function renderCollectionTrend(monthly) {
  const container = document.getElementById('collectionTrendChart');
  if (!container) return;

  if (!monthly || monthly.length === 0) {
    container.innerHTML = `<div class="empty-state" style="height:100%;width:100%;">No data available</div>`;
    return;
  }

  const maxVal = Math.max(...monthly.map(d => Math.max(d.amount_collected, d.amount_lent)), 1000);

  container.innerHTML = monthly.map(d => {
    const collectedPct = (d.amount_collected / maxVal) * 100;
    const lentPct = (d.amount_lent / maxVal) * 100;
    const monthLabel = Utils.formatMonthName(d.month);

    return `
      <div class="chart-bar-wrapper">
        <div class="chart-stack" data-tooltip="Lent: ${Utils.formatCurrency(d.amount_lent)} | Collected: ${Utils.formatCurrency(d.amount_collected)}">
          <div class="chart-bar projected" style="height:${Math.max(lentPct, 2)}%; border-style:solid; opacity:0.3; background:var(--accent-300);"></div>
          <div class="chart-bar actual" style="height:${Math.max(collectedPct, 2)}%;"></div>
        </div>
        <span class="chart-label">${monthLabel}</span>
      </div>`;
  }).join('');
}

/* ── Render Top Borrowers Table ── */
function renderTopBorrowers(borrowers) {
  const tbody = document.getElementById('topBorrowersBody');
  if (!tbody) return;

  if (!borrowers || borrowers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:var(--space-8);">No data available</td></tr>`;
    return;
  }

  tbody.innerHTML = borrowers.map((p, i) => {
    const color = Utils.getAvatarColor(p.name);
    const statusClass = p.status === 'active' ? 'badge-primary' : p.status === 'overdue' ? 'badge-danger' : 'badge-success';
    const profitClass = p.interest_earned > 0 ? 'text-success font-semibold' : 'text-tertiary';

    return `
      <tr onclick="window.location.href='person-detail.html?id=${p.id}'" style="cursor:pointer;" class="person-row">
        <td data-label="Borrower">
          <div class="person-info">
            <div class="avatar avatar-sm" style="background:${color};">${Utils.getInitials(p.name)}</div>
            <span class="font-medium">${p.name}</span>
          </div>
        </td>
        <td data-label="Principal">${Utils.formatCurrency(p.given_amount)}</td>
        <td data-label="Collected">${Utils.formatCurrency(p.total_paid)}</td>
        <td data-label="Profit" class="${profitClass}">${Utils.formatCurrency(p.interest_earned)}</td>
        <td data-label="Outstanding" class="font-semibold">${Utils.formatCurrency(p.outstanding)}</td>
        <td data-label="Risk">${renderRiskBadge(p.risk)}</td>
        <td data-label="Status"><span class="badge ${statusClass}">${p.status}</span></td>
      </tr>`;
  }).join('');
}

/* ── Export Full Report to CSV ── */
function initExport() {
  const btn = document.getElementById('exportCSV');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      setButtonLoading(btn, true);
      const persons = await API.persons.getAll(user.id);
      if (!persons || persons.length === 0) {
        Toast.warning('No data to export');
        return;
      }

      const headers = ['Name', 'Phone', 'Email', 'Principal', 'Collected', 'Profit', 'Outstanding', 'Status'];
      const rows = persons.map(p => [
        `"${p.name}"`, `"${p.phone}"`, `"${p.email || ''}"`,
        p.given_amount, p.total_paid || 0, p.interest_earned || 0, p.outstanding || 0, `"${p.status}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv' }));
      link.download = `FinSmart_Report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      Toast.success('Report exported successfully');
    } catch (err) {
      console.error('Export Error:', err);
      Toast.error('Export failed');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}