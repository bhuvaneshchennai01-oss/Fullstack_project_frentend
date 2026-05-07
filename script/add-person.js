document.addEventListener("DOMContentLoaded", function () {
    initAddPersonForm();
});

function initAddPersonForm() {

    var form = document.getElementById("addPersonForm");
    if (!form) return;

    var user = getCurrentUser();
    if (!user) return;

    var loanInput = document.getElementById("personLoanAmount");
    var interestInput = document.getElementById("personInterestRate");
    var durationInput = document.getElementById("personDuration");
    var phoneInput = document.getElementById("personPhone");


    /* =========================
       PHONE VALIDATION
    ========================== */
    phoneInput.addEventListener("input", function (e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
    });


    /* =========================
       CALCULATION
    ==========================h */
    function updateCalculations() {

        var amount = parseFloat(loanInput.value) || 0;
        var rate = parseFloat(interestInput.value) || 0;
        var months = parseInt(durationInput.value) || 12;

        var perPeriod = (amount / 100) * rate;
        var totalInterest = perPeriod * months;
        var total = amount + totalInterest;

        setText("calcMonthly", Utils.formatCurrency(perPeriod));
        setText("calcYearly", Utils.formatCurrency(totalInterest));
        setText("calcTotal", Utils.formatCurrency(total));
    }

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }


    [loanInput, interestInput, durationInput].forEach(function (el) {
        if (!el) return;
        el.addEventListener("input", updateCalculations);
        el.addEventListener("change", updateCalculations);
    });


    /* =========================
       FORM SUBMIT
    ========================== */
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        clearFormErrors(form);

        var data = {
            name: getVal("personName"),
            phone: getVal("personPhone"),
            email: getVal("personEmail"),
            address: getVal("personAddress"),
            given_amount: parseFloat(getVal("personLoanAmount")) || 0,
            interest_amount: parseFloat(getVal("personInterestRate")) || 0,
            interest_type: "monthly",
            interest_mode: "per_100",
            start_date: getVal("personStartDate") || null,
            duration: parseInt(getVal("personDuration")) || 12,
            notes: getVal("personNotes")
        };

        var valid = validate(data);
        if (!valid) return;

        var btn = form.querySelector(".btn-primary");
        setButtonLoading(btn, true);

        try {
            await API.persons.create(user.id, data);

            Toast.success(data.name + " added successfully!");

            setTimeout(function () {
                window.location.href = "persons.html";
            }, 800);

        } catch (err) {
            setButtonLoading(btn, false);
            Toast.error(err.message || "Failed to add borrower");
        }
    });


    function validate(d) {
        var ok = true;

        if (!d.name || d.name.length < 2) {
            showFieldError("personName", "Name is required");
            ok = false;
        }

        if (!d.phone || d.phone.length < 10) {
            showFieldError("personPhone", "Valid 10-digit phone required");
            ok = false;
        }

        if (d.email && !Utils.isValidEmail(d.email)) {
            showFieldError("personEmail", "Enter valid email");
            ok = false;
        }

        if (!d.given_amount || d.given_amount <= 0) {
            showFieldError("personLoanAmount", "Enter valid amount");
            ok = false;
        }

        if (d.interest_amount < 0) {
            showFieldError("personInterestRate", "Enter valid interest");
            ok = false;
        }

        if (!d.start_date) {
            showFieldError("personStartDate", "Start date required");
            ok = false;
        }

        if (!d.duration || d.duration < 1) {
            showFieldError("personDuration", "Duration required");
            ok = false;
        }

        return ok;
    }


    function getVal(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
    }


    /* =========================
       DEFAULT VALUES
    ========================== */
    var dateInput = document.getElementById("personStartDate");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }

    var settings = DB.get("settings");
    if (settings && interestInput && !interestInput.value) {
        interestInput.value = settings.defaultInterest || "";
    }

    updateCalculations();
}