# ☕ Coffee Scanner

> ШІ-сканер кавового обладнання — визначає модель, бренд та характеристики за фото

![Coffee Scanner](https://img.shields.io/badge/AI-Claude%20Vision-c9a96e?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-blue?style=flat-square)

---

## 🎯 Що це?

**Coffee Scanner** — веб-застосунок, який за фото розпізнає кавове обладнання:

- ☕ Кавомашини (еспресо, автоматичні, капсульні)
- ⚙️ Кавомолки
- 🫖 Пуровери, аеропреси, кемекси, моки, турки
- 📋 Повертає: бренд, модель, характеристики, цінову категорію

Працює прямо в браузері — без сервера, без реєстрації.

---

## 🚀 Швидкий старт

### 1. Клонуйте репозиторій

```bash
git clone https://github.com/YOUR_USERNAME/coffee-scanner.git
cd coffee-scanner
```

### 2. Відкрийте `index.html`

Просто відкрийте файл у браузері — або запустіть локальний сервер:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

### 3. Отримайте API ключ

Зареєструйтесь на [console.anthropic.com](https://console.anthropic.com) та отримайте безкоштовний API ключ.

### 4. Вставте ключ у поле та скануйте!

---

## 🌐 Деплой на GitHub Pages (безкоштовно)

1. Зробіть fork або завантажте репозиторій до свого GitHub
2. Перейдіть в **Settings → Pages**
3. Виберіть `Deploy from a branch` → `main` → `/ (root)`
4. Натисніть **Save**

Через ~2 хвилини сайт буде доступний за адресою:
```
https://YOUR_USERNAME.github.io/coffee-scanner/
```

---

## 🔧 Структура проєкту

```
coffee-scanner/
├── index.html          # Весь застосунок (HTML + CSS + JS)
├── README.md           # Документація
├── LICENSE             # MIT ліцензія
└── docs/
    └── screenshot.png  # Скріншот для README
```

---

## 🤖 Як це працює

```
Фото користувача
      ↓
Конвертація в base64
      ↓
Anthropic Claude Vision API
(claude-opus-4-5)
      ↓
JSON відповідь з даними
      ↓
Красивий результат на екрані
```

Claude аналізує зображення і повертає структурований JSON:

```json
{
  "is_coffee_equipment": true,
  "equipment_type": "кавомашина еспресо",
  "brand": "De'Longhi",
  "model": "Dedica EC685",
  "confidence": "висока",
  "description": "Компактна рожкова кавомашина...",
  "key_features": ["15 бар тиск", "Ручний капучинатор"],
  "price_range": "$200–$300",
  "coffee_types": ["еспресо", "капучино", "лате"]
}
```

---

## 🔑 Безпека API ключа

> ⚠️ **Важливо**: API ключ вводиться у браузері і зберігається лише в `sessionStorage` (тільки на час сесії). Він **не зберігається** на сервері і нікуди не надсилається крім API Anthropic.

Для продакшн-застосунку рекомендується зробити бекенд-проксі, який приховує ключ від користувачів.

---

## 🛠 Кастомізація

### Змінити модель ШІ

У `index.html` знайдіть і замініть:

```javascript
model: 'claude-opus-4-5',  // або claude-sonnet-4-5
```

### Розширити розпізнавання

Відредагуйте промпт у функції `analyzeImage()` — додайте нові типи обладнання або поля для відповіді.

### Змінити мову інтерфейсу

Всі тексти знаходяться прямо в HTML — замініть на будь-яку мову.

---

## 📦 Технології

| Технологія | Використання |
|-----------|-------------|
| Vanilla HTML/CSS/JS | Весь фронтенд — без фреймворків |
| Claude Vision API | Розпізнавання зображень |
| Web Camera API | Фото з камери пристрою |
| FileReader API | Завантаження файлів |
| Google Fonts | Playfair Display + DM Sans |

---

## 🗺 Roadmap

- [ ] Збереження історії сканувань
- [ ] Порівняння двох пристроїв
- [ ] Посилання на купівлю обладнання
- [ ] PWA (робота офлайн)
- [ ] Бекенд-проксі для приховування API ключа
- [ ] Підтримка відео-потоку в реальному часі

---

## 🤝 Внесок у проєкт

Pull requests вітаються! Для великих змін спочатку відкрийте Issue.

```bash
git checkout -b feature/my-feature
git commit -m 'Add: my feature'
git push origin feature/my-feature
```

---

## 📄 Ліцензія

MIT © 2025 — використовуйте вільно для будь-яких цілей.

---

<div align="center">
Зроблено з ☕ та 🤖
</div>
