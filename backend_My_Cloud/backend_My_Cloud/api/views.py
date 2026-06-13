import os
import uuid
import shutil
import logging
import mimetypes
from django.conf import settings
from django.contrib.auth import login, logout, authenticate
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.middleware.csrf import get_token
from django.http import JsonResponse, FileResponse
from .models import CloudUser, File
from .serializers import RegisterSerializer, UserSerializer, FileSerializer

# Настройка логгера
logger = logging.getLogger('api')


def generate_unique_filename(original_name, upload_path):
    """Генерирует уникальное имя файла с проверкой на существование"""
    ext = os.path.splitext(original_name)[1].lower()
    max_attempts = 10

    for attempt in range(max_attempts):
        unique_name = f"{uuid.uuid4()}{ext}"
        full_path = os.path.join(upload_path, unique_name)

        if not os.path.exists(full_path):
            return unique_name

    # Если за 10 попыток не нашли уникальное имя — добавляем timestamp
    import time
    return f"{uuid.uuid4()}_{int(time.time())}{ext}"


# ==================== АУТЕНТИФИКАЦИЯ ====================

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', 'unknown')
        logger.info(f"📝 Попытка регистрации: {username}")

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)  # Автоматический вход после регистрации
            logger.info(f"✅ Пользователь зарегистрирован: {username}")
            return Response({"message": "Регистрация успешна"}, status=status.HTTP_201_CREATED)

        logger.warning(f"❌ Ошибка регистрации: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('login')
        logger.info(f"🔐 Попытка входа: {username}")

        user = authenticate(request, username=username, password=request.data.get('password'))
        if user:
            login(request, user)
            logger.info(f"✅ Успешный вход: {username}")
            return Response({"message": "Успешный вход", "is_admin": user.cloud_profile.is_admin})

        logger.warning(f"❌ Неудачная попытка входа: {username}")
        return Response({"error": "Неверный логин или пароль"}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    def post(self, request):
        username = request.user.username if request.user.is_authenticated else 'anonymous'
        logger.info(f"🚪 Выход пользователя: {username}")
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
            "nickname": cloud_profile.nickname,
            "fullname": cloud_profile.fullname,
            "is_admin": cloud_profile.is_admin
        })


class GetCSRFToken(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = get_token(request)
        return JsonResponse({'csrfToken': token})


# ==================== АДМИНИСТРИРОВАНИЕ ====================

class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Проверяем наше поле is_admin
        if not hasattr(request.user, 'cloud_profile') or not request.user.cloud_profile.is_admin:
            logger.warning(f"⛔ Попытка доступа к списку пользователей от не-админа: {request.user.username}")
            return Response({"error": "Доступ запрещен"}, status=403)

        users = CloudUser.objects.all()
        logger.info(f"📋 Админ {request.user.username} запросил список пользователей")
        return Response(UserSerializer(users, many=True).data)


class AdminUserDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        if not hasattr(request.user, 'cloud_profile') or not request.user.cloud_profile.is_admin:
            logger.warning(f"⛔ Попытка удаления пользователя от не-админа: {request.user.username}")
            return Response({"error": "Доступ запрещен"}, status=403)

        try:
            cloud_user = CloudUser.objects.get(id=user_id)
            username = cloud_user.user.username

            # Не даём удалять самого себя
            if cloud_user.user == request.user:
                logger.warning(f"⚠️ Попытка удалить самого себя: {request.user.username}")
                return Response({"error": "Нельзя удалить самого себя"}, status=400)

            logger.info(f"🗑️ Админ {request.user.username} удаляет пользователя: {username}")

            # Удаляем папку с файлами пользователя
            user_folder = os.path.join(settings.MEDIA_ROOT, cloud_user.storage_path)
            if os.path.exists(user_folder):
                shutil.rmtree(user_folder)
                logger.info(f"📁 Удалена папка пользователя: {user_folder}")

            # Удаляем пользователя Django (каскадно удалит CloudUser и File)
            cloud_user.user.delete()

            logger.info(f"✅ Пользователь {username} успешно удалён")
            return Response({"message": "Пользователь удален"})

        except CloudUser.DoesNotExist:
            logger.warning(f"❌ Пользователь с id={user_id} не найден")
            return Response({"error": "Пользователь не найден"}, status=404)
        except Exception as e:
            logger.error(f"❌ Ошибка при удалении пользователя: {str(e)}", exc_info=True)
            return Response({"error": "Ошибка при удалении"}, status=500)


class AdminToggleAdminView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, user_id):
        if not hasattr(request.user, 'cloud_profile') or not request.user.cloud_profile.is_admin:
            logger.warning(f"⛔ Попытка изменения прав от не-админа: {request.user.username}")
            return Response({"error": "Доступ запрещен"}, status=403)

        try:
            cloud_user = CloudUser.objects.get(id=user_id)
            username = cloud_user.user.username

            # Не даём снимать админа с самого себя
            if cloud_user.user == request.user and cloud_user.is_admin:
                logger.warning(f"⚠️ Попытка снять админа с самого себя: {request.user.username}")
                return Response({"error": "Нельзя снять админа с самого себя"}, status=400)

            cloud_user.is_admin = not cloud_user.is_admin
            cloud_user.save()

            action = "назначен админом" if cloud_user.is_admin else "снят с поста админа"
            logger.info(f"👤 Пользователь {username} {action} админом {request.user.username}")

            return Response({"is_admin": cloud_user.is_admin})

        except CloudUser.DoesNotExist:
            logger.warning(f"❌ Пользователь с id={user_id} не найден")
            return Response({"error": "Пользователь не найден"}, status=404)


# ==================== ФАЙЛОВОЕ ХРАНИЛИЩЕ ====================

class FileListView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')

        # Если передан user_id, проверяем права админа
        if user_id:
            if not request.user.cloud_profile.is_admin:
                logger.warning(f"⛔ Пользователь {request.user.username} попытался просмотреть чужое хранилище")
                return Response({"error": "Доступ запрещен"}, status=403)
            try:
                owner = CloudUser.objects.get(id=user_id)
                logger.info(
                    f"👁️ Админ {request.user.username} просматривает хранилище пользователя {owner.user.username}")
            except CloudUser.DoesNotExist:
                logger.warning(f"❌ Владелец с id={user_id} не найден")
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
            logger.warning(f"❌ Попытка загрузки без файла от {request.user.username}")
            return Response({"error": "Файл не передан"}, status=400)

        logger.info(f"📤 Загрузка файла: {uploaded_file.name} ({uploaded_file.size} байт) от {request.user.username}")

        # Формирование пути
        folder = os.path.join(settings.MEDIA_ROOT, owner.storage_path)
        os.makedirs(folder, exist_ok=True)

        # Генерация уникального имени с проверкой на существование
        unique_name = generate_unique_filename(uploaded_file.name, folder)
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

        logger.info(f"✅ Файл {uploaded_file.name} успешно загружен как {unique_name}")
        return Response({"message": "Файл загружен"}, status=201)


class FileDetailView(APIView):
    def delete(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
            logger.info(
                f"🗑️ Удаление файла: {file_obj.original_name} (id={file_id}) пользователем {request.user.username}")

            if os.path.exists(file_obj.file_path):
                os.remove(file_obj.file_path)
                logger.info(f"📁 Файл удалён с диска: {file_obj.file_path}")

            file_obj.delete()
            logger.info(f"✅ Файл {file_obj.original_name} успешно удалён из БД")
            return Response({"message": "Файл удален"})

        except File.DoesNotExist:
            logger.warning(f"❌ Файл с id={file_id} не найден")
            return Response({"error": "Файл не найден"}, status=404)

    def patch(self, request, file_id):
        try:
            file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
            old_name = file_obj.original_name

            if 'comment' in request.data:
                file_obj.comment = request.data['comment']
            if 'new_name' in request.data:
                file_obj.original_name = request.data['new_name']

            file_obj.save()
            logger.info(f"✏️ Файл id={file_id} обновлён: {old_name} → {file_obj.original_name}")
            return Response(FileSerializer(file_obj).data)

        except File.DoesNotExist:
            logger.warning(f"❌ Файл с id={file_id} не найден")
            return Response({"error": "Файл не найден"}, status=404)


class FileDownloadView(APIView):
    def get(self, request, file_id):
        try:
            # Проверяем, админ ли просматривает чужое хранилище
            user_id = request.query_params.get('user_id')
            if user_id and request.user.cloud_profile.is_admin:
                owner = CloudUser.objects.get(id=user_id)
                file_obj = File.objects.get(id=file_id, owner=owner)
                logger.info(
                    f"⬇️ Админ {request.user.username} скачивает файл {file_obj.original_name} пользователя {owner.user.username}")
            else:
                file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
                logger.info(f"⬇️ Пользователь {request.user.username} скачивает файл {file_obj.original_name}")

            file_obj.last_downloaded_at = timezone.now()
            file_obj.save(update_fields=['last_downloaded_at'])

            response = FileResponse(open(file_obj.file_path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
            return response

        except File.DoesNotExist:
            logger.warning(f"❌ Файл с id={file_id} не найден")
            return Response({"error": "Файл не найден"}, status=404)
        except CloudUser.DoesNotExist:
            logger.warning(f"❌ Пользователь с id={user_id} не найден")
            return Response({"error": "Пользователь не найден"}, status=404)


class FileShareView(APIView):
    def post(self, request, file_id):
        try:
            # Получаем user_id из query_params
            user_id = request.query_params.get('user_id')

            if user_id and request.user.cloud_profile.is_admin:
                # Админ просматривает чужое хранилище
                owner = CloudUser.objects.get(id=user_id)
                file_obj = File.objects.get(id=file_id, owner=owner)
                logger.info(
                    f"🔗 Админ {request.user.username} генерирует ссылку для файла {file_obj.original_name} пользователя {owner.user.username}")
            else:
                # Пользователь просматривает своё хранилище
                file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
                logger.info(
                    f"🔗 Пользователь {request.user.username} генерирует ссылку для файла {file_obj.original_name}")

            # Возвращаем ссылку
            share_url = f"/api/shared/{file_obj.share_token}/"
            logger.info(f"✅ Ссылка сгенерирована: {share_url}")
            return Response({"share_url": share_url})

        except File.DoesNotExist:
            logger.warning(f"❌ Файл с id={file_id} не найден")
            return Response({"error": "Файл не найден"}, status=404)
        except CloudUser.DoesNotExist:
            logger.warning(f"❌ Пользователь с id={user_id} не найден")
            return Response({"error": "Пользователь не найден"}, status=404)
        except Exception as e:
            logger.error(f"❌ Ошибка в FileShareView: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=500)


class PublicFileDownloadView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            file_obj = File.objects.get(share_token=token)
            logger.info(f"🌐 Публичное скачивание файла: {file_obj.original_name} по токену {token}")

            file_obj.last_downloaded_at = timezone.now()
            file_obj.save(update_fields=['last_downloaded_at'])

            response = FileResponse(
                open(file_obj.file_path, 'rb'),
                as_attachment=True,
                filename=file_obj.original_name
            )
            return response

        except File.DoesNotExist:
            logger.warning(f"❌ Недействительная публичная ссылка: {token}")
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
                logger.info(
                    f"👁️ Админ {request.user.username} просматривает превью файла {file_obj.original_name} пользователя {owner.user.username}")
            else:
                file_obj = File.objects.get(id=file_id, owner=request.user.cloud_profile)
                logger.info(
                    f"👁️ Пользователь {request.user.username} просматривает превью файла {file_obj.original_name}")

            if not os.path.exists(file_obj.file_path):
                logger.error(f"❌ Файл не найден на диске: {file_obj.file_path}")
                return Response({"error": "Файл не найден на диске"}, status=404)

            # Определяем MIME-тип по расширению
            mime_type, _ = mimetypes.guess_type(file_obj.original_name)
            if not mime_type:
                mime_type = 'application/octet-stream'

            # Открываем файл и отдаём inline
            response = FileResponse(
                open(file_obj.file_path, 'rb'),
                content_type=mime_type
            )
            response['Content-Disposition'] = f'inline; filename="{file_obj.original_name}"'
            return response

        except File.DoesNotExist:
            logger.warning(f"❌ Файл с id={file_id} не найден")
            return Response({"error": "Файл не найден"}, status=404)
        except Exception as e:
            logger.error(f"❌ Ошибка в FilePreviewView: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=500)