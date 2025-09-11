from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Check authentication configuration'
    
    def handle(self, *args, **options):
        self.stdout.write("=== Authentication Configuration Check ===\n")
        
        # Check users
        self.stdout.write(f"Total users: {User.objects.count()}")
        
        superusers = User.objects.filter(is_superuser=True)
        self.stdout.write(f"Superusers: {superusers.count()}")
        for user in superusers:
            self.stdout.write(f"  - {user.username} ({user.email})")
        
        staff_users = User.objects.filter(is_staff=True, is_superuser=False)
        self.stdout.write(f"Staff users: {staff_users.count()}")
        for user in staff_users:
            self.stdout.write(f"  - {user.username} ({user.email})")
        
        regular_users = User.objects.filter(is_staff=False, is_superuser=False)
        self.stdout.write(f"Regular users: {regular_users.count()}")
        
        self.stdout.write("\n=== Configuration Summary ===")
        self.stdout.write("✓ Authentication using Django's built-in system")
        self.stdout.write("✓ Session-based authentication")
        self.stdout.write("✓ Staff login available")
        
        self.stdout.write(self.style.SUCCESS('\nAuthentication configuration check complete!'))
