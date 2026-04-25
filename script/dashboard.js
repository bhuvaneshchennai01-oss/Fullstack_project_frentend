// dashboard.js — Logic for the main dashboard screen
'use strict';

// Run when the page finishes loading
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.guard()) return;
  loadDashboardData();
});

// Main function to fetch and display dashboard info
async function loadDashboardData() {
  const user = getCurrentUser();
  if (!user) return;

  // 1. Show a friendly header greeting
  displayGreeting(user.name);

  try {
    // 2. Fetch all data from the API in one go
    const [summary, persons, trends, upcoming] = await Promise.all([
      API.reports.getSummary(user.id),
      API.persons.getAll(user.id),
      API.reports.getMonthlyTrends(user.id),
      API.payments.getUpcoming(user.id)
    ]);

    // 3. Remove the 'skeleton' loading effects
    document.querySelectorAll('.stat-value').forEach(el => {
      el.classList.remove('skeleton-text');
    });

    // 4. Fill in the top 4 stat cards with numbers
    // We animate these from 0 to the final value over 1 second
    Utils.animateValue('statTotalLent', 0, summary.total_lent || 0, 1000);
    Utils.animateValue('statCollected', 0, summary.total_collected || 0, 1000);
    Utils.animateValue('statInterest', 0, summary.total_interest_earned || 0, 1000);
    Utils.animateValue('statOutstanding', 0, summary.total_outstanding || 0, 1000);

    // Fill in the counts (total borrowers)
    Utils.animateValue('statMonthlyCount', 0, summary.total_borrowers || 0, 1000, false);

    // 5. Build and show charts/lists
    renderGoalChart(trends);      // The bar chart at the bottom
    renderUpcomingBills(upcoming); // The "Upcoming" tab list
    renderPortfolioPie(summary);   // The donut/pie chart on the right
    await loadRecentActivity(user.id); // The "Recent" tab list (default)

  } catch (error) {
    console.error('Failed to load dashboard:', error);
    Toast.error('Could not load dashboard data. Please refresh.');
  }
}


// Show "Good Morning/Afternoon/Evening" based on time
function displayGreeting(fullName) {
  const navGreeting = document.getElementById('navGreeting');
  const mainGreeting = document.getElementById('mainGreeting');
  
  const currentHour = new Date().getHours();
  let timeOfDay = 'Evening';

  if (currentHour < 12) {
    timeOfDay = 'Morning';
  } else if (currentHour < 17) {
    timeOfDay = 'Afternoon';
  }

  const firstName = fullName ? fullName.split(' ')[0] : 'User';
  const fullGreeting = `Good ${timeOfDay}, ${firstName}`;
  
  if (navGreeting) navGreeting.textContent = fullGreeting;
  if (mainGreeting) mainGreeting.textContent = fullGreeting;
}


// Switch between "Recent Activity" and "Upcoming Dues" tabs
function switchDashboardTab(tabName) {
  // Update button appearances
  const tabButtons = document.querySelectorAll('.tab-btn');
  for (const btn of tabButtons) {
    const isClicked = btn.getAttribute('onclick').includes(tabName);
    btn.classList.toggle('active', isClicked);
  }

  // Show/Hide the actual content lists
  const recentTab = document.getElementById('tabRecent');
  const upcomingTab = document.getElementById('tabUpcoming');

  if (tabName === 'recent') {
    recentTab.classList.add('active');
    upcomingTab.classList.remove('active');
  } else {
    recentTab.classList.remove('active');
    upcomingTab.classList.add('active');
  }
}


