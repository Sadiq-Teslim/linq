// LINQ AI - B2B Sales Intelligence Platform JavaScript

// Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api/v1',
    PAYSTACK_PUBLIC_KEY: 'pk_test_1f5344a2bfcc4d0760b49cff752313e08e22d5b2',
    CHROME_EXTENSION_URL: '#', // Replace with Chrome Web Store URL when published
};

// State
let currentBillingPeriod = 'monthly';
let selectedPlan = null;
let currentUser = null;

// DOM Elements
const signupModal = document.getElementById('signup-modal');
const loginModal = document.getElementById('login-modal');
const successModal = document.getElementById('success-modal');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const billingToggle = document.getElementById('billing-toggle');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initSmoothScroll();
    initNavbarScroll();
    initAnimations();
    initBillingToggle();
    initPricingButtons();
    initModals();
    initForms();
    initDashboardAnimation();
});

// Smooth Scroll
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

// Navbar Scroll Effect
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

// Scroll Animations
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

    // Observe animated elements
    const animatedElements = document.querySelectorAll('.feature-card, .step, .pricing-card, .testimonial-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

// Billing Toggle (Monthly/Yearly)
function initBillingToggle() {
    if (!billingToggle) return;

    const monthlyLabel = document.querySelector('.toggle-label[data-period="monthly"]');
    const yearlyLabel = document.querySelector('.toggle-label[data-period="yearly"]');

    billingToggle.addEventListener('change', function() {
        currentBillingPeriod = this.checked ? 'yearly' : 'monthly';
        updatePricing();

        // Update label styles
        if (this.checked) {
            monthlyLabel.classList.remove('active');
            yearlyLabel.classList.add('active');
        } else {
            monthlyLabel.classList.add('active');
            yearlyLabel.classList.remove('active');
        }
    });

    // Click on labels to toggle
    monthlyLabel?.addEventListener('click', () => {
        billingToggle.checked = false;
        billingToggle.dispatchEvent(new Event('change'));
    });

    yearlyLabel?.addEventListener('click', () => {
        billingToggle.checked = true;
        billingToggle.dispatchEvent(new Event('change'));
    });
}

// Update Pricing Display
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

// Pricing Buttons
function initPricingButtons() {
    document.querySelectorAll('[data-plan]').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedPlan = this.dataset.plan;

            // Store amount data
            const amountKey = currentBillingPeriod === 'yearly' ? 'amountYearly' : 'amountMonthly';
            const amount = this.dataset[amountKey];

            // Update hidden input
            const planInput = document.getElementById('selected-plan');
            if (planInput) {
                planInput.value = selectedPlan;
                planInput.dataset.amount = amount || '0';
                planInput.dataset.billingPeriod = currentBillingPeriod;
            }

            // Open signup modal
            openModal(signupModal);
        });
    });
}

// Modal Management
function initModals() {
    // Login button
    document.getElementById('login-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(loginModal);
    });

    // Show login from signup
    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(signupModal);
        openModal(loginModal);
    });

    // Show signup from login
    document.getElementById('show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(signupModal);
    });

    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    // Click overlay to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    // Copy code button
    document.getElementById('copy-code-btn')?.addEventListener('click', copyAccessCode);

    // Download extension button
    document.getElementById('download-extension-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (CONFIG.CHROME_EXTENSION_URL !== '#') {
            window.open(CONFIG.CHROME_EXTENSION_URL, '_blank');
        } else {
            alert('Chrome extension coming soon!');
        }
    });

    // Close on escape key
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

// Form Handling
function initForms() {
    // Signup form
    signupForm?.addEventListener('submit', handleSignup);

    // Login form
    loginForm?.addEventListener('submit', handleLogin);
}

async function handleSignup(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Get form data
    const formData = {
        company_name: form.company_name.value,
        full_name: form.full_name.value,
        email: form.email.value,
        password: form.password.value,
        industry: form.industry.value,
        plan: form.plan.value || 'free_trial',
    };

    // Validate
    if (!validateSignupForm(formData)) return;

    // Show loading
    setButtonLoading(submitBtn, true);

    try {
        // Check if paid plan - initialize Paystack first
        const planInput = document.getElementById('selected-plan');
        const amount = parseInt(planInput?.dataset.amount || '0');

        if (amount > 0) {
            // Paid plan - process payment first
            await processPayment(formData, amount);
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

async function processPayment(userData, amount) {
    // Initialize Paystack payment
    const handler = PaystackPop.setup({
        key: CONFIG.PAYSTACK_PUBLIC_KEY,
        email: userData.email,
        amount: amount, // Amount in cents
        currency: 'USD',
        metadata: {
            custom_fields: [
                {
                    display_name: "Company Name",
                    variable_name: "company_name",
                    value: userData.company_name
                },
                {
                    display_name: "Plan",
                    variable_name: "plan",
                    value: userData.plan
                }
            ]
        },
        callback: async function(response) {
            // Payment successful - register user with payment reference
            try {
                await registerUser({
                    ...userData,
                    payment_reference: response.reference,
                });
            } catch (error) {
                console.error('Registration after payment failed:', error);
                alert('Payment successful but registration failed. Please contact support with reference: ' + response.reference);
            }
        },
        onClose: function() {
            console.log('Payment cancelled');
        }
    });

    handler.openIframe();
}

async function registerUser(userData) {
    // Call signup API
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

    // Store user data
    currentUser = data;

    // Generate access code
    const accessCode = await generateAccessCode(data.access_token);

    // Show success modal
    closeModal(signupModal);
    showSuccessModal(accessCode);
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
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const credentials = {
        email: form.email.value,
        password: form.password.value,
    };

    // Validate
    if (!credentials.email || !credentials.password) {
        showFormError(form, 'Please fill in all fields');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store user data
        currentUser = data;
        localStorage.setItem('linq_token', data.access_token);

        // Close modal and show success
        closeModal(loginModal);

        // Redirect to dashboard or show access code
        const accessCode = await generateAccessCode(data.access_token);
        showSuccessModal(accessCode);

    } catch (error) {
        console.error('Login error:', error);
        showFormError(form, error.message || 'Invalid email or password');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Form Validation
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
    // Remove existing error
    const existingError = form.querySelector('.form-error-message');
    if (existingError) existingError.remove();

    // Add new error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error-message';
    errorDiv.style.cssText = 'color: #ef4444; font-size: 0.875rem; text-align: center; padding: 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 16px;';
    errorDiv.textContent = message;

    const firstFormGroup = form.querySelector('.form-group');
    form.insertBefore(errorDiv, firstFormGroup);

    // Remove after 5 seconds
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

// Dashboard Animation in Hero
function initDashboardAnimation() {
    const dashboardContent = document.querySelector('.dashboard-content');
    if (!dashboardContent) return;

    // Add entrance animation
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

    // Simulate update badges appearing
    setTimeout(() => {
        const updateBadges = dashboardContent.querySelectorAll('.update-badge');
        updateBadges.forEach((badge, index) => {
            badge.style.animation = `pulse 2s ease-in-out infinite ${index * 0.5}s`;
        });
    }, 1500);
}

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
`;
document.head.appendChild(style);

// Mobile Menu (for future implementation)
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
        menuBtn.classList.toggle('active');
    });
}

// Utility Functions
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

// Analytics tracking (placeholder)
function trackEvent(eventName, eventData = {}) {
    console.log('Track event:', eventName, eventData);
    // Implement actual analytics tracking here
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateSignupForm,
        isValidEmail,
    };
}
