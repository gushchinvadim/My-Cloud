from django.contrib import admin
from .models import CloudUser, File

@admin.register(CloudUser)
class CloudUserAdmin(admin.ModelAdmin):
    list_display = ['fullname', 'nickname', 'email', 'is_admin']
    search_fields = ['fullname', 'nickname', 'email']

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'owner', 'size', 'uploaded_at']
    list_filter = ['owner', 'uploaded_at']