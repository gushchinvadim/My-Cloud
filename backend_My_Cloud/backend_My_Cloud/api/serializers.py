import re
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import CloudUser, File

# Регулярные выражения для валидации
LOGIN_REGEX = re.compile(r'^[a-zA-Z][a-zA-Z0-9]{3,19}$')
PASSWORD_REGEX = re.compile(r'^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$')
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


class RegisterSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=20)
    fullname = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_login(self, value):
        if not LOGIN_REGEX.match(value):
            raise serializers.ValidationError("Логин: 4-20 символов, начинается с буквы, только латиница и цифры.")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует.")
        return value

    def validate_email(self, value):
        if not EMAIL_REGEX.match(value):
            raise serializers.ValidationError("Некорректный формат email.")
        return value

    def validate_password(self, value):
        if not PASSWORD_REGEX.match(value):
            raise serializers.ValidationError("Пароль: мин. 6 символов, 1 заглавная, 1 цифра, 1 спецсимвол (@$!%*?&).")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['login'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        CloudUser.objects.create(
            user=user,
            fullname=validated_data['fullname'],
            email=validated_data['email'],
            storage_path=f"storage/user_{user.id}/"
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Сериализатор для списка пользователей (без пароля)"""
    login = serializers.CharField(source='user.username', read_only=True)
    files_count = serializers.IntegerField(source='files.count', read_only=True)
    total_size = serializers.SerializerMethodField()

    class Meta:
        model = CloudUser
        fields = ['id', 'login', 'fullname', 'nickname', 'email', 'is_admin', 'files_count', 'total_size']

    def get_total_size(self, obj):
        return sum(f.size for f in obj.files.all())


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'original_name', 'size', 'comment', 'uploaded_at', 'last_downloaded_at', 'share_token']
        read_only_fields = ['id', 'original_name', 'size', 'uploaded_at', 'last_downloaded_at', 'share_token']