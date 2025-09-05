from rest_framework import serializers
from .models import MenuCategory, MenuItem, Order, OrderItem

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'available', 'image']

class MenuCategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = MenuCategory
        fields = ['id', 'name', 'description', 'items']

class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.ReadOnlyField(source='menu_item.name')

    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'menu_item_name', 'quantity', 'subtotal']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ['id', 'customer_name', 'customer_phone', 'status', 'total_price', 'items', 'created_at']
        read_only_fields = ['status', 'total_price', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)

        total_price = 0
        for item_data in items_data:
            menu_item = item_data['menu_item']
            quantity = item_data.get('quantity', 1)
            order_item = OrderItem.objects.create(order=order, menu_item=menu_item, quantity=quantity)
            total_price += order_item.subtotal

        order.total_price = total_price
        order.save()
        return order