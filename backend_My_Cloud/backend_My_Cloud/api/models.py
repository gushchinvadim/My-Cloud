import uuid
from django.db import models
from django.contrib.auth.models import User


class CloudUser(models.Model):
    """Профиль пользователя облачного хранилища"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cloud_profile',
        verbose_name="Системный пользователь"
    )
    fullname = models.CharField(max_length=150, verbose_name="Полное имя")
    # nickname используем как короткое имя для отображения, логин хранится в User.username
    nickname = models.CharField(max_length=15, verbose_name="Короткое имя")
    email = models.EmailField(verbose_name="Email")

    is_admin = models.BooleanField(default=False, verbose_name="Признак администратора")

    # Путь к хранилищу (например, 'storage/user_123/')
    storage_path = models.CharField(max_length=255, blank=True, verbose_name="Путь к хранилищу")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cloud_user'
        ordering = ['fullname']
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'

    def __str__(self):
        return self.fullname


class File(models.Model):
    """Файл в облачном хранилище"""
    owner = models.ForeignKey(
        CloudUser,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name="Владелец"
    )
    original_name = models.CharField(max_length=255, verbose_name="Оригинальное имя")

    # Уникальное имя на диске (UUID + расширение)
    unique_name = models.CharField(max_length=255, unique=True, verbose_name="Уникальное имя файла")

    file_path = models.CharField(max_length=500, verbose_name="Путь к файлу")
    size = models.BigIntegerField(default=0, verbose_name="Размер (байт)")
    comment = models.TextField(blank=True, default='', verbose_name="Комментарий")

    # Обезличенная ссылка (UUID)
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")
    last_downloaded_at = models.DateTimeField(null=True, blank=True, verbose_name="Последнее скачивание")

    class Meta:
        db_table = 'cloud_file'
        ordering = ['-uploaded_at']
        verbose_name = 'Файл'
        verbose_name_plural = 'Файлы'

    def __str__(self):
        return self.original_name