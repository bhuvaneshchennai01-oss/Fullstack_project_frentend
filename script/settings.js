/* ============================================
   FinSmart – Settings Page Logic
   ============================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.guard()) return;
    initSettings();
});

// ── Initialize all settings panels ──
async function initSettings() {
    initSettingsNav();
    await loadProfileSettings();

    await initPreferences();
    initSecurity();
    initDangerZone();
}

// ── Navigation between settings panels ──
function initSettingsNav() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const mobileHeaders = document.querySelectorAll('.settings-mobile-header');
    const groups = document.querySelectorAll('.settings-group');
    const panels = document.querySelectorAll('.settings-panel');

    const setActivePanel = (panelId) => {
        // Desktop Sync
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.panel === panelId);
        });

        // Content Sync
        groups.forEach(group => {
            const isTarget = group.querySelector('.settings-panel').id === panelId;
            
            // On mobile, we might want to toggle (accordion style)
            // On desktop, we just switch
            if (window.innerWidth <= 1024) {
               group.classList.toggle('active', isTarget && !group.classList.contains('active'));
            } else {
               group.classList.toggle('active', isTarget);
               group.querySelector('.settings-panel').classList.toggle('active', isTarget);
            }
        });

        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === panelId);
        });
    };

    // Desktop Nav Clicks
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            setActivePanel(item.dataset.panel);
            
            // Scroll to top of content on desktop if needed
            if (window.innerWidth > 1024) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    // Mobile Header (Accordion) Clicks
    mobileHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const panelId = header.dataset.panel;
            const group = header.closest('.settings-group');
            const isActive = group.classList.contains('active');

            // Close all other groups on mobile for accordion effect
            groups.forEach(g => g.classList.remove('active'));

            if (!isActive) {
                group.classList.add('active');
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Sync desktop nav just in case
            navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.panel === panelId);
            });
        });
    });
}

// ── Profile Section ──
async function loadProfileSettings() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const profile = await API.auth.getMe(user.id);

        const nameEl = document.getElementById('settingsName');
        const emailEl = document.getElementById('settingsEmail');
        const bizEl = document.getElementById('settingsBusiness');

        const bizTypeEl = document.getElementById('settingsBusinessType');

        if (nameEl) nameEl.value = profile.name || '';
        if (emailEl) emailEl.value = profile.email || '';
        if (bizEl) bizEl.value = profile.business_name || '';
        if (bizTypeEl) bizTypeEl.value = profile.business_type || '';

        const saveBtn = document.getElementById('saveProfile');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const name = nameEl?.value.trim();
                const business = bizEl?.value.trim();
                const businessType = bizTypeEl?.value.trim();

                if (!name) { Toast.warning('Name is required'); return; }

                setButtonLoading(saveBtn, true);
                try {
                    const updated = await API.auth.updateProfile(user.id, { 
                        name, 
                        business_name: business,
                        business_type: businessType 
                    });

                    // Update local DB & sidebar
                    DB.set('user', { 
                        ...user, 
                        name: updated.name, 
                        business: updated.business_name,
                        business_type: updated.business_type 
                    });
                    Sidebar.updateUserInfo();

                    Toast.success('Profile updated successfully!');
                } catch (error) {
                    Toast.error(error.message || 'Failed to update profile');
                } finally {
                    setButtonLoading(saveBtn, false);
                }
            });
        }
    } catch (error) {
        console.error('Profile Load Error:', error);
    }
}



// ── Preferences Section ──
async function initPreferences() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const settings = await API.settings.get(user.id);

        const currencyEl = document.getElementById('prefCurrency');
        const interestEl = document.getElementById('prefInterest');

        if (currencyEl) currencyEl.value = settings.currency || 'INR';
        if (interestEl) interestEl.value = settings.default_interest_rate || '2';

        const saveBtn = document.getElementById('savePreferences');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const currency = currencyEl?.value || 'INR';
                const defaultInterest = parseFloat(interestEl?.value) || 2;
                const defaultMode = 'per_100';
                const defaultType = 'monthly';

                setButtonLoading(saveBtn, true);
                try {
                    await API.settings.update(user.id, {
                        currency,
                        default_interest_rate: defaultInterest,
                        default_interest_mode: defaultMode,
                        default_interest_type: defaultType
                    });

                    DB.set('settings', { currency, defaultInterest, defaultMode, defaultType });
                    Toast.success('Preferences saved!');
                } catch (error) {
                    Toast.error(error.message || 'Failed to save preferences');
                } finally {
                    setButtonLoading(saveBtn, false);
                }
            });
        }
    } catch (error) {
        console.error('Settings Load Error:', error);
    }
}

// ── Security Section (Change Password) ──
function initSecurity() {
    const btn = document.getElementById('btnChangePassword');
    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const confirmInput = document.getElementById('confirmNewPassword');

    if (!btn || !currentInput || !newInput || !confirmInput) return;

    // Real-time matching validation
    const validateMatching = () => {
        const password = newInput.value;
        const confirm = confirmInput.value;

        // Remove existing matching indicators
        confirmInput.classList.remove('match-success', 'match-error');
        
        if (confirm.length > 0) {
            if (password === confirm) {
                confirmInput.classList.add('match-success');
            } else {
                confirmInput.classList.add('match-error');
            }
        }
    };

    newInput.addEventListener('input', validateMatching);
    confirmInput.addEventListener('input', validateMatching);

    btn.addEventListener('click', async () => {
        const currentPassword = currentInput.value;
        const newPassword = newInput.value;
        const confirmNew = confirmInput.value;

        const form = btn.closest('.card');
        clearFormErrors(form);

        let valid = true;
        if (!currentPassword) { 
            showFieldError('currentPassword', 'Current password is required'); 
            valid = false; 
        }
        if (!newPassword || newPassword.length < 6) { 
            showFieldError('newPassword', 'Minimum 6 characters required'); 
            valid = false; 
        }
        if (newPassword !== confirmNew) { 
            showFieldError('confirmNewPassword', 'Passwords do not match'); 
            valid = false; 
        }

        if (!valid) return;

        const user = getCurrentUser();
        if (!user) return;

        setButtonLoading(btn, true);
        try {
            await API.auth.changePassword(currentPassword, newPassword, user.id);
            Toast.success('Password updated successfully!');

            currentInput.value = '';
            newInput.value = '';
            confirmInput.value = '';
            confirmInput.classList.remove('match-success');
        } catch (error) {
            const msg = error.message || '';
            if (msg.includes('current') || msg.includes('incorrect')) {
                showFieldError('currentPassword', 'Incorrect current password');
            } else {
                Toast.error(msg || 'Failed to update password');
            }
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

// ── Danger Zone ──
function initDangerZone() {
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn?.addEventListener('click', logout);

    const clearBtn = document.getElementById('clearAllData');
    clearBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This will log you out and clear local cache.')) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
}