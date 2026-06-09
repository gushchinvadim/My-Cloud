from django.urls import path
from . import views

urlpatterns = [
    # Аутентификация
    path('auth/register/', views.RegisterView.as_view()),
    path('auth/login/', views.LoginView.as_view()),
    path('auth/logout/', views.LogoutView.as_view()),
    path('auth/me/', views.MeView.as_view()),

    # Администрирование
    path('admin/users/', views.AdminUserListView.as_view()),
    path('admin/users/<int:user_id>/delete/', views.AdminUserDeleteView.as_view()),
    path('admin/users/<int:user_id>/toggle-admin/', views.AdminToggleAdminView.as_view()),

    # Файловое хранилище
    path('files/', views.FileListView.as_view()),
    path('files/upload/', views.FileUploadView.as_view()),
    path('files/<int:file_id>/', views.FileDetailView.as_view()),
    path('files/<int:file_id>/download/', views.FileDownloadView.as_view()),
    path('files/<int:file_id>/share/', views.FileShareView.as_view()),

    # Публичная ссылка (обезличенная)
    path('shared/<uuid:token>/', views.PublicFileDownloadView.as_view()),
]