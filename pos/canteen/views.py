from django.shortcuts import render
from rest_framework import viewsets
from .models import MenuCategory, MenuItem
from .serializers import MenuCategorySerializer, MenuItemSerializer, OrderSerializer
from .models import Order

class MenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all()
    serializer_class = MenuCategorySerializer

class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer