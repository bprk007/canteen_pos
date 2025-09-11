// Global State
let currentUserType = 'student';
let isLoading = false;

// API Configuration
const API_BASE = window.location.origin.replace(':3000', ':8000');

// DOM Elements
const userTypeTabs = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerModal = document.getElementById('registerModal');
const showRegisterBtn = document.getElementById('showRegister');
const closeRegisterBtn = document.getElementById('closeRegister');
const togglePasswordBtn = document.getElementById('togglePassword');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const regErrorMessage = document.getElementById('regErrorMessage');
const regSuccessMessage = document.getElementById('regSuccessMessage');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    checkExistingAuth();
    updateUIForUserType();
});

function initializeEventListeners() {
    // User type tabs
    userTypeTabs.forEach(tab => {
        tab.addEventListener('click', handleUserTypeChange);
    });

    // Forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // Modal controls
    showRegisterBtn.addEventListener('click', showRegisterModal);
    closeRegisterBtn.addEventListener('click', hideRegisterModal);
    
    // Click outside modal to close
    registerModal.addEventListener('click', function(e) {
        if (e.target === registerModal) {
            hideRegisterModal();
        }
    });

    // Password toggle
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);

    // Input validation
    document.getElementById('email').addEventListener('input', validateEmail);
    document.getElementById('regEmail').addEventListener('input', validateEmail);
    document.getElementById('regPassword').addEventListener('input', validatePassword);
    document.getElementById('confirmPassword').addEventListener('input', validatePasswordMatch);
}

function handleUserTypeChange(e) {
    e.preventDefault();
    
    const newType = e.target.dataset.type;
    if (newType === currentUserType) return;
    
    currentUserType = newType;
    
    // Update tab active state
    userTypeTabs.forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
    
    // Update UI
    updateUIForUserType();
    clearMessages();
}

function updateUIForUserType() {
    const emailInput = document.getElementById('email');
    const registerLink = document.getElementById('registerLink');
    
    if (currentUserType === 'student') {
        emailInput.placeholder = 'student.id@iiitkota.ac.in';
        registerLink.style.display = 'block';
    } else {
        emailInput.placeholder = 'staff.name@iiitkota.ac.in';
        registerLink.style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    if (isLoading) return;
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    setLoading(true);
    clearMessages();
    
    try {
    // Ensure CSRF cookie exists first
    try { await fetch(`${API_BASE}/api/auth/csrf/`, { credentials: 'include' }); } catch {}
    const csrfToken = (document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)||[])[1];
    const response = await fetch(`${API_BASE}/api/auth/login/`, {
            method: 'POST',
            headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': decodeURIComponent(csrfToken) } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password,
                user_type: currentUserType
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showSuccess('Login successful! Redirecting...');
            
            // Store user info in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            showError(data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    if (isLoading) return;
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showRegError('Please fill in all fields');
        return;
    }
    
    if (!isValidEmail(email)) {
        showRegError('Please enter a valid email address');
        return;
    }
    
    if (!isStudentEmail(email)) {
        showRegError('Please use a valid student email address (@iiitkota.ac.in)');
        return;
    }
    
    if (password.length < 8) {
        showRegError('Password must be at least 8 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        showRegError('Passwords do not match');
        return;
    }
    
    setRegisterLoading(true);
    clearRegMessages();
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
                password: password,
                confirm_password: confirmPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showRegSuccess('Account created successfully! Redirecting...');
            
            // Store user info in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showRegError(data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showRegError('Network error. Please check your connection and try again.');
    } finally {
        setRegisterLoading(false);
    }
}

function showRegisterModal() {
    registerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    clearRegMessages();
    registerForm.reset();
}

function hideRegisterModal() {
    registerModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    clearRegMessages();
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const icon = togglePasswordBtn.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function validateEmail(e) {
    const email = e.target.value.trim();
    const input = e.target;
    
    if (email && !isValidEmail(email)) {
        input.style.borderColor = '#e53e3e';
    } else if (email && input.id === 'regEmail' && !isStudentEmail(email)) {
        input.style.borderColor = '#e53e3e';
    } else {
        input.style.borderColor = '#e2e8f0';
    }
}

function validatePassword(e) {
    const password = e.target.value;
    const input = e.target;
    
    if (password && password.length < 8) {
        input.style.borderColor = '#e53e3e';
    } else {
        input.style.borderColor = '#e2e8f0';
    }
}

function validatePasswordMatch() {
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#e53e3e';
    } else {
        confirmInput.style.borderColor = '#e2e8f0';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isStudentEmail(email) {
    if (!email.endsWith('@iiitkota.ac.in')) {
        return false;
    }
    
    const username = email.split('@')[0].toLowerCase();
    
    // Student email patterns
    const studentPatterns = [
        /^\d{4}[a-z]{2}\d{4}$/,  // Format: 2021cs1234
        /^[a-z]\d{7,}$/,         // Format: s1234567
        /^\d{4}[a-z]+\d+$/,      // Format: 2021computer123
        /^student\d+$/,          // Format: student123
    ];
    
    return studentPatterns.some(pattern => pattern.test(username));
}

async function checkExistingAuth() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/user/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                // User is already logged in, redirect to main page
                window.location.href = 'index.html';
                return;
            }
        }
    } catch (error) {
        console.log('No existing authentication found');
    }
}

function setLoading(loading) {
    isLoading = loading;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const btnSpinner = loginBtn.querySelector('.btn-spinner');
    
    if (loading) {
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline-block';
        loginForm.classList.add('loading');
    } else {
        loginBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnSpinner.style.display = 'none';
        loginForm.classList.remove('loading');
    }
}

function setRegisterLoading(loading) {
    const registerBtn = document.getElementById('registerBtn');
    const btnText = registerBtn.querySelector('.btn-text');
    const btnSpinner = registerBtn.querySelector('.btn-spinner');
    
    if (loading) {
        registerBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline-block';
        registerForm.classList.add('loading');
    } else {
        registerBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnSpinner.style.display = 'none';
        registerForm.classList.remove('loading');
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

function showRegError(message) {
    regErrorMessage.textContent = message;
    regErrorMessage.style.display = 'block';
    regSuccessMessage.style.display = 'none';
}

function showRegSuccess(message) {
    regSuccessMessage.textContent = message;
    regSuccessMessage.style.display = 'block';
    regErrorMessage.style.display = 'none';
}

function clearMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function clearRegMessages() {
    regErrorMessage.style.display = 'none';
    regSuccessMessage.style.display = 'none';
}

// Handle browser back button and escape key
window.addEventListener('popstate', hideRegisterModal);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && registerModal.style.display === 'flex') {
        hideRegisterModal();
    }
});
