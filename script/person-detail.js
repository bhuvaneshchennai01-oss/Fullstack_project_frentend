/* ============================================
   person-detail.js — Borrower Detail Page Logic
   Beginner → Intermediate friendly
   ============================================ */
'use strict';

// Run when the page loads
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guard()) return;
  initPersonDetail();
});

// Get the borrower ID from the URL (?id=123)
function getPersonId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Main function — load and render everything
async function initPersonDetail() {
  const personId = getPersonId();
  if (!personId) {
    window.location.href = 'persons.html';
    return;
  }

  const user = getCurrentUser();
  if (!user) return;

  try {
    const person = await API.persons.getOne(personId, user.id);
    if (!person) {
      Toast.error('Borrower not found');
      setTimeout(() => { window.location.href = 'persons.html'; }, 1000);
      return;
    }

    // Render sections
    renderPersonProfile(person);
    renderPersonStats(person);
    renderLoanOverview(person);
    renderNotes(person);

    const payments = await API.payments.getAll(user.id, personId);
    renderPaymentTimeline(payments);

    // Initialize modals and action buttons
    initPaymentModal(person);
    initDeleteBorrower(person);
    initEditBorrower(person);

  } catch (error) {
    console.error('Error loading borrower detail:', error);
    Toast.error(error.message || 'Failed to load details');
  }
}

/* ── Render Profile ── */
function renderPersonProfile(p) {
  const el = document.getElementById('personProfile');
  if (!el) return;

  const color = Utils.getAvatarColor(p.name);
  const initials = Utils.getInitials(p.name);

  const breadcrumb = document.getElementById('breadcrumbName');
  if (breadcrumb) breadcrumb.textContent = p.name;

  let badgeClass = 'badge-success';
  if (p.status === 'active') badgeClass = 'badge-primary';
  if (p.status === 'overdue') badgeClass = 'badge-danger';

  el.innerHTML = `
    <div class="person-avatar-lg" style="background:${color}; flex-shrink:0;">${initials}</div>
    <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:var(--space-4);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:var(--space-4);">
        <div style="flex:1; min-width:240px;">
          <h2 style="line-height:1.2; font-size:var(--text-2xl); word-break:break-word; margin-bottom:var(--space-1);">${p.name}</h2>
          <p style="color:var(--text-secondary); font-size:var(--text-sm); margin-bottom:var(--space-3); display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:6px;"><span data-icon="phone" style="opacity:0.6;width:14px;"></span>${p.phone}</span>
            ${p.email ? `<span style="display:inline-flex; align-items:center; gap:6px;"><span data-icon="mail" style="opacity:0.6;width:14px;"></span>${p.email}</span>` : ''}
          </p>
          <div style="display:flex; align-items:center; gap:var(--space-3); flex-wrap:wrap;">
            <span class="badge ${badgeClass}" id="statusBadge" style="padding:4px 12px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; border-radius:var(--radius-full);">
              ${p.status}
            </span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm ripple" id="openEditModalBtn" style="padding:var(--space-2) var(--space-4);">
          <span data-icon="settings" style="margin-right:6px;"></span> Edit Profile
        </button>
      </div>
      
      <div style="padding-top:var(--space-3); border-top:1px solid var(--border-subtle); margin-top:var(--space-1);">
        <p style="color:var(--text-tertiary); font-size:var(--text-sm); display:flex; align-items:center; gap:var(--space-2); margin:0;">
          <span data-icon="search" style="opacity:0.5; width:14px; height:14px;"></span>
          ${p.address || 'No address provided'}
        </p>
      </div>
    </div>`;

  // Re-inject icons for the newly added elements
  el.querySelectorAll('[data-icon]').forEach(iconSpan => {
    const key = iconSpan.getAttribute('data-icon');
    if (Icons[key]) iconSpan.innerHTML = Icons[key];
  });
}

