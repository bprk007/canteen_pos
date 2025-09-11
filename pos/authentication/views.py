from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
import json
import re
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

def is_student_email(email):
    """Check if email follows student pattern"""
    if not email or '@' not in email:
        return False
    
    # Check for institute domain
    if not email.endswith('@iiitkota.ac.in'):
        return False
    
    username_part = email.split('@')[0].lower()
    
    # Student email patterns (customize these based on your institute's format)
    student_patterns = [
        r'^\d{4}[a-z]{2}\d{4}$',  # Format: 2021cs1234
        r'^[a-z]\d{7,}$',         # Format: s1234567
        r'^\d{4}[a-z]+\d+$',      # Format: 2021computer123
        r'^student\d+$',          # Format: student123
    ]
    
    return any(re.match(pattern, username_part) for pattern in student_patterns)

def is_staff_email(email):
    """Check if email follows staff pattern"""
    if not email or '@' not in email:
        return False
    
    # Check for institute domain
    if not email.endswith('@iiitkota.ac.in'):
        return False
    
    username_part = email.split('@')[0].lower()
    
    # Staff email patterns
    staff_patterns = [
        r'^[a-z]+\.[a-z]+$',      # Format: john.doe
        r'^[a-z]+_[a-z]+$',       # Format: john_doe
        r'^prof\.[a-z]+$',        # Format: prof.smith
        r'^dr\.[a-z]+$',          # Format: dr.kumar
        r'^staff\d+$',            # Format: staff123
    ]
    
    return any(re.match(pattern, username_part) for pattern in staff_patterns)

@ensure_csrf_cookie
@api_view(['POST'])
@csrf_protect
def login_view(request):
    try:
        data = request.data
    except Exception:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    user_type = data.get('user_type', 'student')  # 'student' or 'staff'
    
    if not email or not password:
        return Response({
            'error': 'Please provide both email and password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate email format based on user type
    if user_type == 'student':
        if not is_student_email(email):
            return Response({
                'error': 'Please use a valid student email address (@iiitkota.ac.in)'
            }, status=status.HTTP_400_BAD_REQUEST)
    elif user_type == 'staff':
        if not is_staff_email(email):
            return Response({
                'error': 'Please use a valid staff email address (@iiitkota.ac.in)'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Try to authenticate with email as username
    user = authenticate(request, username=email, password=password)
    
    # If that fails, try to find user by email and authenticate with username
    if user is None:
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    
    if user is not None and user.is_active:
        # Check user type permissions
        if user_type == 'staff' and not (user.is_staff or user.is_superuser):
            return Response({
                'error': 'This account does not have staff privileges'
            }, status=status.HTTP_403_FORBIDDEN)
        
        login(request, user)
        response = Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'user_type': 'staff' if user.is_staff or user.is_superuser else 'student'
            }
        })
        response.set_cookie(
            'sessionid',
            request.session.session_key,
            httponly=True,
            samesite='Lax'
        )
        return response
    else:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

@ensure_csrf_cookie
@api_view(['POST'])
@csrf_protect
def register_view(request):
    """Register new student account"""
    try:
        data = request.data
    except Exception:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    
    # Validation
    if not all([email, password, confirm_password, first_name]):
        return Response({
            'error': 'Please fill in all required fields'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if password != confirm_password:
        return Response({
            'error': 'Passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters long'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not is_student_email(email):
        return Response({
            'error': 'Please use a valid student email address (@iiitkota.ac.in)'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response({
            'error': 'An account with this email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if User.objects.filter(username=email).exists():
        return Response({
            'error': 'An account with this email already exists'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create new user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=False,
            is_superuser=False
        )
        
        # Auto-login the user
        login(request, user)
        
        response = Response({
            'success': True,
            'message': 'Account created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'user_type': 'student'
            }
        })
        response.set_cookie(
            'sessionid',
            request.session.session_key,
            httponly=True,
            samesite='Lax'
        )
        return response
    except Exception as e:
        return Response({
            'error': f'Failed to create account: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@ensure_csrf_cookie
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    """Get current user information"""
    return Response({
        'user': {
            'username': request.user.username,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'email': request.user.email,
        }
    })

@ensure_csrf_cookie
@api_view(['GET'])
def csrf_token(request):
    """Get CSRF token"""
    return Response({'csrfToken': request.META.get('CSRF_COOKIE')})
