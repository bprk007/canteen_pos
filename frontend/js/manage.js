// Global State
let currentUser = null;
let categories = [];
let menuItems = [];
let currentEditingCategory = null;
let currentEditingItem = null;

// API Configuration
const API_BASE = window.location.origin.replace(':3000', ':8000');

// CSRF Token Management
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function getCSRFToken() {
    return getCookie('csrftoken');
}

async function fetchCSRFToken() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/csrf/`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            return data.csrfToken;
        }
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
    }
    return null;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await checkAuthStatus();
        if (!currentUser || (!currentUser.user?.is_staff && !currentUser.is_staff)) {
            showToast('Access denied. Staff privileges required.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        updateUserUI();
        await loadCategories();
        await loadMenuItems();
        bindEvents();
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error loading application', 'error');
    }
}

// Authentication Functions
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/user/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data;
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        window.location.href = 'login.html';
    }
}

function updateUserUI() {
    if (currentUser) {
        const avatar = document.getElementById('userAvatar');
        const username = document.getElementById('username');
        const userEmail = document.getElementById('userEmail');
        
        const displayName = currentUser.user?.first_name || currentUser.first_name || 
                           currentUser.user?.username || currentUser.username || 'Staff';
        
        avatar.textContent = getInitials(displayName);
        
        const fullName = currentUser.user?.first_name && currentUser.user?.last_name 
            ? `${currentUser.user.first_name} ${currentUser.user.last_name}`
            : displayName;
        
        username.textContent = fullName;
        userEmail.textContent = currentUser.user?.email || currentUser.email || '';
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Categories Functions
async function loadCategories() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/api/menu-categories/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            categories = await response.json();
            displayCategories();
            updateCategorySelects();
        } else {
            throw new Error('Failed to load categories');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Error loading categories', 'error');
    } finally {
        hideLoading();
    }
}

function displayCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No categories found</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>${category.id}</td>
            <td>${category.name}</td>
            <td>${category.description || '-'}</td>
            <td>${category.menu_items_count || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editCategory(${category.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateCategorySelects() {
    const selects = [
        document.getElementById('itemCategory'),
        document.getElementById('categoryFilter')
    ];
    
    selects.forEach(select => {
        if (select.id === 'categoryFilter') {
            select.innerHTML = '<option value="">All Categories</option>';
        } else {
            select.innerHTML = '<option value="">Select Category</option>';
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    });
}

async function saveCategory(formData) {
    try {
        const url = currentEditingCategory 
            ? `${API_BASE}/api/menu-categories/${currentEditingCategory}/`
            : `${API_BASE}/api/menu-categories/`;
        
        const method = currentEditingCategory ? 'PUT' : 'POST';
        
        // Get CSRF token
        const csrfToken = getCSRFToken() || await fetchCSRFToken();
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showToast(currentEditingCategory ? 'Category updated!' : 'Category created!', 'success');
            closeModal('categoryModal');
            await loadCategories();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save category');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showToast(error.message, 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? This will also delete all menu items in this category.')) {
        return;
    }
    
    try {
        // Get CSRF token
        const csrfToken = getCSRFToken() || await fetchCSRFToken();
        
        const headers = {};
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        const response = await fetch(`${API_BASE}/api/menu-categories/${categoryId}/`, {
            method: 'DELETE',
            headers: headers,
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast('Category deleted!', 'success');
            await loadCategories();
            await loadMenuItems(); // Refresh menu items as they might be affected
        } else {
            throw new Error('Failed to delete category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Error deleting category', 'error');
    }
}

function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    currentEditingCategory = categoryId;
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    showModal('categoryModal');
}

// Menu Items Functions
async function loadMenuItems() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/api/menu-items/`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            menuItems = await response.json();
            displayMenuItems();
        } else {
            throw new Error('Failed to load menu items');
        }
    } catch (error) {
        console.error('Error loading menu items:', error);
        showToast('Error loading menu items', 'error');
    } finally {
        hideLoading();
    }
}

