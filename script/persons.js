// persons.js — Borrowers list page logic
'use strict';

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guard()) return;
  initPersonsPage();
});

async function initPersonsPage() {
  // Read filters from URL if any
  const params = new URLSearchParams(window.location.search);
  const urlFilter = params.get('filter') || 'all';
  // Mark the correct filter chips as active
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === urlFilter);
  });

  // Load the table with initial filters
  await renderPersonsTable(urlFilter, '');

  initSearch();
  initFilters();
  initExport();
}


// ── Render the borrowers table ──
async function renderPersonsTable(filter = 'all', searchQuery = '') {
  const user = getCurrentUser();
  if (!user) return;

  const tbody = document.getElementById('personsTableBody');
  if (!tbody) return;

  // Show skeleton loading rows
  const skeletonCell = '<td><div class="skeleton" style="height:20px; width:80%;"></div></td>';
  tbody.innerHTML = `<tr>${skeletonCell.repeat(10)}</tr>`.repeat(5);

  try {
    // Convert 'all' to empty string for the API
    const statusParam = filter === 'all' ? '' : filter;

    const persons = await API.persons.getAll(user.id, searchQuery, statusParam);

    // Update the borrower count badge
    const countEl = document.getElementById('personsCount');
    if (countEl) {
      countEl.textContent = `${persons.length} borrower${persons.length !== 1 ? 's' : ''}`;
    }

    // Show empty state if no results
    if (persons.length === 0) {
      const emptyMsg = searchQuery ? 'Try adjusting your search' : 'Add your first borrower to get started';
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:var(--space-12);">
            <div class="empty-state" style="padding:0;">
              <div class="empty-state-icon">${getIcon('user')}</div>
              <h3>No borrowers found</h3>
              <p>${emptyMsg}</p>
              <a href="add-person.html" class="btn btn-primary" style="margin-top:var(--space-4);">+ Add Borrower</a>
            </div>
          </td>
        </tr>`;
      return;
    }

    // Build table rows
    let rows = '';
    for (const p of persons) {
      const initials = Utils.getInitials(p.name);
      const color = Utils.getAvatarColor(p.name);
      const loanAmount = p.given_amount || 0;
      const profitClass = p.interest_earned > 0 ? 'text-success font-semibold' : 'text-tertiary';

      // Status badge colors
      const statusColors = { active: 'badge-primary', overdue: 'badge-danger', closed: 'badge-success' };
      const statusClass = statusColors[p.status] || 'badge-neutral';

      rows += `
        <tr class="person-row" onclick="window.location.href='person-detail.html?id=${p.id}'" style="cursor:pointer;">
          <td data-label="Borrower">
            <div class="person-info" style="min-width: 0;">
              <div class="avatar" style="background:${color}; flex-shrink: 0;">${initials}</div>
              <div style="min-width: 0;">
                <div class="font-medium" style="word-break: break-word; line-height: 1.2;">${p.name}</div>
                <small class="text-muted" style="display: block; margin-top: 2px;">${p.phone}</small>
              </div>
            </div>
          </td>
          <td data-label="Principal" style="font-weight:600;">${Utils.formatCurrency(loanAmount)}</td>
          <td data-label="Collected">${Utils.formatCurrency(p.total_paid || 0)}</td>
          <td data-label="Cycle">
            <span class="badge badge-primary">Monthly</span>
          </td>
          <td data-label="Payment">
            <div class="font-semibold text-primary" style="font-size:var(--text-sm);">
              ${Utils.formatCurrency(p.period_interest || 0)}
            </div>
            <small class="text-tertiary" style="font-size:10px; text-transform:uppercase;">Per Month</small>
          </td>
          <td data-label="Next Payment" style="font-size:var(--text-sm); font-weight:600; color:var(--primary-600);">
            ${p.next_payment_date && p.next_payment_date !== 'None'
          ? Utils.formatDate(p.next_payment_date)
          : '<span style="color:var(--text-tertiary); font-weight:400;">Closed</span>'}
          </td>
          <td data-label="Profit" class="${profitClass}">${Utils.formatCurrency(p.interest_earned || 0)}</td>
          <td data-label="Outstanding" class="font-semibold" style="color:var(--primary-600);">${Utils.formatCurrency(p.outstanding || 0)}</td>
          <td data-label="Risk">${renderRiskBadge(p.risk)}</td>
          <td data-label="Status"><span class="badge ${statusClass}">${p.status}</span></td>
        </tr>`;
    }
    tbody.innerHTML = rows;

  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--danger-500); padding:var(--space-12);">Error: ${error.message}</td></tr>`;
  }
}


// ── Search box ──
function initSearch() {
  const searchInput = document.getElementById('personsSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', Utils.debounce(async (e) => {
    const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
    await renderPersonsTable(activeFilter, e.target.value);
  }, 250));
}


// ── Status and type filter chips ──
function initFilters() {
  // Status filters (All / Active / Overdue / Closed)
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const search = document.getElementById('personsSearch')?.value || '';

      // Save selection to URL
      const url = new URL(window.location);
      url.searchParams.set('filter', chip.dataset.filter);
      window.history.pushState({}, '', url);

      await renderPersonsTable(chip.dataset.filter, search);
    });
  });
}


// ── Export to CSV button ──
function initExport() {
  const btn = document.getElementById('exportCsvBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      setButtonLoading(btn, true);

      // Use current active filters for export
      const activeFilter = document.querySelector('.filter-chip.active')?.dataset.filter || 'all';
      const statusParam = activeFilter === 'all' ? '' : activeFilter;

      const persons = await API.persons.getAll(user.id, '', statusParam);

      if (persons.length === 0) {
        Toast.warning('No data to export');
        return;
      }

      // Build CSV rows
      const headers = ['Name', 'Phone', 'Email', 'Amount', 'Outstanding', 'Interest (Per 100)', 'Start Date', 'Status'];
      const rows = persons.map(p => [
        `"${p.name}"`,
        `"${p.phone}"`,
        `"${p.email || ''}"`,
        p.given_amount,
        p.outstanding || 0,
        p.interest_amount,
        p.start_date,
        p.status
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `FinSmart_Borrowers_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Toast.success('Export completed successfully');
    } catch (err) {
      Toast.error('Export failed: ' + err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
  
}
