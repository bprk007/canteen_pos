// Global State
let currentUser = null;
let menuItems = [];
let cartItems = [];
let currentCategory = 'all';

// DOM Elements (will be set after DOM loads)
let userButton, userDropdown, signInBtn, checkoutModal, cartSidebar, floatingCartBtn, menuGrid, searchInput;

// API Configuration
const API_BASE = window.location.origin.replace(':3000', ':8000');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements after DOM is loaded
    userButton = document.getElementById('userButton');
    userDropdown = document.getElementById('userDropdown');
    signInBtn = document.getElementById('signInBtn');
    checkoutModal = document.getElementById('checkoutModal');
    cartSidebar = document.getElementById('cartSidebar');
    floatingCartBtn = document.getElementById('floatingCartBtn');
    menuGrid = document.getElementById('menuGrid');
    searchInput = document.getElementById('searchInput');
    
    initializeApp();
});

async function initializeApp() {
    try {
        // Check if critical elements exist
        if (!menuGrid) {
            console.error('menuGrid element not found');
            throw new Error('Critical UI elements not found');
        }
        
        await checkAuthStatus();
        loadCartFromStorage(); // Load cart from localStorage
        await loadCategories();
        await loadMenuItems();
        bindEvents();
        updateCartUI();
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error loading application', 'error');
    }
}

// Authentication Functions
async function checkAuthStatus() {
    try {
        // First check localStorage for cached user data
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
            try {
                currentUser = JSON.parse(cachedUser);
                updateAuthUI();
            } catch (e) {
                localStorage.removeItem('user');
            }
        }
        
        // Then verify with server
        const response = await fetch(`${API_BASE}/api/auth/user/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                currentUser = data;
                localStorage.setItem('user', JSON.stringify(data));
                updateAuthUI();
            } else {
                currentUser = null;
                localStorage.removeItem('user');
                updateAuthUI();
            }
        } else {
            currentUser = null;
            localStorage.removeItem('user');
            updateAuthUI();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentUser = null;
        localStorage.removeItem('user');
        updateAuthUI();
    }
}

function updateAuthUI() {
    const userSection = document.querySelector('.user-section');
    
    if (currentUser) {
        // Show user button and hide sign in button
        signInBtn.style.display = 'none';
        userButton.style.display = 'block';
        
        // Update user info
        const avatar = document.querySelector('.avatar');
        const username = document.querySelector('.username');
        const userEmail = document.querySelector('.user-email');
        const manageMenuLink = document.getElementById('manageMenuLink');
        const ordersLink = document.getElementById('ordersLink');
        const manageDivider = document.getElementById('manageDivider');
        
        // Set avatar initials
        const displayName = currentUser.user?.first_name || currentUser.first_name || 
                           currentUser.user?.username || currentUser.username || 'User';
        avatar.textContent = getInitials(displayName);
        
        // Set display name and email
        const fullName = currentUser.user?.first_name && currentUser.user?.last_name 
            ? `${currentUser.user.first_name} ${currentUser.user.last_name}`
            : displayName;
        username.textContent = fullName;
        userEmail.textContent = currentUser.user?.email || currentUser.email || '';
        
        // Show/hide manage menu based on user type
        const isStaff = currentUser.user?.is_staff || currentUser.is_staff || 
                       currentUser.user?.is_superuser || currentUser.is_superuser;
        
        if (isStaff) {
            manageMenuLink.style.display = 'flex';
            ordersLink.style.display = 'flex';
            manageDivider.style.display = 'block';
        } else {
            manageMenuLink.style.display = 'none';
            ordersLink.style.display = 'none';
            manageDivider.style.display = 'none';
        }
    } else {
        // Show sign in button and hide user button
        signInBtn.style.display = 'flex';
        userButton.style.display = 'none';
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/logout/`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = null;
            localStorage.removeItem('user');
            updateAuthUI();
            showToast('Logged out successfully!', 'success');
            
            // Clear cart if user was logged in
            cartItems = [];
            updateCartUI();
            saveCartToStorage();
        } else {
            showToast('Logout failed', 'error');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showToast('Error during logout', 'error');
    }
}