function displayMenuItems() {
    const tbody = document.getElementById('itemsTableBody');
    let filteredItems = [...menuItems];
    
    // Apply filters
    const categoryFilter = document.getElementById('categoryFilter').value;
    const availabilityFilter = document.getElementById('availabilityFilter').value;
    
    if (categoryFilter) {
        filteredItems = filteredItems.filter(item => item.category == categoryFilter);
    }
    
    if (availabilityFilter !== '') {
        filteredItems = filteredItems.filter(item => item.available.toString() === availabilityFilter);
    }
    
    if (filteredItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No menu items found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>
                <img src="${item.image || '/images/placeholder.jpg'}" 
                     alt="${item.name}" 
                     class="item-image"
                     onerror="this.src='/images/placeholder.jpg'">
            </td>
            <td>${item.name}</td>
            <td>${item.category_name || '-'}</td>
            <td>₹${item.price}</td>
            <td>
                <span class="badge ${item.available ? 'badge-available' : 'badge-unavailable'}">
                    ${item.available ? 'Available' : 'Unavailable'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editMenuItem(${item.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function saveMenuItem(formData) {
    try {
        const url = currentEditingItem 
            ? `${API_BASE}/api/menu-items/${currentEditingItem}/`
            : `${API_BASE}/api/menu-items/`;
        
        const method = currentEditingItem ? 'PUT' : 'POST';
        
        // Get CSRF token
        const csrfToken = getCSRFToken() || await fetchCSRFToken();
        
        const headers = {};
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: formData,
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast(currentEditingItem ? 'Menu item updated!' : 'Menu item created!', 'success');
            closeModal('itemModal');
            await loadMenuItems();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save menu item');
        }
    } catch (error) {
        console.error('Error saving menu item:', error);
        showToast(error.message, 'error');
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('Are you sure you want to delete this menu item?')) {
        return;
    }
    
    try {
        // Get CSRF token
        const csrfToken = getCSRFToken() || await fetchCSRFToken();
        
        const headers = {};
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        const response = await fetch(`${API_BASE}/api/menu-items/${itemId}/`, {
            method: 'DELETE',
            headers: headers,
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast('Menu item deleted!', 'success');
            await loadMenuItems();
        } else {
            throw new Error('Failed to delete menu item');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showToast('Error deleting menu item', 'error');
    }
}

function editMenuItem(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    currentEditingItem = itemId;
    document.getElementById('itemModalTitle').textContent = 'Edit Menu Item';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemAvailable').checked = item.available;
    showModal('itemModal');
}

// UI Functions
function bindEvents() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Add buttons
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        currentEditingCategory = null;
        document.getElementById('categoryModalTitle').textContent = 'Add Category';
        document.getElementById('categoryForm').reset();
        showModal('categoryModal');
    });
    
    document.getElementById('addItemBtn').addEventListener('click', () => {
        currentEditingItem = null;
        document.getElementById('itemModalTitle').textContent = 'Add Menu Item';
        document.getElementById('itemForm').reset();
        document.getElementById('itemAvailable').checked = true; // Default to available
        showModal('itemModal');
    });
    
    // Form submissions
    document.getElementById('categoryForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value
        };
        saveCategory(formData);
    });
    
    document.getElementById('itemForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('itemName').value);
        formData.append('price', document.getElementById('itemPrice').value);
        formData.append('description', document.getElementById('itemDescription').value);
        formData.append('category', document.getElementById('itemCategory').value);
        formData.append('available', document.getElementById('itemAvailable').checked ? 'true' : 'false');
        
        const imageFile = document.getElementById('itemImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        saveMenuItem(formData);
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Filters
    document.getElementById('categoryFilter').addEventListener('change', displayMenuItems);
    document.getElementById('availabilityFilter').addEventListener('change', displayMenuItems);
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    document.body.style.overflow = '';
}

function showLoading() {
    document.getElementById('loadingSpinner').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.remove('show');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 4000);
}

// Global functions for onclick handlers
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editMenuItem = editMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.updateOrderStatus = updateOrderStatus;
window.closeModal = closeModal;
