/* ============================================
   FinSmart – Authentication Logic
   Simplified Beginner Version
============================================ */

'use strict';


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
        var rememberMe = false;
        if (rememberCheckbox) {
            rememberMe = rememberCheckbox.checked;
        }

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

            Toast.success('Welcome back, ' + userDataFromAPI.name);
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
        var termsAgree = false;
        if (termsCheckbox) {
            termsAgree = termsCheckbox.checked;
        }

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
        // Toggle steps visibility
        var steps = document.querySelectorAll('.setup-step');
        for (var i = 0; i < steps.length; i++) {
            steps[i].classList.remove('active');
        }

        var target = document.querySelector('.setup-step[data-step="' + step + '"]');
        if (target) {
            target.classList.add('active');
        }

        // Update progress indicators (wizard steps)
        var wizardSteps = document.querySelectorAll('.wizard-step');
        var connectors = document.querySelectorAll('.wizard-connector');

        for (var i = 0; i < wizardSteps.length; i++) {
            var stepNum = i + 1;
            var wStep = wizardSteps[i];

            wStep.classList.remove('active', 'completed');

            if (stepNum === step) {
                wStep.classList.add('active');
            } else if (stepNum < step) {
                wStep.classList.add('completed');
            }
        }

        for (var j = 0; j < connectors.length; j++) {
            var connNum = j + 1;
            connectors[j].classList.remove('completed');
            if (connNum < step) {
                connectors[j].classList.add('completed');
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    var nextBtns = document.querySelectorAll('.setup-next');
    for (var i = 0; i < nextBtns.length; i++) {
        nextBtns[i].addEventListener('click', function () {
            if (currentStep < totalSteps) {
                if (currentStep === 1) {
                    var biz = document.getElementById('setupBusiness').value.trim();
                    if (!biz) {
                        Toast.warning('Please enter your business name');
                        var input = document.getElementById('setupBusiness');
                        input.classList.add('error');
                        input.focus();
                        return;
                    }
                    document.getElementById('setupBusiness').classList.remove('error');
                }
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
                Toast.error('Session expired. Please login again.');
                window.location.href = 'login.html';
                return;
            }

            setButtonLoading(finishBtn, true);

            try {
                // Update profile with business info
                var updatedUser = await API.auth.updateProfile(user.id, {
                    business_name: business,
                    business_type: bizType
                });

                // Update lending preferences
                await API.settings.update(user.id, {
                    currency: currency,
                    default_interest_rate: parseFloat(interest) || 2,
                    default_interest_mode: 'per_100',
                    default_interest_type: 'monthly'
                });

                // Update local storage
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

                Toast.success('Profile and preferences saved!');

                // Add a small delay for the toast
                setTimeout(function () {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                setButtonLoading(finishBtn, false);
                Toast.error(error.message || 'Failed to complete setup');
            }
        });
    }

    showStep(1);
}


/* =========================
   AUTO INIT
========================= */

document.addEventListener('DOMContentLoaded', function () {

    var path = window.location.pathname;
    var page = path.substring(path.lastIndexOf('/') + 1);

    if (page === 'login.html') initLogin();
    if (page === 'signup.html') initSignup();
    if (page === 'setup.html') initSetup();
});





