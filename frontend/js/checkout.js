// Checkout Page JavaScript
let currentUser = null;
let cartItems = [];

// API Configuration
const API_BASE = window.location.origin.replace(':3000', ':8000');

// Initialize the checkout page
document.addEventListener('DOMContentLoaded', function() {
    initializeCheckoutPage();
});

async function initializeCheckoutPage() {
    try {
        await checkAuthStatus();
        loadCartFromStorage();
        displayOrderSummary();
        bindCheckoutEvents();
        updateTotals();
        
        // If cart is empty, show empty message
        if (cartItems.length === 0) {
            showEmptyCartMessage();
        }
    } catch (error) {
        console.error('Error initializing checkout page:', error);
        showToast('Error loading checkout page', 'error');
    }
}

// Authentication Functions
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/user/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateAuthUI();
        } else {
            // Show sign in button and hide user button
            document.getElementById('signInBtn').style.display = 'flex';
            document.getElementById('userButton').style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
    }
}

function updateAuthUI() {
    if (currentUser) {
        // Hide sign in button and show user button
        document.getElementById('signInBtn').style.display = 'none';
        document.getElementById('userButton').style.display = 'block';
        
        // Update user info
        const avatar = document.querySelector('.avatar');
        const username = document.querySelector('.username');
        const userEmail = document.querySelector('.user-email');
        
        avatar.textContent = getInitials(currentUser.first_name || currentUser.username || currentUser.email);
        username.textContent = currentUser.first_name || currentUser.username || 'User';
        userEmail.textContent = currentUser.email;
        
        // Pre-fill form if user is logged in
        prefillUserInfo();
    } else {
        // Show sign in button and hide user button
        document.getElementById('signInBtn').style.display = 'flex';
        document.getElementById('userButton').style.display = 'none';
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function prefillUserInfo() {
    if (currentUser) {
        const nameField = document.getElementById('checkoutCustomerName');
        const emailField = document.getElementById('checkoutCustomerEmail');
        
        if (nameField && !nameField.value) {
            nameField.value = currentUser.first_name && currentUser.last_name 
                ? `${currentUser.first_name} ${currentUser.last_name}`
                : currentUser.first_name || currentUser.username || '';
        }
        
        if (emailField && !emailField.value) {
            emailField.value = currentUser.email || '';
        }
    }
}

// Cart Functions
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
    }
}

function saveCartToStorage() {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

function displayOrderSummary() {
    const orderItemsContainer = document.getElementById('checkoutOrderItems');
    
    if (!cartItems || cartItems.length === 0) {
        orderItemsContainer.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Add some items from the menu to continue</p>
                <a href="index.html" class="btn-primary" style="margin-top: 1rem; display: inline-flex;">
                    <i class="fas fa-utensils"></i>
                    Browse Menu
                </a>
            </div>
        `;
        return;
    }
    
    orderItemsContainer.innerHTML = cartItems.map(item => `
        <div class="checkout-order-item">
            <img src="${item.image || '/public/placeholder.jpg'}" 
                 alt="${item.name}" 
                 class="item-image"
                 onerror="this.src='/public/placeholder.jpg'">
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-description">${item.description || 'Delicious item from our kitchen'}</div>
                <div class="item-quantity-price">Quantity: ${item.quantity} × ₹${item.price}</div>
            </div>
            <div class="item-total">₹${(item.quantity * parseFloat(item.price)).toFixed(2)}</div>
        </div>
    `).join('');
}

function updateTotals() {
    const subtotal = cartItems.reduce((total, item) => total + (item.quantity * parseFloat(item.price)), 0);
    const tax = subtotal * 0.05; // 5% tax
    const finalTotal = subtotal + tax;
    
    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `₹${tax.toFixed(2)}`;
    document.getElementById('finalTotal').textContent = `₹${finalTotal.toFixed(2)}`;
    document.getElementById('orderTotalBtn').textContent = `₹${finalTotal.toFixed(2)}`;
}

function showEmptyCartMessage() {
    const container = document.querySelector('.checkout-container');
    container.innerHTML = `
        <div class="empty-cart-message" style="grid-column: 1 / -1;">
            <i class="fas fa-shopping-cart"></i>
            <h3>Your cart is empty</h3>
            <p>Add some delicious items from our menu to get started!</p>
            <a href="index.html" class="btn-primary" style="margin-top: 1.5rem; display: inline-flex;">
                <i class="fas fa-utensils"></i>
                Browse Menu
            </a>
        </div>
    `;
}

// Event Binding
function bindCheckoutEvents() {
    // Form submission
    const checkoutForm = document.getElementById('checkoutPageForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleOrderSubmission);
    }
    
    // Sign in button
    const signInBtn = document.getElementById('signInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', function() {
            window.location.href = 'index.html#login';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // User dropdown toggle
    const userButton = document.getElementById('userButton');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userButton && userDropdown) {
        userButton.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });
        
        // Prevent dropdown from closing when clicking inside
        userDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

// Order Submission
async function handleOrderSubmission(e) {
    e.preventDefault();
    
    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const orderData = {
        customer_name: formData.get('customerName'),
        customer_phone: formData.get('customerPhone'),
        customer_email: formData.get('customerEmail') || '',
        room_number: formData.get('roomNumber') || '',
        special_instructions: formData.get('specialInstructions') || '',
        payment_method: formData.get('paymentMethod'),
        items: cartItems.map(item => ({
            menu_item: item.id,
            quantity: item.quantity,
            price: parseFloat(item.price)
        }))
    };
    
    // Basic validation
    if (!orderData.customer_name || !orderData.customer_phone) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    try {
        showLoadingOverlay();
        
    // Ensure CSRF cookie exists
    try { await fetch(`${API_BASE}/api/auth/csrf/`, { credentials: 'include' }); } catch {}
    const csrfToken = (document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)||[])[1];
    const response = await fetch(`${API_BASE}/api/orders/`, {
            method: 'POST',
            headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': decodeURIComponent(csrfToken) } : {}),
            },
            credentials: 'include',
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Clear cart
            cartItems = [];
            saveCartToStorage();
            
            // Show success message
            showToast('Order placed successfully!', 'success');
            
            // Redirect to order confirmation or back to menu
            setTimeout(() => {
                window.location.href = `index.html?orderSuccess=${result.id}`;
            }, 2000);
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.message || 'Error placing order', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

// UI Functions
function showLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.success-message, .error-message-toast').forEach(toast => {
        toast.remove();
    });
    
    const toast = document.createElement('div');
    toast.className = type === 'success' ? 'success-message' : 'error-message-toast';
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/logout/`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        updateAuthUI();
        showToast('Logged out successfully', 'success');
        
        // Redirect to main page after a delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error during logout:', error);
        showToast('Error during logout', 'error');
    }
}
