# 🚀 Деплой на Netlify — покрокова інструкція

Netlify дозволяє зберігати API ключ **на сервері** — користувачі його ніколи не побачать.

---

## Крок 1 — Завантажте файли на GitHub

Якщо ще не зробили — залийте всі файли в репозиторій на GitHub (див. SETUP.md).

Структура має виглядати так:
```
coffee-scanner/
├── index.html
├── netlify.toml
├── netlify/
│   └── functions/
│       └── analyze.js
├── README.md
└── ...
```

---

## Крок 2 — Зареєструйтесь на Netlify

1. Перейдіть на [netlify.com](https://netlify.com)
2. Натисніть **"Sign up"** → **"Sign up with GitHub"**
3. Дозвольте доступ до вашого GitHub акаунту

---

## Крок 3 — Підключіть репозиторій

1. На головній сторінці Netlify натисніть **"Add new site"** → **"Import an existing project"**
2. Виберіть **"Deploy with GitHub"**
3. Знайдіть репозиторій `coffee-scanner` і натисніть на нього
4. Налаштування залиште за замовчуванням (Netlify сам знайде `netlify.toml`)
5. Натисніть **"Deploy site"**

---

## Крок 4 — Додайте API ключ (найважливіший крок!)

1. У Netlify перейдіть до вашого сайту
2. Натисніть **"Site configuration"** (або **"Site settings"**)
3. В лівому меню виберіть **"Environment variables"**
4. Натисніть **"Add a variable"**
5. Заповніть:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** ваш новий OpenAI ключ (отримайте на platform.openai.com/api-keys)
6. Натисніть **"Save"**

---

## Крок 5 — Передеплойте сайт

Після додавання змінної потрібно перезапустити деплой:

1. Перейдіть в **"Deploys"**
2. Натисніть **"Trigger deploy"** → **"Deploy site"**
3. Зачекайте ~1 хвилину

---

## ✅ Готово!

Ваш сайт буде доступний за адресою типу:
```
https://coffee-scanner-xxxxx.netlify.app
```

Або можете налаштувати власний домен у **"Domain management"**.

---

## 🔒 Чому це безпечно?

```
Користувач → index.html (публічний)
                  ↓ запит без ключа
            /.netlify/functions/analyze
                  ↓ ключ додається тут, на сервері
            OpenAI API
                  ↓ результат
            Користувач бачить відповідь
```

Ключ ніколи не потрапляє до браузера користувача.

---

## 🆘 Проблеми?

**Function not found (404)?**
→ Перевірте що файл знаходиться в `netlify/functions/analyze.js`
→ Перевірте `netlify.toml` — там має бути `functions = "netlify/functions"`

**Error 500 від функції?**
→ Перевірте що змінна `OPENAI_API_KEY` додана правильно
→ Перевірте що ключ активний на platform.openai.com

**CORS помилка?**
→ Це не повинно виникати, бо запит йде до власного Netlify домену