/* ── Render Stats ── */
function renderPersonStats(p) {
  const loanAmount = p.given_amount || 0;
  const interestEarned = p.interest_earned || 0;
  const totalPaid = p.total_paid || 0;
  const outstanding = p.outstanding || 0;

  document.querySelectorAll('.stat-value').forEach(el => el.classList.remove('skeleton'));

  Utils.animateValue('detailLoanAmount', 0, loanAmount, 800);
  Utils.animateValue('detailInterest', 0, interestEarned, 800);
  Utils.animateValue('detailTotalPaid', 0, totalPaid, 800);
  Utils.animateValue('detailOutstanding', 0, outstanding, 800);

  const totalExpected = totalPaid + outstanding;
  const progress = totalExpected > 0 ? Math.min(100, (totalPaid / totalExpected) * 100) : 0;
  const progressEl = document.getElementById('repaymentProgress');
  if (progressEl) {
    progressEl.querySelector('.progress-bar-fill').style.width = `${progress}%`;
    progressEl.querySelector('.progress-label').textContent = `${progress.toFixed(1)}% repaid`;
  }

  const riskBadge = document.getElementById('riskLevelBadge');
  const riskReason = document.getElementById('riskReason');
  if (riskBadge && p.risk) {
    riskBadge.innerHTML = renderRiskBadge(p.risk);
    riskReason.textContent = p.risk.reason || 'No risk data available';
  }
}



/* ── Render Loan Overview ── */
function renderLoanOverview(p) {
  const interestType = p.interest_type || 'monthly';
  const modeLabel = p.interest_mode === 'per_100' ? 'Per 100 (₹)' : 'Percentage (%)';
  const nextPayment = p.next_payment_date && p.next_payment_date !== 'None'
    ? Utils.formatDate(p.next_payment_date) : 'Loan Closed';
  const paymentLabel = `${Utils.formatCurrency(p.period_interest || 0)} per Month`;
  const durationLabel = `${p.duration || 12} Months`;

  setStatValue('displayDuration', durationLabel);
  setStatValue('displayStartDate', Utils.formatDate(p.start_date));
  setStatValue('displayNextPayment', nextPayment);
  setStatValue('displayPeriodInterest', paymentLabel);
}

/* ── Render Notes ── */
function renderNotes(p) {
  const section = document.getElementById('notesSection');
  const display = document.getElementById('displayNotes');
  if (!section || !display) return;

  if (p.notes && p.notes.trim() !== '') {
    section.style.display = 'block';
    display.textContent = p.notes;
  } else {
    section.style.display = 'none';
  }
}