async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/logout/`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        updateAuthUI();
        closeDropdown();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Error during logout:', error);
        showToast('Error during logout', 'error');
    }
}

// Category Functions
async function loadCategories() {
    try {
        console.log('Loading categories...');
        const response = await fetch(`${API_BASE}/api/menu-categories/`);
        
        if (response.ok) {
            const categories = await response.json();
            console.log('Categories loaded:', categories);
            displayCategories(categories);
        } else {
            console.error('Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function displayCategories(categories) {
    const categoryContainer = document.getElementById('categoryTabs');
    if (!categoryContainer) {
        console.error('categoryTabs container not found');
        return;
    }
    
    // Clear existing categories
    categoryContainer.innerHTML = '';
    
    // Add "All Items" button first
    const allButton = document.createElement('button');
    allButton.className = 'tab-button active';
    allButton.setAttribute('data-category', 'all');
    allButton.textContent = 'All Items';
    allButton.addEventListener('click', function() {
        setActiveCategory('all');
    });
    categoryContainer.appendChild(allButton);
    
    // Add categories
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.setAttribute('data-category', category.name.toLowerCase());
        button.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
        button.addEventListener('click', function() {
            setActiveCategory(category.name.toLowerCase());
        });
        categoryContainer.appendChild(button);
    });
    
    console.log('Categories displayed successfully');
}

// Menu Functions
async function loadMenuItems() {
    try {
        console.log('menuGrid element:', menuGrid);
        
        showLoading();
        const response = await fetch(`${API_BASE}/api/menu-items/`);
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            menuItems = await response.json();
            console.log('Menu items loaded:', menuItems);
            displayMenuItems(menuItems);
        } else {
            throw new Error('Failed to load menu items');
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        showToast('Error loading menu items', 'error');
        if (menuGrid) {
            menuGrid.innerHTML = '<div class="error-message">Failed to load menu items. Please try again later.</div>';
        }
    }
}

function displayMenuItems(items) {
    console.log('displayMenuItems called with:', items);
    
    if (!menuGrid) {
        console.error('menuGrid is null in displayMenuItems');
        return;
    }
    
    if (!items || items.length === 0) {
        console.log('No items to display');
        menuGrid.innerHTML = '<div class="error-message">No menu items available.</div>';
        return;
    }
    
    console.log('Displaying', items.length, 'menu items');
    
    try {
        menuGrid.innerHTML = items.map(item => `
            <div class="menu-item" data-id="${item.id}">
                <img src="${item.image || '/images/placeholder.jpg'}" 
                     alt="${item.name}" 
                     class="menu-item-image"
                     onerror="this.src='/images/placeholder.jpg'">
                <div class="menu-item-content">
                    <div class="menu-item-header">
                        <h3 class="menu-item-name">${item.name}</h3>
                    </div>
                    <p class="menu-item-description">${item.description || 'Delicious item from our kitchen'}</p>
                    <div class="menu-item-footer">
                        <span class="menu-item-price">₹${item.price}</span>
                        ${getCartItemQuantity(item.id) > 0 ? 
                            `<div class="quantity-controls">
                                <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${getCartItemQuantity(item.id) - 1})">-</button>
                                <span class="quantity-display">${getCartItemQuantity(item.id)}</span>
                                <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${getCartItemQuantity(item.id) + 1})">+</button>
                            </div>` :
                            `<button class="add-to-cart-btn" onclick="addToCart(${item.id})" ${!item.available ? 'disabled' : ''}>
                                ${!item.available ? 'Out of Stock' : 'Add to Cart'}
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('Menu items displayed successfully');
    } catch (error) {
        console.error('Error in displayMenuItems:', error);
        menuGrid.innerHTML = '<div class="error-message">Error displaying menu items.</div>';
    }
}

function filterMenuItems() {
    console.log('Filtering menu items for category:', currentCategory);
    const searchTerm = searchInput.value.toLowerCase();
    let filtered = menuItems;
    
    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => {
            const itemCategory = item.category_name ? item.category_name.toLowerCase() : '';
            console.log('Item:', item.name, 'Category:', itemCategory, 'Current:', currentCategory);
            return itemCategory === currentCategory.toLowerCase();
        });
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }
    
    console.log('Filtered items:', filtered.length, 'out of', menuItems.length);
    displayMenuItems(filtered);
}

// Cart Functions
function getCartItemQuantity(itemId) {
    const cartItem = cartItems.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
}

function addToCart(itemId) {
    const item = menuItems.find(item => item.id === itemId);
    if (!item || !item.available) return;
    
    const existingItem = cartItems.find(cartItem => cartItem.id === itemId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1
        });
    }
    
    updateCartUI();
    displayMenuItems(menuItems.filter(item => 
        currentCategory === 'all' || 
        (item.category && item.category.toLowerCase() === currentCategory.toLowerCase())
    ));
    saveCartToStorage(); // Save to localStorage when items are added
    
    showToast(`${item.name} added to cart`, 'success');
}

function updateCartQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    const cartItem = cartItems.find(item => item.id === itemId);
    if (cartItem) {
        cartItem.quantity = newQuantity;
        updateCartUI();
        displayMenuItems(menuItems.filter(item => 
            currentCategory === 'all' || 
            (item.category && item.category.toLowerCase() === currentCategory.toLowerCase())
        ));
        saveCartToStorage(); // Save to localStorage when quantities are updated
    }
}

function removeFromCart(itemId) {
    cartItems = cartItems.filter(item => item.id !== itemId);
    updateCartUI();
    displayMenuItems(menuItems.filter(item => 
        currentCategory === 'all' || 
        (item.category && item.category.toLowerCase() === currentCategory.toLowerCase())
    ));
    saveCartToStorage(); // Save to localStorage when items are removed
}

// localStorage Functions
function saveCartToStorage() {
    try {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
        console.log('Cart saved to localStorage:', cartItems);
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
    }
}

function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
            cartItems = JSON.parse(savedCart);
            console.log('Cart loaded from localStorage:', cartItems);
            updateCartUI();
        }
    } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        cartItems = [];
    }
}

function updateCartUI() {
    const cartContent = document.querySelector('.cart-content');
    const cartCount = document.querySelector('.cart-count');
    const cartTotalText = document.querySelector('.cart-total-text');
    const cartTotalElement = document.getElementById('cartTotal');
    const cartFooter = document.getElementById('cartFooter');
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Update floating cart button
    if (totalItems > 0) {
        floatingCartBtn.style.display = 'flex';
        cartCount.textContent = totalItems;
        cartTotalText.textContent = `₹${totalPrice.toFixed(2)}`;
    } else {
        floatingCartBtn.style.display = 'none';
    }
    
    // Update cart sidebar content
    if (cartItems.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <p>Add items from the menu to get started</p>
            </div>
        `;
        // Hide cart footer when empty
        if (cartFooter) {
            cartFooter.style.display = 'none';
        }
    } else {
        cartContent.innerHTML = cartItems.map(item => `
            <div class="cart-item">
                <img src="${item.image || '/images/placeholder.jpg'}" 
                     alt="${item.name}" 
                     class="cart-item-image"
                     onerror="this.src='/images/placeholder.jpg'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price} each</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
            </div>
        `).join('');
        
        // Show cart footer when there are items
        if (cartFooter) {
            cartFooter.style.display = 'block';
        }
    }
    
    // Update cart total
    if (cartTotalElement) {
        cartTotalElement.textContent = totalPrice.toFixed(2);
    }
}

