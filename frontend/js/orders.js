// Orders page JS for live updates and filtering
const API_BASE = window.location.origin.replace(':3000', ':8000');
const WS_BASE = API_BASE.replace('http', window.location.protocol === 'https:' ? 'wss' : 'ws');

let ordersSocket = null;

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'manage.html';
    });
    document.getElementById('statusFilter').addEventListener('change', filterOrders);
    
    // Force HTMX to hit the Django API (8000) instead of current origin (3000)
    const container = document.getElementById('ordersTableContainer');
    if (container) {
        container.setAttribute('hx-get', `${API_BASE}/api/orders/table/`);
        container.setAttribute('hx-credentials', 'include');
        try { if (window.htmx) htmx.process(container); } catch (e) { console.error('HTMX init error', e); }
        // Always perform an immediate fetch-based load (avoids CORS preflight header issues)
        loadOrdersTable();
        // Poll as a safety net every 5s
        setInterval(loadOrdersTable, 5000);
    }

    // After HTMX swaps, re-point hx-get to absolute API again (template may contain relative path)
    document.body.addEventListener('htmx:afterSwap', (e) => {
        if (e.target && e.target.id === 'ordersTableContainer') {
            e.target.setAttribute('hx-get', `${API_BASE}/api/orders/table/`);
            e.target.setAttribute('hx-credentials', 'include');
        }
    });

    document.body.addEventListener('htmx:responseError', (e) => {
        console.error('HTMX error for', e.detail.pathInfo && e.detail.pathInfo.requestPath, e.detail.xhr && e.detail.xhr.status);
        // Immediately fallback to fetch-based load
        loadOrdersTable();
    });

    // Initialize WebSocket connection
    initWebSocket();
});

function initWebSocket() {
    try {
        ordersSocket = new WebSocket(`${WS_BASE}/ws/orders/`);
        
        ordersSocket.onopen = function(e) {
            console.log('WebSocket connection established');
            showToast('Connected to live order updates', 'success');
        };
        
        ordersSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            
            if (data.type === 'new_order') {
                showToast('New order received!', 'info');
                refreshOrdersTable();
            } else if (data.type === 'order_update') {
                showToast('Order status updated', 'success');
                refreshOrdersTable();
            }
        };
        
        ordersSocket.onclose = function(e) {
            console.log('WebSocket connection closed');
            showToast('Disconnected from live updates', 'warning');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(initWebSocket, 3000);
        };
        
        ordersSocket.onerror = function(e) {
            console.error('WebSocket error:', e);
            showToast('Connection error. Using polling fallback.', 'warning');
        };
        
    } catch (error) {
        console.error('WebSocket initialization error:', error);
        showToast('WebSocket not available. Using polling fallback.', 'warning');
    }
}

function filterOrders() {
    const status = document.getElementById('statusFilter').value;
    let url = `${API_BASE}/api/orders/table/`;
    if (status) {
        url += `?status=${status}`;
    }
    document.getElementById('ordersTableContainer').setAttribute('hx-get', url);
    htmx.trigger(document.getElementById('ordersTableContainer'), 'refresh');
}

function refreshOrdersTable() {
    const el = document.getElementById('ordersTableContainer');
    try {
        if (window.htmx && el) return htmx.trigger(el, 'refresh');
    } catch {}
    loadOrdersTable();
}

// Global function for order status updates (called from template)
async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    
    try {
        const csrfToken = getCookie('csrftoken');
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        const response = await fetch(`${API_BASE}/api/orders/${orderId}/`, {
            method: 'PATCH',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showToast('Order status updated!', 'success');
            // Table will be updated via WebSocket or polling
        } else {
            throw new Error('Failed to update order status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showToast('Error updating order status', 'error');
    }
}

// Utility functions
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

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' :
                 'fa-info-circle';
    
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
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// Make updateOrderStatus globally available
window.updateOrderStatus = updateOrderStatus;

// Fallback loader using fetch if HTMX is unavailable or blocked
async function loadOrdersTable() {
    try {
        const status = document.getElementById('statusFilter').value;
        let url = `${API_BASE}/api/orders/table/`;
        if (status) url += `?status=${encodeURIComponent(status)}`;
        const resp = await fetch(url, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();
        const container = document.getElementById('ordersTableContainer');
        if (container) container.outerHTML = html;
    } catch (err) {
        console.error('Fallback loadOrdersTable failed:', err);
    }
}
