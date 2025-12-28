// LINQ AI - B2B Sales Intelligence Platform JavaScript
// =============================================================================
// CONFIGURATION - Auto-detects development vs production
// =============================================================================

const CONFIG = {
    // Auto-detect environment based on hostname
    get API_BASE_URL() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000/api/v1';
        }
        // Production API URL - update this after Render deployment
        return 'https://linq-api.onrender.com/api/v1';
    },

    // Paystack public key (same for test/live, but you should use live key in prod)
    PAYSTACK_PUBLIC_KEY: 'pk_test_1f5344a2bfcc4d0760b49cff752313e08e22d5b2',

    // Chrome extension URL
    CHROME_EXTENSION_URL: '#',

    // Get current page URL for callbacks
    get CALLBACK_URL() {
        return `${window.location.origin}/?payment=callback`;
    }
};

// =============================================================================
// STATE
// =============================================================================

let currentBillingPeriod = 'monthly';
let selectedPlan = null;
let currentUser = null;
let apiConfig = null; // Will be fetched from backend

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const signupModal = document.getElementById('signup-modal');
const loginModal = document.getElementById('login-modal');
const successModal = document.getElementById('success-modal');
const dashboardModal = document.getElementById('dashboard-modal');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const billingToggle = document.getElementById('billing-toggle');

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', async function() {
    // Fetch config from backend (gets Paystack key, etc.)
    await fetchApiConfig();

    // Initialize UI components
    initSmoothScroll();
    initNavbarScroll();
    initAnimations();
    initBillingToggle();
    initPricingButtons();
    initModals();
    initForms();
    initDashboardAnimation();
    initMobileMenu();

    // Check for payment callback
    checkPaymentCallback();

    // Check if user is already logged in
    checkExistingSession();
});

// =============================================================================
// API CONFIGURATION
// =============================================================================

async function fetchApiConfig() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/feed/config`);
        if (response.ok) {
            apiConfig = await response.json();
            console.log('API Config loaded:', apiConfig.environment);

            // Use Paystack key from backend if available
            if (apiConfig.paystack_public_key) {
                CONFIG.PAYSTACK_PUBLIC_KEY = apiConfig.paystack_public_key;
            }
        }
    } catch (error) {
        console.warn('Could not fetch API config, using defaults:', error.message);
    }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

function checkExistingSession() {
    const token = localStorage.getItem('linq_token');
    const user = localStorage.getItem('linq_user');

    if (token && user) {
        try {
            currentUser = JSON.parse(user);
            updateUIForLoggedInUser();
        } catch (e) {
            // Invalid stored data, clear it
            localStorage.removeItem('linq_token');
            localStorage.removeItem('linq_user');
        }
    }
}

function updateUIForLoggedInUser() {
    // Update login button to show user is logged in
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn && currentUser) {
        loginBtn.textContent = 'Dashboard';
        loginBtn.href = '#';
        loginBtn.onclick = (e) => {
            e.preventDefault();
            showDashboard();
        };
    }
}

function showDashboard() {
    if (!dashboardModal) return;
    renderDashboardContent();
    openModal(dashboardModal);
}

async function renderDashboardContent() {
    const dashboardBody = document.getElementById('dashboard-body');
    if (!dashboardBody) return;

    dashboardBody.innerHTML = '<div style="text-align:center;padding:24px;">Loading your dashboard...</div>';

    // Fetch user subscription status from backend (pseudo-endpoint, adjust as needed)
    let subscription = null;
    try {
        const token = localStorage.getItem('linq_token');
        const resp = await fetch(`${CONFIG.API_BASE_URL}/subscription/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
            subscription = await resp.json();
        }
    } catch (e) {}

    // If user has no active subscription or is on free trial
    if (!subscription || !subscription.active) {
        dashboardBody.innerHTML = `
            <h3>Choose a Plan to Unlock Full Access</h3>
            <div style="margin: 16px 0;">
                <button class="btn btn-primary" data-dashboard-plan="starter" data-amount="2900">Subscribe Starter ($29/mo)</button>
                <button class="btn btn-primary" data-dashboard-plan="professional" data-amount="7900" style="margin-left:12px;">Subscribe Professional ($79/mo)</button>
            </div>
            <div style="margin: 16px 0;">
                <button class="btn btn-secondary" data-dashboard-plan="free_trial" data-amount="0">Continue Free Trial</button>
            </div>
            <p style="margin-top:24px;">After subscribing, you'll receive an access code to activate the Chrome extension.</p>
        `;
        // Add event listeners for plan buttons
        dashboardBody.querySelectorAll('[data-dashboard-plan]').forEach(btn => {
            btn.onclick = async function() {
                const plan = this.getAttribute('data-dashboard-plan');
                const amount = parseInt(this.getAttribute('data-amount'));
                await handleDashboardPlanSelect(plan, amount);
            };
        });
        return;
    }

    // If user is subscribed, show access code and extension instructions
    dashboardBody.innerHTML = `
        <h3>You're Subscribed!</h3>
        <div class="access-code-display" style="margin:24px 0;">
            <label>Your Access Code</label>
            <div class="code-box" id="dashboard-access-code">Loading...</div>
            <button class="btn btn-outline" id="dashboard-copy-code-btn">Copy Code</button>
        </div>
        <p>Use this code to activate the Chrome extension and unlock all features.</p>
        <div style="margin-top:24px;">
            <a href="#" class="btn btn-primary" id="dashboard-download-extension-btn">Download Chrome Extension</a>
        </div>
    `;
    // Fetch and display access code
    const token = localStorage.getItem('linq_token');
    const codeBox = document.getElementById('dashboard-access-code');
    if (codeBox) {
        try {
            const code = await generateAccessCode(token);
            codeBox.textContent = code;
        } catch (e) {
            codeBox.textContent = 'Error fetching code';
        }
    }
    document.getElementById('dashboard-copy-code-btn')?.addEventListener('click', copyAccessCode);
    document.getElementById('dashboard-download-extension-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (CONFIG.CHROME_EXTENSION_URL !== '#') {
            window.open(CONFIG.CHROME_EXTENSION_URL, '_blank');
        } else {
            alert('Chrome extension coming soon! Your access code has been saved.');
        }
    });
}