// Build the "Upcoming Dues" list
function renderUpcomingBills(upcomingList) {
  const container = document.getElementById('upcomingDues');
  if (!container) return;

  if (!upcomingList || upcomingList.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8);">
        <div class="empty-state-icon">${getIcon('calendar')}</div>
        <h3>No dues soon</h3>
        <p>You are all caught up!</p>
      </div>`;
    return;
  }

  let html = '';
  for (const due of upcomingList) {
    // If overdue, red badge. If upcoming, blue badge.
    const badgeColor = due.is_overdue ? 'badge-danger' : 'badge-primary';
    const label = due.is_overdue ? 'Overdue' : Utils.formatDateRelative(due.next_due);

    html += `
      <div class="activity-item ripple" onclick="window.location.href='person-detail.html?id=${due.person_id}'">
        <div class="activity-icon" style="background:var(--primary-50); color:var(--primary-500);">${getIcon('calendar')}</div>
        <div class="activity-info">
          <p><strong>${due.person_name}</strong></p>
          <div><span class="badge ${badgeColor}" style="font-size:10px;">${label}</span></div>
        </div>
        <span class="activity-amount" style="font-weight:700; color:var(--primary-600);">${Utils.formatCurrency(due.amount)}</span>
      </div>`;
  }
  container.innerHTML = html;
}


// Build the Bar Chart (Projected vs Actual)
function renderGoalChart(trends) {
  const container = document.getElementById('monthlyChart');
  if (!container || !trends || trends.length === 0) return;

  // Find the highest value to scale the bars correctly
  let maxMoney = 100;
  for (const t of trends) {
    if (t.amount_collected > maxMoney) maxMoney = t.amount_collected;
    if (t.projected_collections > maxMoney) maxMoney = t.projected_collections;
  }

  let html = '';
  for (let i = 0; i < trends.length; i++) {
    const t = trends[i];
    const actualHeight = (t.amount_collected / maxMoney) * 100;
    const projectedHeight = (t.projected_collections / maxMoney) * 100;
    const monthLabel = Utils.formatMonthName(t.month);

    html += `
      <div class="chart-bar-wrapper">
        <div class="chart-stack" title="Goal: ${Utils.formatCurrency(t.projected_collections)} | Actual: ${Utils.formatCurrency(t.amount_collected)}">
          <div class="chart-bar projected" style="height:${Math.max(projectedHeight, 2)}%;"></div>
          <div class="chart-bar actual"    style="height:${Math.max(actualHeight, 2)}%;"></div>
        </div>
        <span class="chart-label">${monthLabel}</span>
      </div>`;
  }
  container.innerHTML = html;
}


// Load the 6 most recent payments
async function loadRecentActivity(userId) {
  const container = document.getElementById('recentActivity');
  if (!container) return;

  try {
    const payments = await API.payments.getAll(userId, null, 6); // Fetch 6 items

    if (!payments || payments.length === 0) {
      container.innerHTML = `<div class="empty-state">No activity yet</div>`;
      return;
    }

    let html = '';
    for (const pay of payments) {
      const name = pay.person_name || 'Borrower';
      const date = Utils.formatDateRelative(pay.date);

      html += `
        <div class="activity-item ripple" onclick="window.location.href='person-detail.html?id=${pay.person_id}'">
          <div class="activity-icon">${getIcon('trending')}</div>
          <div class="activity-info">
            <p><strong>${name}</strong></p>
            <div style="display:flex; gap:8px; align-items:center;">
              <span class="badge badge-light" style="font-size:10px;">${pay.type}</span>
              <small style="color:var(--text-tertiary);">${date}</small>
            </div>
          </div>
          <span class="activity-amount" style="font-weight:700; color:var(--success-600);">+${Utils.formatCurrency(pay.amount)}</span>
        </div>`;
    }
    container.innerHTML = html;
  } catch (err) {
    console.warn('Could not load recent activity');
  }
}


// Build the Pie/Donut breakdown chart
function renderPortfolioPie(summary) {
  const container = document.getElementById('portfolioDonut');
  if (!container) return;

  const active = summary.active_borrowers || 0;
  const overdue = summary.overdue_borrowers || 0;
  const closed = summary.closed_borrowers || 0;
  const total = summary.total_borrowers || (active + overdue + closed) || 1;

  // Calculate degrees for the circle (0 to 360)
  const activeDeg = (active / total) * 360;
  const overdueDeg = ((active + overdue) / total) * 360;

  // Set CSS conic-gradient
  container.style.background = `conic-gradient(
    var(--primary-500) 0deg ${activeDeg}deg,
    var(--danger-500) ${activeDeg}deg ${overdueDeg}deg,
    var(--success-500) ${overdueDeg}deg 360deg
  )`;

  // Update central number
  const innerValue = container.querySelector('.donut-chart-inner .value');
  if (innerValue) innerValue.textContent = total;

  // Update the labels (Legend)
  const legend = document.getElementById('portfolioLegend');
  if (legend) {
    legend.innerHTML = `
      <div class="legend-item"><span class="dot primary"></span> Active (${active})</div>
      <div class="legend-item"><span class="dot danger"></span> Overdue (${overdue})</div>
      <div class="legend-item"><span class="dot success"></span> Closed (${closed})</div>
    `;
  }
}
