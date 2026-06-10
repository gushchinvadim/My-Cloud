# Дипломный проект My-Cloud. Автор: Вадим Гущин. 2026

## Создание backend (Локально)
1. Создаем папку проекта в требуемой директории: My-Cloud/backend_My_Cloud;
2. Заходим в неё и устанавливаем вмртуальное окружение: python3 -m venv venv; 
3. Загружаем необходимые приложения: pip install django psycopg2-binary djangorestframework;
4. Активируем виртуальное окружение: source venv/bin/activate;
5. Создаем проект: pip install django  django-admin startproject backend_My_Cloud;
6. Создаем приложение внутри проекта: python manage.py startapp api;
7. На уровне проекта создаем файл .env, устанавливаем: pip install python-decouple django-cors-headers, вносим изменения в settings.py.

   (Можно сгенерировать новый ключ: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
   - SECRET_KEY = config('SECRET_KEY')
   - DEBUG = config('DEBUG', default=False, cast=bool)
   - INSTALLED_APPS = [
       'django.contrib.admin',
       'django.contrib.auth',
       'django.contrib.contenttypes',
       'django.contrib.sessions',
       'django.contrib.messages',
       'django.contrib.staticfiles',
    
       'rest_framework',
       'rest_framework.authtoken',
       'corsheaders',
       'api',
   ]
   - DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': config('DB_NAME'),
           'USER': config('DB_USER'),
           'PASSWORD': config('DB_PASSWORD'),
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   - CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",  # Vite по умолчанию
       "http://127.0.0.1:5173",
   ]

8. Создаем БД в терминале:
   - psql postgres, переходим в postgres=# 
   - CREATE USER vadim WITH PASSWORD 'vadim';
   - CREATE DATABASE my_cloud_db OWNER vadim;
   - GRANT ALL PRIVILEGES ON DATABASE my_cloud_db TO vadim;
   - выход \q

9. Проводим миграции: python manage.py makemigrations, python manage.py migrate;
10. Создаем суперюзера python manage.py createsuperuser и запускаем сервер python manage.py runserver.

## Создание models, vievs, serializers, urls

### models.py состоит из двух моделей: CloudUser и File
Проверка на админ или нет, а так же активный или нет - делегируем в Django User.
Обезличенная ссылка:     @property
                            def share_url(self):
                                """Формирование обезличенной ссылки"""
                                return f"/api/files/shared/{self.share_token}/"
### Настройки хранилища в settings.py

- Базовая папка для хранения файлов
        MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
        MEDIA_URL = '/media/'

- Максимальный размер загружаемого файла (100 МБ)
    FILE_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024
    DATA_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024


### vievs.py
Созданы необходимые эндпоинты
### serializers.py
Созданы необходимые сериализаторы
### urls.py
Созданы api/urls, которое подключил к основному urls проекта
### 📋 Структура папок хранилища

        media/
        └── storage/
            └── {user_id}/          # ID пользователя Django
                └── {unique_name}   # UUID + расширение

