/* ============================================
   FinSmart – Authentication Logic
   Clean & Fixed Version
============================================ */

'use strict';


/* =========================
   AUTH CORE
   Note: Auth, DB, Utils, Toast, getCurrentUser are all defined in app.js
   which is loaded before this script. Do NOT redefine them here.
========================= */


/* =========================
   LOGIN
========================= */

function initLogin() {

    var user = getCurrentUser();
    if (user) {
        window.location.href = 'dashboard.html';
        return;
    }

    var form = document.getElementById('loginForm');
    if (!form) return;

    var firstInput = form.querySelector('input');
    if (firstInput) {
        setTimeout(function () {
            firstInput.focus();
        }, 300);
    }

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        var email = form.querySelector('#loginEmail').value.trim();
        var password = form.querySelector('#loginPassword').value;

        var rememberCheckbox = form.querySelector('#rememberMe');
        var rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

        clearFormErrors(form);

        var valid = true;

        if (!email || !Utils.isValidEmail(email)) {
            showFieldError('loginEmail', 'Enter valid email');
            valid = false;
        }

        if (!password || password.length < 6) {
            showFieldError('loginPassword', 'Password must be 6+ characters');
            valid = false;
        }

        if (!valid) return;

        var btn = form.querySelector('.btn-primary');
        setButtonLoading(btn, true);

        try {

            var userDataFromAPI = await API.auth.login(email, password);

            if (!userDataFromAPI || !userDataFromAPI.id) {
                throw new Error("Invalid response from server");
            }

            var userData = {
                id: userDataFromAPI.id,
                name: userDataFromAPI.name,
                email: userDataFromAPI.email,
                business: userDataFromAPI.business_name || ''
            };

            DB.set('user', userData, rememberMe);

            try {

                var settings = await API.settings.get(userData.id);

                if (settings) {
                    DB.set('settings', {
                        currency: settings.currency || 'INR',
                        defaultInterest: settings.default_interest_rate || 2,
                        defaultMode: 'per_100',
                        defaultType: 'monthly'
                    }, rememberMe);
                }

            } catch (err) {
                console.warn('Settings cache failed');
            }

            Toast.success('Welcome back, ' + userData.name);

            setTimeout(function () {
                window.location.href = 'dashboard.html';
            }, 800);

        } catch (error) {

            setButtonLoading(btn, false);
            Toast.error(error.message || 'Invalid login');
        }
    });
}


/* =========================
   SIGNUP
========================= */

function initSignup() {

    var user = getCurrentUser();
    if (user) {
        window.location.href = 'dashboard.html';
        return;
    }

    var form = document.getElementById('signupForm');
    if (!form) return;

    var firstInput = form.querySelector('input');
    if (firstInput) {
        setTimeout(function () {
            firstInput.focus();
        }, 300);
    }

    form.addEventListener('submit', async function (e) {

        e.preventDefault();

        var name = form.querySelector('#signupName').value.trim();
        var email = form.querySelector('#signupEmail').value.trim();
        var password = form.querySelector('#signupPassword').value;
        var confirmPassword = form.querySelector('#signupConfirmPassword').value;

        var termsCheckbox = form.querySelector('#termsAgree');
        var termsAgree = termsCheckbox ? termsCheckbox.checked : false;

        clearFormErrors(form);

        var valid = true;

        if (!name || name.length < 2) {
            showFieldError('signupName', 'Enter full name');
            valid = false;
        }

        if (!email || !Utils.isValidEmail(email)) {
            showFieldError('signupEmail', 'Enter valid email');
            valid = false;
        }

        if (!password || password.length < 6) {
            showFieldError('signupPassword', 'Password 6+ characters');
            valid = false;
        }

        if (password !== confirmPassword) {
            showFieldError('signupConfirmPassword', 'Passwords do not match');
            valid = false;
        }

        if (!termsAgree) {
            Toast.warning('You must accept terms');
            valid = false;
        }

        if (!valid) return;

        var btn = form.querySelector('.btn-primary');
        setButtonLoading(btn, true);

        try {

            var newUser = await API.auth.signup({
                name: name,
                email: email,
                password: password
            });

            if (!newUser || !newUser.id) {
                throw new Error("Invalid response from server");
            }

            DB.set('user', {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                business: newUser.business_name || ''
            });

            Toast.success('Account created!');

            setTimeout(function () {
                window.location.href = 'setup.html';
            }, 800);

        } catch (error) {

            setButtonLoading(btn, false);
            Toast.error(error.message || 'Signup failed');
        }
    });

    var socialBtns = form.querySelectorAll('.social-login .btn');

    for (var i = 0; i < socialBtns.length; i++) {
        socialBtns[i].addEventListener('click', function () {
            Toast.info('Social signup coming soon');
        });
    }
}


