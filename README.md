# ☁️ My-Cloud — Облачное хранилище файлов

Полнофункциональное веб-приложение для облачного хранения файлов с административной панелью, сессионной аутентификацией и возможностью публичного доступа к файлам через обезличенные ссылки.

Проект разработан в рамках дипломной работы. Реализует функционал, аналогичный Google Drive, Яндекс.Диску и Dropbox.

![Python](https://img.shields.io/badge/Python-3.14-blue)
![Django](https://img.shields.io/badge/Django-5.2.2-green)
![React](https://img.shields.io/badge/React-19-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## 📋 Содержание

- [Возможности](#-возможности)
- [Стек технологий](#-стек-технологий)
- [Структура проекта](#-структура-проекта)
- [Требования к системе](#-требования-к-системе)
- [Установка и запуск](#-установка-и-запуск)
- [Первый вход в систему](#-первый-вход-в-систему)
- [Использование](#-использование)
- [API Endpoints](#-api-endpoints)
- [Решение частых проблем](#-решение-частых-проблем)

## ✨ Возможности

### Для обычных пользователей:
- 📝 Регистрация и вход в систему
- 📁 Загрузка файлов с комментариями
- 👁️ Предпросмотр файлов (изображения, видео, аудио, PDF, текст)
- ⬇️ Скачивание файлов с сохранением оригинального имени
- ✏️ Редактирование (переименование, изменение комментариев)
- 🗑️ Удаление файлов
- 🔗 Генерация публичных обезличенных ссылок для скачивания

### Для администраторов:
- 👥 Просмотр списка всех пользователей
- 🛡️ Назначение/снятие прав администратора
- 🗑️ Удаление пользователей
- 📂 Просмотр хранилищ любых пользователей
- 📊 Статистика по пользователям и объёму хранилищ

## 🛠 Стек технологий

### Backend:
- **Python 3.14**
- **Django 5.2.2** — веб-фреймворк
- **Django REST Framework** — API
- **PostgreSQL 16** — СУБД
- **psycopg2-binary** — драйвер PostgreSQL
- **django-cors-headers** — CORS
- **python-decouple** — управление настройками через `.env`

### Frontend:
- **React 19** — UI библиотека
- **Vite** — сборщик
- **React Router** — маршрутизация
- **Axios** — HTTP-клиент
- **Context API** — управление состоянием

## 📁 Структура проекта

```
My-Cloud/
├── backend_My_Cloud/          # Серверная часть
│   ├── backend_My_Cloud/      # Настройки Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── api/                   # Приложение API
│   │   ├── models.py          # Модели БД
│   │   ├── views.py           # API endpoints
│   │   ├── serializers.py     # Сериализаторы
│   │   ├── urls.py            # Маршруты API
│   │   └── admin.py           # Админка Django
│   ├── media/                 # Файловое хранилище
│   │   └── storage/
│   ├── venv/                  # Виртуальное окружение
│   ├── .env                   # Переменные окружения
│   ├── manage.py
│   └── requirements.txt
│
├── frontend_My_Cloud/         # Клиентская часть
│   ├── src/
│   │   ├── api/               # API-запросы
│   │   ├── components/        # Компоненты React
│   │   ├── context/           # Контексты (AuthContext)
│   │   ├── pages/             # Страницы приложения
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 💻 Требования к системе

- **macOS** (или другая Unix-подобная ОС)
- **Python 3.12+**
- **Node.js 18+** и **Yarn**
- **PostgreSQL 14+**
- **Homebrew** (для установки PostgreSQL)

## 🚀 Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <url-вашего-репозитория>
cd My-Cloud
```

### 2. Установка PostgreSQL (если ещё не установлен)

```bash
# Установка через Homebrew
brew install postgresql@16

# Запуск сервиса
brew services start postgresql@16

# Проверка
psql --version
```

### 3. Создание базы данных

```bash
# Подключение к PostgreSQL
psql postgres

# В консоли PostgreSQL выполните:
CREATE USER vadim WITH PASSWORD 'vadim';
CREATE DATABASE my_cloud_db OWNER vadim;
GRANT ALL PRIVILEGES ON DATABASE my_cloud_db TO vadim;
\q
```

> 💡 **Замените `vadim` на ваше имя пользователя и пароль.**

### 4. Настройка бэкенда

```bash
cd backend_My_Cloud

# Создание виртуального окружения
python3 -m venv venv

# Активация окружения
source venv/bin/activate

# Установка зависимостей
pip install django djangorestframework psycopg2-binary django-cors-headers python-decouple

# Или через requirements.txt (если есть):
# pip install -r requirements.txt
```

#### Создание файла `.env`

Создайте файл `backend_My_Cloud/.env`:

```env
DEBUG=True

SECRET_KEY=ваш-секретный-ключ-тут

ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=my_cloud_db
DB_USER=vadim
DB_PASSWORD=vadim
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
```

> 💡 **Для генерации SECRET_KEY выполните:**
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

#### Применение миграций

```bash
python manage.py makemigrations api
python manage.py migrate
```

#### Создание суперпользователя

```bash
python manage.py createsuperuser
```

### 5. Настройка фронтенда

```bash
cd ../frontend_My_Cloud

# Установка зависимостей
yarn install
```

### 6. Запуск приложения

Откройте **два терминала**:

**Терминал 1 — Бэкенд:**
```bash
cd backend_My_Cloud
source venv/bin/activate
python manage.py runserver
```
Сервер будет доступен на `http://localhost:8000`

**Терминал 2 — Фронтенд:**
```bash
cd frontend_My_Cloud
yarn dev
```
Приложение будет доступно на `http://localhost:5173`

## 🔑 Первый вход в систему

После создания суперпользователя через `createsuperuser`, ему нужно назначить права администратора в нашей модели `CloudUser`:

```bash
cd backend_My_Cloud
source venv/bin/activate
python manage.py shell
```

В открывшейся консоли выполните:

```python
from api.models import CloudUser
from django.contrib.auth.models import User

# Получаем пользователя
user = User.objects.get(username='ваш_логин')

# Создаём профиль, если его нет
cloud_user, created = CloudUser.objects.get_or_create(
    user=user,
    defaults={
        'fullname': 'Ваше Полное Имя',
        'nickname': 'admin',
        'email': user.email,
        'is_admin': True,
        'storage_path': f'storage/user_{user.id}/'
    }
)

# Если профиль уже был создан — назначаем админа
if not created:
    cloud_user.is_admin = True
    cloud_user.save()

print(f'Пользователь {user.username} теперь администратор!')
exit()
```

Теперь можно войти в систему:
1. Откройте `http://localhost:5173`
2. Нажмите "Вход"
3. Введите логин и пароль суперпользователя
4. Вы будете перенаправлены в админ-панель

## 📖 Использование

### Регистрация нового пользователя
1. На главной странице нажмите "Зарегистрироваться"
2. Заполните форму:
   - **Логин**: 4-20 символов, начинается с буквы, только латиница и цифры
   - **Полное имя**: минимум 2 символа
   - **Email**: валидный формат email
   - **Пароль**: минимум 6 символов, 1 заглавная буква, 1 цифра, 1 спецсимвол (@$!%*?&)

### Работа с файлами
- **Загрузка**: выберите файл и добавьте комментарий (необязательно)
- **Предпросмотр**: нажмите 👁️ для просмотра изображений, видео, аудио, PDF и текстовых файлов
- **Скачивание**: нажмите ⬇️ для скачивания с оригинальным именем
- **Редактирование**: нажмите ✏️ для изменения имени или комментария
- **Публичная ссылка**: нажмите 🔗 для получения обезличенной ссылки
- **Удаление**: нажмите 🗑️ для удаления файла

### Администрирование
- Перейдите в раздел "Админка" в навигации
- В карточках пользователей можно:
  - Просмотреть статистику (количество файлов, размер)
  - Перейти в хранилище пользователя
  - Назначить/снять права администратора
  - Удалить пользователя

## 🔌 API Endpoints

### Аутентификация
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register/` | Регистрация |
| POST | `/api/auth/login/` | Вход |
| POST | `/api/auth/logout/` | Выход |
| GET | `/api/auth/me/` | Текущий пользователь |
| GET | `/api/auth/csrf-token/` | Получить CSRF-токен |

### Администрирование
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/admin/users/` | Список пользователей |
| DELETE | `/api/admin/users/<id>/delete/` | Удалить пользователя |
| PATCH | `/api/admin/users/<id>/toggle-admin/` | Изменить права |

### Файловое хранилище
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/files/` | Список файлов |
| GET | `/api/files/?user_id=<id>` | Файлы пользователя (для админа) |
| POST | `/api/files/upload/` | Загрузить файл |
| DELETE | `/api/files/<id>/` | Удалить файл |
| PATCH | `/api/files/<id>/` | Редактировать файл |
| GET | `/api/files/<id>/download/` | Скачать файл |
| GET | `/api/files/<id>/preview/` | Предпросмотр |
| POST | `/api/files/<id>/share/` | Получить публичную ссылку |
| GET | `/api/shared/<token>/` | Скачать по публичной ссылке |

## 🐛 Решение частых проблем

### Ошибка CORS: "Cannot use wildcard in Access-Control-Allow-Origin"
**Решение**: Убедитесь, что в `.env` файле нет лишней запятой в конце `CORS_ALLOWED_ORIGINS` и установлено `CORS_ALLOW_CREDENTIALS = True` в `settings.py`.

### Ошибка CSRF: "CSRF token missing"
**Решение**: Убедитесь, что фронтенд получает CSRF-токен перед POST-запросами. В `axios.js` настроен interceptor, который автоматически добавляет токен.

### Safari добавляет пустые страницы при печати
**Решение**: Используйте `height: 297mm` вместо `min-height` в CSS и уберите дублирование `break-after` + `page-break-after`.

### PostgreSQL не запускается
**Решение**:
```bash
brew services list           # Проверить статус
brew services restart postgresql@16  # Перезапустить
```

### Ошибка "relation does not exist"
**Решение**: Примените миграции:
```bash
python manage.py migrate
```

### Порт 8000 или 5173 занят
**Решение**: Запустите на другом порту:
```bash
# Бэкенд
python manage.py runserver 8001

# Фронтенд
yarn dev --port 3001
```
Не забудьте обновить `baseURL` в `src/api/axios.js` и `CORS_ALLOWED_ORIGINS` в `.env`.

## 📝 Лицензия

Учебный проект, разработан в рамках дипломной работы.

## 👨‍💻 Автор

**Вадим Гущин**  


---

**Приятной работы с My-Cloud! ☁️🚀**