// Checkout Functions
function showCheckout() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    updateCheckoutModal();
    showModal('checkoutModal');
}

function updateCheckoutModal() {
    const checkoutItems = document.querySelector('.checkout-items');
    const checkoutTotal = document.querySelector('.checkout-total');
    
    const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    checkoutItems.innerHTML = cartItems.map(item => `
        <div class="checkout-item">
            <div class="checkout-item-info">
                <div class="checkout-item-name">${item.name}</div>
                <div class="checkout-item-details">Quantity: ${item.quantity} × ₹${item.price}</div>
            </div>
            <div class="checkout-item-price">₹${item.price * item.quantity}</div>
        </div>
    `).join('');
    
    checkoutTotal.textContent = `Total: ₹${totalPrice}`;
}

async function placeOrder() {
    if (!currentUser) {
        showToast('Please login to place an order', 'error');
        return;
    }
    
    if (cartItems.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const specialInstructions = document.getElementById('specialInstructions').value;
    
    if (!customerName || !customerPhone) {
        showToast('Please fill in customer name and phone number', 'error');
        return;
    }
    
    const placeOrderBtn = document.querySelector('.place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
    
    try {
        const orderData = {
            customer_name: customerName,
            customer_phone: customerPhone,
            special_instructions: specialInstructions,
            items: cartItems.map(item => ({
                menu_item: item.id,
                quantity: item.quantity
            }))
        };
        
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
            const order = await response.json();
            cartItems = [];
            updateCartUI();
            closeModal('checkoutModal');
            closeSidebar();
            showToast(`Order #${order.id} placed successfully!`, 'success');
            
            // Clear form
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('specialInstructions').value = '';
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to place order');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.message || 'Error placing order', 'error');
    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = '<i class="fas fa-credit-card"></i> Place Order';
    }
}

// UI Functions
function bindEvents() {
    // User dropdown toggle
    if (userButton) {
        userButton.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown();
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        closeDropdown();
    });
    
    // Prevent dropdown from closing when clicking inside
    if (userDropdown) {
        userDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // Login tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', filterMenuItems);
    }
    
    // Category tabs are now dynamically created with event listeners
    // No need to bind events here since they're added in displayCategories()
    
    // Cart sidebar
    const closeCartBtn = document.querySelector('.close-cart');
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeSidebar);
    }
    
    // Floating cart button
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', function() {
            if (cartSidebar) {
                cartSidebar.classList.add('open');
            }
        });
    }
    
    // Form submissions
    const staffLoginForm = document.getElementById('staffLoginForm');
    if (staffLoginForm) {
        staffLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleStaffLogin();
        });
    }
    
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }
    
    // Sign in button - redirect to login page
    if (signInBtn) {
        signInBtn.addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Manage Menu link
    const manageMenuLink = document.getElementById('manageMenuLink');
    if (manageMenuLink) {
        manageMenuLink.style.cursor = 'pointer';
        manageMenuLink.addEventListener('click', function() {
            window.location.href = 'manage.html';
        });
    }
    
    // Orders link
    const ordersLink = document.getElementById('ordersLink');
    if (ordersLink) {
        ordersLink.style.cursor = 'pointer';
        ordersLink.addEventListener('click', function() {
            window.location.href = 'orders.html';
        });
    }
    
    // Quick checkout button (modal)
    const quickCheckoutBtn = document.getElementById('quickCheckoutBtn');
    if (quickCheckoutBtn) {
        quickCheckoutBtn.addEventListener('click', showCheckout);
    }
    
    // Full checkout page button
    const fullCheckoutBtn = document.getElementById('fullCheckoutBtn');
    if (fullCheckoutBtn) {
        fullCheckoutBtn.addEventListener('click', function() {
            // Save cart to localStorage before navigating
            saveCartToStorage();
        });
    }
}

function toggleDropdown() {
    userDropdown.classList.toggle('show');
}

function closeDropdown() {
    if (userDropdown) {
        userDropdown.classList.remove('show');
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

function setActiveCategory(category) {
    console.log('Setting active category to:', category);
    currentCategory = category;
    
    // Update tab appearance
    const allCategoryTabs = document.querySelectorAll('.tab-button');
    allCategoryTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-category="${category}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Filter menu items
    filterMenuItems();
}

function closeSidebar() {
    cartSidebar.classList.remove('open');
}

function showLoading() {
    console.log('showLoading called, menuGrid:', menuGrid);
    if (menuGrid) {
        menuGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading...</p>
            </div>
        `;
    } else {
        console.error('menuGrid is null in showLoading');
    }
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
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Global functions for onclick handlers
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