/* =========================
   SETUP WIZARD
========================= */

function initSetup() {

    var wizard = document.querySelector('.setup-card');
    if (!wizard) return;

    var currentStep = 1;
    var totalSteps = 3;

    function showStep(step) {

        var steps = document.querySelectorAll('.setup-step');

        for (var i = 0; i < steps.length; i++) {
            steps[i].classList.remove('active');
        }

        var target = document.querySelector('.setup-step[data-step="' + step + '"]');
        if (target) target.classList.add('active');

        var wizardSteps = document.querySelectorAll('.wizard-step');
        var connectors = document.querySelectorAll('.wizard-connector');

        for (var i = 0; i < wizardSteps.length; i++) {

            wizardSteps[i].classList.remove('active', 'completed');

            if (i + 1 === step) {
                wizardSteps[i].classList.add('active');
            } else if (i + 1 < step) {
                wizardSteps[i].classList.add('completed');
            }
        }

        for (var j = 0; j < connectors.length; j++) {
            connectors[j].classList.toggle('completed', j + 1 < step);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    var nextBtns = document.querySelectorAll('.setup-next');
    for (var i = 0; i < nextBtns.length; i++) {
        nextBtns[i].addEventListener('click', function () {

            if (currentStep === 1) {

                var biz = document.getElementById('setupBusiness').value.trim();
                var input = document.getElementById('setupBusiness');

                if (!biz) {
                    Toast.warning('Please enter your business name');
                    input.classList.add('error');
                    input.focus();
                    return;
                }

                input.classList.remove('error');
            }

            if (currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
            }
        });
    }

    var prevBtns = document.querySelectorAll('.setup-prev');
    for (var j = 0; j < prevBtns.length; j++) {
        prevBtns[j].addEventListener('click', function () {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    var finishBtn = document.querySelector('.setup-finish');

    if (finishBtn) {
        finishBtn.addEventListener('click', async function () {

            var business = document.getElementById('setupBusiness').value.trim();
            var bizType = document.getElementById('setupType').value;
            var currency = document.getElementById('setupCurrency').value;
            var interest = document.getElementById('setupInterest').value;

            var user = getCurrentUser();

            if (!user) {
                Toast.error('Session expired');
                window.location.href = 'login.html';
                return;
            }

            setButtonLoading(finishBtn, true);

            try {

                await API.auth.updateProfile(user.id, {
                    business_name: business,
                    business_type: bizType
                });

                await API.settings.update(user.id, {
                    currency: currency,
                    default_interest_rate: parseFloat(interest) || 2,
                    default_interest_mode: 'per_100',
                    default_interest_type: 'monthly'
                });

                DB.set('user', {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    business: business
                });

                DB.set('settings', {
                    currency: currency,
                    defaultInterest: parseFloat(interest) || 2,
                    defaultMode: 'per_100',
                    defaultType: 'monthly'
                });

                Toast.success('Setup completed!');

                setTimeout(function () {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                setButtonLoading(finishBtn, false);
                Toast.error(error.message || 'Setup failed');
            }
        });
    }

    showStep(1);
}


/* =========================
   AUTO INIT
========================= */

document.addEventListener('DOMContentLoaded', function () {

    var page = window.location.pathname.split('/').pop();

    if (page === 'login.html') initLogin();
    if (page === 'signup.html') initSignup();
    if (page === 'setup.html') initSetup();
});