async function handleDashboardPlanSelect(plan, amount) {
    // If free trial, just show a message
    if (amount === 0) {
        document.getElementById('dashboard-body').innerHTML = `
            <h3>You're on a Free Trial</h3>
            <p>Track up to 5 companies and try LINQ risk-free. Upgrade anytime to unlock more features!</p>
        `;
        return;
    }
    // Paid plan: initialize payment
    try {
        const token = localStorage.getItem('linq_token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/subscription/paystack/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ plan, callback_url: CONFIG.CALLBACK_URL }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Payment initialization failed');
        if (data.authorization_url) {
            window.location.href = data.authorization_url;
        } else {
            alert('Payment link unavailable. Please try again.');
        }
    } catch (e) {
        alert('Error initializing payment: ' + (e.message || e));
    }
}


// =============================================================================
// PAYMENT CALLBACK HANDLING
// =============================================================================

function checkPaymentCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');

    if (reference || trxref) {
        // Payment callback detected
        verifyPaymentAndComplete(reference || trxref);
    }
}

async function verifyPaymentAndComplete(reference) {
    try {
        showGlobalLoading('Verifying payment...');

        const token = localStorage.getItem('linq_token');
        if (!token) {
            throw new Error('Session expired. Please log in again.');
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/subscription/paystack/verify/${reference}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        hideGlobalLoading();

        if (data.verified) {
            // Payment verified - show success with access code
            showSuccessModal(data.access_code);

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            alert('Payment verification failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        hideGlobalLoading();
        console.error('Payment verification error:', error);
        alert('Error verifying payment: ' + error.message);
    }
}

// =============================================================================
// SMOOTH SCROLL
// =============================================================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// =============================================================================
// NAVBAR
// =============================================================================

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 100) {
            navbar.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
}

// =============================================================================
// ANIMATIONS
// =============================================================================

function initAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.feature-card, .step, .pricing-card, .testimonial-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

// =============================================================================
// BILLING TOGGLE
// =============================================================================

function initBillingToggle() {
    if (!billingToggle) return;

    const monthlyLabel = document.querySelector('.toggle-label[data-period="monthly"]');
    const yearlyLabel = document.querySelector('.toggle-label[data-period="yearly"]');

    billingToggle.addEventListener('change', function() {
        currentBillingPeriod = this.checked ? 'yearly' : 'monthly';
        updatePricing();

        if (this.checked) {
            monthlyLabel?.classList.remove('active');
            yearlyLabel?.classList.add('active');
        } else {
            monthlyLabel?.classList.add('active');
            yearlyLabel?.classList.remove('active');
        }
    });

    monthlyLabel?.addEventListener('click', () => {
        billingToggle.checked = false;
        billingToggle.dispatchEvent(new Event('change'));
    });

    yearlyLabel?.addEventListener('click', () => {
        billingToggle.checked = true;
        billingToggle.dispatchEvent(new Event('change'));
    });
}

function updatePricing() {
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const yearlyPrices = document.querySelectorAll('.yearly-price');

    if (currentBillingPeriod === 'yearly') {
        monthlyPrices.forEach(el => el.style.display = 'none');
        yearlyPrices.forEach(el => el.style.display = 'inline');
    } else {
        monthlyPrices.forEach(el => el.style.display = 'inline');
        yearlyPrices.forEach(el => el.style.display = 'none');
    }
}

// =============================================================================
// PRICING BUTTONS
// =============================================================================

function initPricingButtons() {
    document.querySelectorAll('[data-plan]').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedPlan = this.dataset.plan;

            const amountKey = currentBillingPeriod === 'yearly' ? 'amountYearly' : 'amountMonthly';
            const amount = this.dataset[amountKey];

            const planInput = document.getElementById('selected-plan');
            if (planInput) {
                planInput.value = selectedPlan;
                planInput.dataset.amount = amount || '0';
                planInput.dataset.billingPeriod = currentBillingPeriod;
            }

            openModal(signupModal);
        });
    });
}

