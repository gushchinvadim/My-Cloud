import os
import uuid
from django.conf import settings
from django.contrib.auth import login, logout, authenticate
from django.utils import timezone
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.middleware.csrf import get_token
from django.http import JsonResponse, FileResponse, HttpResponse
from .models import CloudUser, File
from .serializers import RegisterSerializer, UserSerializer, FileSerializer
import mimetypes


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

        cloud_profile = request.user.cloud_profile
        return Response({
            "id": request.user.id,
            "login": request.user.username,
            "nickname": cloud_profile.nickname,  # ← Добавили
            "fullname": cloud_profile.fullname,  # ← Добавили (пригодится)
            "is_admin": cloud_profile.is_admin
        })

class GetCSRFToken(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = get_token(request)
        return JsonResponse({'csrfToken': token})


# ==================== АДМИНИСТРИРОВАНИЕ ====================

class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # ← Было IsAdminUser

    def get(self, request):
        # Проверяем наше поле is_admin
        if not hasattr(request.user, 'cloud_profile') or not request.user.cloud_profile.is_admin:
            return Response({"error": "Доступ запрещен"}, status=403)

        users = CloudUser.objects.all()
        return Response(UserSerializer(users, many=True).data)


class AdminUserDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # ← Было IsAdminUser

    def delete(self, request, user_id):
        if not hasattr(request.user, 'cloud_profile') or not request.user.cloud_profile.is_admin:
            return Response({"error": "Доступ запрещен"}, status=403)
        try:
            cloud_user = CloudUser.objects.get(id=user_id)
            # Не даём удалять самого себя
            if cloud_user.user == request.user:
                return Response({"error": "Нельзя удалить самого себя"}, status=400)
            cloud_user.user.delete()
            return Response({"message": "Пользователь удален"})
        except CloudUser.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=404)


class AdminToggleAdminView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # ← Было IsAdminUser

    def patch(self, request, user_id):
        if not hasattr(request.user, 'cloud_profile') or not request.user.cloud_profile.is_admin:
            return Response({"error": "Доступ запрещен"}, status=403)
        try:
            cloud_user = CloudUser.objects.get(id=user_id)
            # Не даём снимать админа с самого себя
            if cloud_user.user == request.user and cloud_user.is_admin:
                return Response({"error": "Нельзя снять админа с самого себя"}, status=400)
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
            # Проверяем, админ ли просматривает чужое хранилище
            user_id = request.query_params.get('user_id')
            if user_id and request.user.cloud_profile.is_admin:
                owner = CloudUser.objects.get(id=user_id)
                file_obj = File.objects.get(id=file_id, owner=owner)
            else:
                file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)

            file_obj.last_downloaded_at = timezone.now()
            file_obj.save(update_fields=['last_downloaded_at'])

            response = FileResponse(open(file_obj.file_path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
            return response
        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)
        except CloudUser.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=404)


class FileShareView(APIView):
    def post(self, request, file_id):
        try:
            # Получаем user_id из query_params (не из body, т.к. тело может быть пустым)
            user_id = request.query_params.get('user_id')

            if user_id and request.user.cloud_profile.is_admin:
                # Админ просматривает чужое хранилище
                owner = CloudUser.objects.get(id=user_id)
                file_obj = File.objects.get(id=file_id, owner=owner)
            else:
                # Пользователь просматривает своё хранилище
                file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)

            # Возвращаем ссылку
            share_url = f"/api/shared/{file_obj.share_token}/"
            return Response({"share_url": share_url})

        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)
        except CloudUser.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=404)
        except Exception as e:
            # Логируем ошибку для отладки
            print(f"Error in FileShareView: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)

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



# ==================== ПРЕДПРОСМОТР ====================

class FilePreviewView(APIView):
    """Предпросмотр файла (inline, с правильным Content-Type)"""

    def get(self, request, file_id):
        try:
            # Проверяем права доступа
            if request.user.cloud_profile.is_admin and 'user_id' in request.query_params:
                owner = CloudUser.objects.get(id=request.query_params['user_id'])
                file_obj = File.objects.get(id=file_id, owner=owner)
            else:
                file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)

            if not os.path.exists(file_obj.file_path):
                return Response({"error": "Файл не найден на диске"}, status=404)

            # Определяем MIME-тип по расширению
            mime_type, _ = mimetypes.guess_type(file_obj.original_name)
            if not mime_type:
                mime_type = 'application/octet-stream'

            # Открываем файл и отдаём inline (не как attachment)
            response = FileResponse(
                open(file_obj.file_path, 'rb'),
                content_type=mime_type
            )
            # Inline — браузер попытается отобразить, а не скачать
            response['Content-Disposition'] = f'inline; filename="{file_obj.original_name}"'
            return response

        except File.DoesNotExist:
            return Response({"error": "Файл не найден"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)