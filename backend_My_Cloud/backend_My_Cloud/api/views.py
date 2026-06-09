import os
import uuid
from django.conf import settings
from django.contrib.auth import login, logout, authenticate
from django.http import FileResponse, JsonResponse
from django.utils import timezone
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import CloudUser, File
from .serializers import RegisterSerializer, UserSerializer, FileSerializer


# ==================== АУТЕНТИФИКАЦИЯ ====================

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)  # Автоматический вход после регистрации
            return Response({"message": "Регистрация успешна"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = authenticate(request, username=request.data.get('login'), password=request.data.get('password'))
        if user:
            login(request, user)
            return Response({"message": "Успешный вход", "is_admin": user.cloud_profile.is_admin})
        return Response({"error": "Неверный логин или пароль"}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Выход выполнен"})


class MeView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Не авторизован"}, status=401)
        return Response({
            "id": request.user.id,
            "login": request.user.username,
            "is_admin": request.user.cloud_profile.is_admin
        })


# ==================== АДМИНИСТРИРОВАНИЕ ====================

class AdminUserListView(APIView):
    permission_classes = [permissions.IsAdminUser]  # Только админы (по is_staff) или кастомная проверка

    # Для проверки именно нашего поля is_admin:
    def get(self, request):
        if not request.user.cloud_profile.is_admin:
            return Response({"error": "Доступ запрещен"}, status=403)
        users = CloudUser.objects.all()
        return Response(UserSerializer(users, many=True).data)


class AdminUserDeleteView(APIView):
    def delete(self, request, user_id):
        if not request.user.cloud_profile.is_admin:
            return Response({"error": "Доступ запрещен"}, status=403)
        try:
            cloud_user = CloudUser.objects.get(id=user_id)
            cloud_user.user.delete()  # Удалит и CloudUser через CASCADE
            return Response({"message": "Пользователь удален"})
        except CloudUser.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=404)


class AdminToggleAdminView(APIView):
    def patch(self, request, user_id):
        if not request.user.cloud_profile.is_admin:
            return Response({"error": "Доступ запрещен"}, status=403)
        try:
            cloud_user = CloudUser.objects.get(id=user_id)
            cloud_user.is_admin = not cloud_user.is_admin
            cloud_user.save()
            return Response({"is_admin": cloud_user.is_admin})
        except CloudUser.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=404)


# ==================== ФАЙЛОВОЕ ХРАНИЛИЩЕ ====================

class FileListView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')

        # Если передан user_id, проверяем права админа
        if user_id:
            if not request.user.cloud_profile.is_admin:
                return Response({"error": "Доступ запрещен"}, status=403)
            try:
                owner = CloudUser.objects.get(id=user_id)
            except CloudUser.DoesNotExist:
                return Response({"error": "Владелец не найден"}, status=404)
        else:
            owner = request.user.cloud_profile

        files = File.objects.filter(owner=owner)
        return Response(FileSerializer(files, many=True).data)


class FileUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        owner = request.user.cloud_profile
        uploaded_file = request.FILES.get('file')
        comment = request.data.get('comment', '')

        if not uploaded_file:
            return Response({"error": "Файл не передан"}, status=400)

        # Генерация уникального имени
        ext = os.path.splitext(uploaded_file.name)[1]
        unique_name = f"{uuid.uuid4()}{ext}"

        # Формирование пути
        folder = os.path.join(settings.MEDIA_ROOT, owner.storage_path)
        os.makedirs(folder, exist_ok=True)
        file_path = os.path.join(folder, unique_name)

        # Сохранение на диск
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # Запись в БД
        File.objects.create(
            owner=owner,
            original_name=uploaded_file.name,
            unique_name=unique_name,
            file_path=file_path,
            size=uploaded_file.size,
            comment=comment
        )
        return Response({"message": "Файл загружен"}, status=201)


class FileDetailView(APIView):
    def delete(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
            if os.path.exists(file_obj.file_path):
                os.remove(file_obj.file_path)
            file_obj.delete()
            return Response({"message": "Файл удален"})
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)

    def patch(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
            if 'comment' in request.data:
                file_obj.comment = request.data['comment']
            if 'new_name' in request.data:
                file_obj.original_name = request.data['new_name']
            file_obj.save()
            return Response(FileSerializer(file_obj).data)
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)


class FileDownloadView(APIView):
    def get(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
            file_obj.last_downloaded_at = timezone.now()
            file_obj.save(update_fields=['last_downloaded_at'])

            response = FileResponse(open(file_obj.file_path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
            return response
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)


class FileShareView(APIView):
    def post(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
            # Токент уже сгенерирован при создании, просто возвращаем его
            share_url = f"/api/shared/{file_obj.share_token}/"
            return Response({"share_url": share_url})
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)


class PublicFileDownloadView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            file_obj = File.objects.get(share_token=token)
            file_obj.last_downloaded_at = timezone.now()
            file_obj.save(update_fields=['last_downloaded_at'])

            response = FileResponse(open(file_obj.file_path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
            return response
        except File.DoesNotExist:
            return Response({"error": "Ссылка недействительна"}, status=404)