/* ── Render Payment Timeline ── */
function renderPaymentTimeline(payments) {
  const container = document.getElementById('paymentTimeline');
  if (!container) return;

  if (!payments || payments.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px;">
        <div class="empty-state-icon">${getIcon('trending')}</div>
        <h3>No payments yet</h3>
        <p>Record a payment to see it on the timeline</p>
      </div>`;
    return;
  }

  let html = '';
  payments.forEach(pay => {
    const badgeClass = pay.type === 'EMI' ? 'badge-primary' : 'badge-success';
    const noteHtml = pay.note ? `<p style="font-size:var(--text-xs); color:var(--text-tertiary); margin-top:2px;">${pay.note}</p>` : '';
    html += `
      <div class="timeline-item">
        <div class="timeline-dot ${pay.type !== 'EMI' ? 'success' : ''}"></div>
        <div class="timeline-content">
          <div class="timeline-date">${Utils.formatDate(pay.paid_on)}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-4);">
            <div style="flex:1;">
              <strong style="font-size:var(--text-sm);">${Utils.formatCurrency(pay.amount)}</strong>
              <span class="badge ${badgeClass}" style="margin-left:8px;">${pay.type}</span>
              ${noteHtml}
            </div>
            <button class="btn btn-icon btn-ghost btn-sm" onclick="handleDeletePayment(${pay.id})" title="Delete Payment" style="color:var(--danger-400);">
              <span data-icon="trash"></span>
            </button>
          </div>
        </div>
      </div>`;
  });


  
  container.innerHTML = html;
  container.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = getIcon(el.dataset.icon));
}

/* ── Delete Payment ── */
async function handleDeletePayment(paymentId) {
  if (!confirm('Are you sure you want to delete this payment?')) return;
  const user = getCurrentUser();
  if (!user) return;
  try {
    await API.payments.delete(paymentId, user.id);
    Toast.success('Payment deleted');
    await initPersonDetail();
  } catch (error) {
    Toast.error(error.message || 'Failed to delete payment');
  }
}
window.handleDeletePayment = handleDeletePayment;

/* ── Edit Borrower ── */
function initEditBorrower(person) {
  const openBtn = document.getElementById('openEditModalBtn');
  const form = document.getElementById('editPersonForm');

  if (openBtn) openBtn.addEventListener('click', () => {
    form.reset();
    document.getElementById('editName').value = person.name || '';
    document.getElementById('editPhone').value = person.phone || '';
    document.getElementById('editEmail').value = person.email || '';
    document.getElementById('editAddress').value = person.address || '';
    document.getElementById('editLoanAmount').value = person.given_amount || 0;
    document.getElementById('editInterestAmount').value = person.interest_amount || 0;
    document.getElementById('editDuration').value = person.duration || 12;
    document.getElementById('editStartDate').value = person.start_date || '';
    document.getElementById('editNotes').value = person.notes || '';
    Modal.open('editPersonModal');
  });

  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);

    try {
      const user = getCurrentUser();
      await API.persons.update(person.id, user.id, {
        name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        email: document.getElementById('editEmail').value,
        address: document.getElementById('editAddress').value,
        given_amount: parseFloat(document.getElementById('editLoanAmount').value) || 0,
        interest_amount: parseFloat(document.getElementById('editInterestAmount').value) || 0,
        interest_mode: 'per_100',
        interest_type: 'monthly',
        duration: parseInt(document.getElementById('editDuration').value) || 12,
        start_date: document.getElementById('editStartDate').value,
        notes: document.getElementById('editNotes').value
      });
      Modal.close('editPersonModal');
      Toast.success('Profile updated');
      await initPersonDetail();
    } catch {
      setButtonLoading(btn, false);
      Toast.error('Update failed');
    }
  });
}

/* ── Delete Borrower ── */
function initDeleteBorrower(person) {
  const btn = document.getElementById('deletePersonBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!confirm(`Delete ${person.name}? This will remove all payments.`)) return;
    setButtonLoading(btn, true);
    try {
      const user = getCurrentUser();
      await API.persons.delete(person.id, user.id);
      Toast.success('Borrower deleted');
      setTimeout(() => window.location.href = 'persons.html', 1000);
    } catch {
      setButtonLoading(btn, false);
      Toast.error('Failed to delete borrower');
    }
  });
}

/* ── Record Payment ── */
function initPaymentModal(person) {
  const addBtn = document.getElementById('addPaymentBtn');
  const form = document.getElementById('paymentForm');

  if (addBtn) addBtn.addEventListener('click', () => {
    form.reset();
    clearFormErrors(form);
    const payDate = form.querySelector('#payDate');
    if (payDate) payDate.value = new Date().toISOString().split('T')[0];
    Modal.open('paymentModal');
  });

  if (form && !form.dataset.attached) {
    form.dataset.attached = 'true';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      clearFormErrors(form);

      const amount = parseFloat(form.querySelector('#payAmount')?.value) || 0;
      const dateValue = form.querySelector('#payDate')?.value;
      const type = form.querySelector('#payType')?.value || 'EMI';
      const note = form.querySelector('#payNote')?.value?.trim() || '';

      let valid = true;
      if (!amount || amount <= 0) { showFieldError('payAmount', 'Enter a valid amount'); valid = false; }
      if (!dateValue) { showFieldError('payDate', 'Select a date'); valid = false; }
      if (!valid) return;

      const btn = form.querySelector('button[type="submit"]');
      setButtonLoading(btn, true);

      try {
        const user = getCurrentUser();
        await API.payments.create(user.id, {
          person_id: parseInt(person.id),
          amount, paid_on: dateValue, type, note, status: 'paid'
        });
        Modal.close('paymentModal');
        Toast.success('Payment recorded!');
        await initPersonDetail();
      } catch (error) {
        setButtonLoading(btn, false);
        Toast.error(error.message || 'Failed to record payment');
      }
    });
  }
}