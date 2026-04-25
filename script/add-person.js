/* ============================================
   FinSmart – Add Borrower Form Logic
============================================ */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    if (!Auth.guard()) {
        return;
    }

    initAddPersonForm();
});


function initAddPersonForm() {

    var form = document.getElementById('addPersonForm');
    if (!form) return;

    var user = getCurrentUser();
    if (!user) return;

    // Input elements
    var loanInput = document.getElementById('personLoanAmount');
    var interestInput = document.getElementById('personInterestRate');
    var durationInput = document.getElementById('personDuration');
    var phoneInput = document.getElementById('personPhone');


    /* =========================
       1. PHONE VALIDATION
    ========================== */
    phoneInput.addEventListener('input', function (e) {

        var value = e.target.value;

        // Remove non-digits
        value = value.replace(/[^0-9]/g, '');

        if (value.length > 10) {
            value = value.substring(0, 10);
        }

        e.target.value = value;
    });


    /* =========================
       2. CALCULATION LOGIC
    ========================== */

    function updateCalculations() {

        var amount = parseFloat(loanInput.value) || 0;
        var rate = parseFloat(interestInput.value) || 0;
        var mode = 'per_100';
        var type = 'monthly';
        var durationCycles = parseInt(durationInput.value) || 12;

        var periodAmountEl = document.getElementById('calcMonthly');
        var durationTotalEl = document.getElementById('calcYearly');
        var totalEl = document.getElementById('calcTotal');

        // Labels are fixed now
        var periodInterest = (amount / 100) * rate;
        var totalInterest = periodInterest * durationCycles;
        var totalMaturity = amount + totalInterest;

        if (periodAmountEl) {
            periodAmountEl.textContent = Utils.formatCurrency(periodInterest);
        }

        if (durationTotalEl) {
            durationTotalEl.textContent = Utils.formatCurrency(totalInterest);
        }

        if (totalEl) {
            totalEl.textContent = Utils.formatCurrency(totalMaturity);
        }
    }


    // Attach calculation events
    var inputs = [loanInput, interestInput, durationInput];

    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i]) {
            inputs[i].addEventListener('input', updateCalculations);
            inputs[i].addEventListener('change', updateCalculations);
        }
    }


    /* =========================
       3. FORM SUBMIT
    ========================== */

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        clearFormErrors(form);

        var data = {
            name: getValue('personName'),
            phone: getValue('personPhone'),
            email: getValue('personEmail'),
            address: getValue('personAddress'),
            given_amount: parseFloat(getValue('personLoanAmount')) || 0,
            interest_amount: parseFloat(getValue('personInterestRate')) || 0,
            interest_type: 'monthly',
            interest_mode: 'per_100',
            start_date: getValue('personStartDate') || null,
            duration: parseInt(getValue('personDuration')) || 12,
            notes: getValue('personNotes')
        };

        var valid = true;

        if (!data.name || data.name.length < 2) {
            showFieldError('personName', 'Name is required');
            valid = false;
        }

        if (!data.phone || data.phone.length < 10) {
            showFieldError('personPhone', 'Valid 10-digit phone required');
            valid = false;
        }

        if (data.email && !Utils.isValidEmail(data.email)) {
            showFieldError('personEmail', 'Enter valid email');
            valid = false;
        }

        if (!data.given_amount || data.given_amount <= 0) {
            showFieldError('personLoanAmount', 'Enter valid amount');
            valid = false;
        }

        if (!data.interest_amount || data.interest_amount < 0) {
            showFieldError('personInterestRate', 'Enter valid interest');
            valid = false;
        }

        if (!data.start_date) {
            showFieldError('personStartDate', 'Start date required');
            valid = false;
        }

        if (!data.duration || data.duration < 1) {
            showFieldError('personDuration', 'Duration required');
            valid = false;
        }

        if (!valid) return;

        var btn = form.querySelector('.btn-primary');
        setButtonLoading(btn, true);

        try {

            await API.persons.create(user.id, data);

            Toast.success(data.name + " added successfully!");

            setTimeout(function () {
                window.location.href = "persons.html";
            }, 800);

        } catch (error) {

            setButtonLoading(btn, false);
            Toast.error(error.message || "Failed to add borrower");
        }
    });


    /* =========================
       DEFAULT VALUES
    ========================== */

    var dateInput = document.getElementById('personStartDate');
    if (dateInput && !dateInput.value) {
        var today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
    }

    var settings = DB.get('settings');

    if (settings) {

        if (interestInput && !interestInput.value && settings.defaultInterest) {
            interestInput.value = settings.defaultInterest;
        }
    }

    updateCalculations();
}


/* =========================
   HELPER
========================== */

function getValue(id) {

    var el = document.getElementById(id);

    if (el) {
        return el.value.trim();
    }

    return '';
}