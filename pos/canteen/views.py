from django.shortcuts import render
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from django.template.loader import render_to_string
from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import MenuCategory, MenuItem, Order
from .serializers import MenuCategorySerializer, MenuItemSerializer, OrderSerializer


class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all()
    serializer_class = MenuCategorySerializer
    permission_classes = [permissions.AllowAny]

class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'available']
    search_fields = ['name', 'description']
    permission_classes = [permissions.AllowAny]

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        """Override create method to handle order creation"""
        # CSRF debug
        try:
            csrf_cookie = request.META.get('CSRF_COOKIE')
            csrf_header = request.META.get('HTTP_X_CSRFTOKEN')
            origin = request.META.get('HTTP_ORIGIN')
            referer = request.META.get('HTTP_REFERER')
            print(f"[CSRF DEBUG] cookie={csrf_cookie} header={csrf_header} origin={origin} referer={referer}")
        except Exception as e:
            print(f"[CSRF DEBUG] error reading meta: {e}")
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests to update order status"""
        return super().partial_update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Handle PUT requests to update order"""
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Handle DELETE requests"""
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def table(self, request):
        """Return HTML table for HTMX updates"""
        status_filter = request.GET.get('status', '')
        orders = self.get_queryset()
        
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        html = render_to_string('orders_table.html', {
            'orders': orders,
            'status_choices': Order.STATUS_CHOICES
        })
        
        return HttpResponse(html)