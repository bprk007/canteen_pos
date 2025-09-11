# canteen/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

class OrderConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.room_group_name = 'orders'
        
    async def connect(self):
        # For now, allow all connections to test functionality
        # In production, you might want to check authentication
        # if self.scope["user"] == AnonymousUser() or not self.scope["user"].is_staff:
        #     await self.close()
        #     return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group only if we joined it
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        pass  # We don't expect messages from client for now

    # Receive message from room group
    async def order_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'order_update',
            'data': event['data']
        }))
        
    async def new_order(self, event):
        # Send new order notification to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'new_order',
            'data': event['data']
        }))