// =============================================================================
// MODAL MANAGEMENT
// =============================================================================

function initModals() {
        // Dashboard modal close
        dashboardModal?.querySelector('.modal-close')?.addEventListener('click', () => {
            closeModal(dashboardModal);
        });
    document.getElementById('login-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(loginModal);
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(signupModal);
        openModal(loginModal);
    });

    document.getElementById('show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(signupModal);
    });

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    document.getElementById('copy-code-btn')?.addEventListener('click', copyAccessCode);

    document.getElementById('download-extension-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (CONFIG.CHROME_EXTENSION_URL !== '#') {
            window.open(CONFIG.CHROME_EXTENSION_URL, '_blank');
        } else {
            alert('Chrome extension coming soon! Your access code has been saved.');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) closeModal(activeModal);
        }
    });
}

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// =============================================================================
// FORM HANDLING
// =============================================================================

function initForms() {
    signupForm?.addEventListener('submit', handleSignup);
    loginForm?.addEventListener('submit', handleLogin);
}

async function handleSignup(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const formData = {
        company_name: form.company_name.value,
        full_name: form.full_name.value,
        email: form.email.value,
        password: form.password.value,
        industry: form.industry.value,
        plan: form.plan.value || 'free_trial',
    };

    if (!validateSignupForm(formData)) return;

    setButtonLoading(submitBtn, true);

    try {
        const planInput = document.getElementById('selected-plan');
        const amount = parseInt(planInput?.dataset.amount || '0');

        if (amount > 0) {
            // Paid plan - register first, then process payment
            await registerUser(formData, true); // true = skipSuccessModal
            await initializePaystackPayment(formData, amount);
        } else {
            // Free trial - just register
            await registerUser(formData);
        }
    } catch (error) {
        console.error('Signup error:', error);
        showFormError(form, error.message || 'Something went wrong. Please try again.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function registerUser(userData, skipSuccessModal = false) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
    }

    // Store user data and token
    currentUser = data;
    localStorage.setItem('linq_token', data.access_token);
    localStorage.setItem('linq_user', JSON.stringify({
        id: data.user?.id,
        email: data.user?.email,
        full_name: data.user?.full_name,
    }));

    if (!skipSuccessModal) {
        // Generate access code and show success
        const accessCode = await generateAccessCode(data.access_token);
        closeModal(signupModal);
        showSuccessModal(accessCode);
    }

    return data;
}

async function initializePaystackPayment(userData, amount) {
    const token = localStorage.getItem('linq_token');

    // Initialize payment via backend
    const response = await fetch(`${CONFIG.API_BASE_URL}/subscription/paystack/initialize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            plan: userData.plan,
            callback_url: CONFIG.CALLBACK_URL,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Payment initialization failed');
    }

    // Close signup modal
    closeModal(signupModal);

    // Redirect to Paystack
    if (data.authorization_url) {
        window.location.href = data.authorization_url;
    } else {
        // Fallback to inline popup
        const handler = PaystackPop.setup({
            key: CONFIG.PAYSTACK_PUBLIC_KEY,
            email: userData.email,
            amount: amount,
            currency: 'USD',
            ref: data.reference,
            metadata: {
                custom_fields: [
                    { display_name: "Company", variable_name: "company_name", value: userData.company_name },
                    { display_name: "Plan", variable_name: "plan", value: userData.plan }
                ]
            },
            callback: function(response) {
                verifyPaymentAndComplete(response.reference);
            },
            onClose: function() {
                console.log('Payment window closed');
            }
        });
        handler.openIframe();
    }
}

async function generateAccessCode(accessToken) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/subscription/access-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to generate access code');
        }

        return data.code;
    } catch (error) {
        console.error('Failed to generate access code:', error);
        // Generate a placeholder code if API fails
        return 'LINQ-' + Math.random().toString(36).substring(2, 6).toUpperCase() +
               '-' + Math.random().toString(36).substring(2, 6).toUpperCase() +
               '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
}

function showSuccessModal(accessCode) {
    const codeDisplay = document.getElementById('access-code-display');
    if (codeDisplay) {
        codeDisplay.textContent = accessCode;
    }

    // Store access code for reference
    localStorage.setItem('linq_access_code', accessCode);

    openModal(successModal);
}

function copyAccessCode() {
    const codeDisplay = document.getElementById('access-code-display');
    const code = codeDisplay?.textContent;

    if (code) {
        navigator.clipboard.writeText(code).then(() => {
            const copyBtn = document.getElementById('copy-code-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            const copyBtn = document.getElementById('copy-code-btn');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Code';
            }, 2000);
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = form.email.value;
    const password = form.password.value;

    if (!email || !password) {
        showFormError(form, 'Please fill in all fields');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store user data and token
        currentUser = data;
        localStorage.setItem('linq_token', data.access_token);
        localStorage.setItem('linq_user', JSON.stringify({
            id: data.user?.id,
            email: data.user?.email,
            full_name: data.user?.full_name,
        }));

        closeModal(loginModal);

        // Generate and show access code
        const accessCode = await generateAccessCode(data.access_token);
        showSuccessModal(accessCode);

        // Update UI
        updateUIForLoggedInUser();

    } catch (error) {
        console.error('Login error:', error);
        showFormError(form, error.message || 'Invalid email or password');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// =============================================================================
// FORM VALIDATION
// =============================================================================

function validateSignupForm(data) {
    const errors = [];

    if (!data.company_name || data.company_name.length < 2) {
        errors.push('Company name is required');
    }

    if (!data.full_name || data.full_name.length < 2) {
        errors.push('Full name is required');
    }

    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Valid email is required');
    }

    if (!data.password || data.password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }

    if (!data.industry) {
        errors.push('Please select your industry');
    }

    if (errors.length > 0) {
        showFormError(signupForm, errors[0]);
        return false;
    }

    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFormError(form, message) {
    const existingError = form.querySelector('.form-error-message');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error-message';
    errorDiv.style.cssText = 'color: #ef4444; font-size: 0.875rem; text-align: center; padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 16px;';
    errorDiv.textContent = message;

    const firstFormGroup = form.querySelector('.form-group');
    form.insertBefore(errorDiv, firstFormGroup);

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function setButtonLoading(btn, isLoading) {
    if (!btn) return;

    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// =============================================================================
// GLOBAL LOADING OVERLAY
// =============================================================================

function showGlobalLoading(message = 'Loading...') {
    let overlay = document.getElementById('global-loading');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading';
        overlay.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                <div style="background: white; padding: 32px 48px; border-radius: 12px; text-align: center;">
                    <div style="width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
                    <p style="color: #0f172a; font-weight: 500;">${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function hideGlobalLoading() {
    const overlay = document.getElementById('global-loading');
    if (overlay) {
        overlay.remove();
    }
}

// =============================================================================
// DASHBOARD ANIMATION
// =============================================================================

function initDashboardAnimation() {
    const dashboardContent = document.querySelector('.dashboard-content');
    if (!dashboardContent) return;

    const cards = dashboardContent.querySelectorAll('.company-card, .news-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 300 + (index * 150));
    });

    setTimeout(() => {
        const updateBadges = dashboardContent.querySelectorAll('.update-badge');
        updateBadges.forEach((badge, index) => {
            badge.style.animation = `pulse 2s ease-in-out infinite ${index * 0.5}s`;
        });
    }, 1500);
}

// =============================================================================
// MOBILE MENU
// =============================================================================

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
        menuBtn.classList.toggle('active');
    });
}

// =============================================================================
// CSS ANIMATIONS
// =============================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function trackEvent(eventName, eventData = {}) {
    console.log('Track event:', eventName, eventData);
    // Implement actual analytics (Google Analytics, Mixpanel, etc.)
}

// =============================================================================
// EXPORTS (for testing)
// =============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateSignupForm,
        isValidEmail,
        CONFIG,
    };
}
