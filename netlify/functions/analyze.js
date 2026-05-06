exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const action = body.action || "analyze";

    // ── 1. Розпізнавання фото (двоетапне) ──────────────────────────────────
    if (action === "analyze") {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      };

      // ЕТАП 1 — детальний зоровий опис фото
      const step1 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          max_tokens: 600,
          messages: [
            {
              role: "system",
              content: `Ти — досвідчений технічний спостерігач. Твоя задача: детально описати що ти бачиш на фото.
Опиши:
- Чи є на корпусі логотип, напис, назва бренду або моделі? Якщо так — процитуй точно що написано
- Загальна форма та розміри пристрою
- Колір та матеріал корпусу
- Наявність та розташування: кнопок, дисплею, рукоятки, носика, бункера для зерен, парової трубки, групи
- Будь-які унікальні або характерні деталі
- Що знаходиться навколо пристрою (контекст)
Відповідай детально, фактично, без здогадок про бренд чи модель.`
            },
            { role: "user", content: body.content }
          ],
        }),
      });

      const step1Data = await step1.json();
      if (!step1.ok) {
        return { statusCode: step1.status, body: JSON.stringify({ error: step1Data.error?.message || "Step 1 error" }) };
      }
      const visualDescription = step1Data.choices[0].message.content;

      // ЕТАП 2 — ідентифікація на основі опису
      const step2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          max_tokens: 1000,
          messages: [
            {
              role: "system",
              content: `Ти — експерт світового рівня з кавового обладнання з 25-річним досвідом. Знаєш напам'ять тисячі моделей.

Тобі нададуть детальний зоровий опис пристрою. Визнач що це за обладнання.

ПРАВИЛА:
- Якщо в описі є точний логотип або назва — це найнадійніше, вір цьому в першу чергу
- Аналізуй характерні деталі кожного бренду
- De'Longhi: Dedica (вузька), Magnifica/Dinamica (суперавтомат), La Specialista (напівавтомат)
- Jura: характерний дисплей, швидкознімний капучинатор, E6/E8/S8/Z10/ENA/Giga
- Saeco/Philips: округлі форми, LatteGo система молока, 3200/4300/5400 серії
- Gaggia: Classic Pro (ретро стиль), Babila, Magenta Plus
- Breville/Sage: Barista Express (вбудована кавомолка), Oracle, Bambino
- La Marzocco: Linea Mini, GS3 — преміум з характерним подвійним бойлером
- Nuova Simonelli: Appia, Oscar, Musica — професійні
- Nespresso: капсульні Vertuo/Original, Pixie, Creatista, Lattissima
- Кавомолки — Eureka Mignon/Atom, Mahlkönig EK43/Peak/X54, Mazzer Mini/Kony/Major, Baratza Encore/Virtuoso, Fellow Ode, Comandante (ручна)
- Якщо не можеш визначити точну модель — вкажи бренд і найближчу серію
- НІКОЛИ не вигадуй неіснуючі моделі

Відповідай ТІЛЬКИ JSON без markdown:
{
  "is_coffee_equipment": true або false,
  "equipment_type": "тип обладнання",
  "brand": "бренд або 'Не визначено'",
  "model": "модель або серія або 'Не визначено'",
  "year_range": "рік або діапазон або null",
  "confidence": "висока / середня / низька",
  "description": "2-3 речення опису",
  "key_features": ["особливість 1", "особливість 2", "особливість 3", "особливість 4"],
  "price_range": "ціна USD або null",
  "coffee_types": ["напій 1", "напій 2"],
  "visual_clues": "що саме на фото допомогло визначити: логотип / форма / деталі",
  "search_brand": "лише назва бренду латиницею для пошуку в магазині або null"
}`
            },
            {
              role: "user",
              content: `Ось детальний зоровий опис пристрою з фото:\n\n${visualDescription}\n\nВизнач що це за кавове обладнання.`
            }
          ],
        }),
      });

      const step2Data = await step2.json();
      if (!step2.ok) {
        return { statusCode: step2.status, body: JSON.stringify({ error: step2Data.error?.message || "Step 2 error" }) };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: step2Data.choices[0].message.content }),
      };
    }

    // ── 2. Пошук на coffeeone.com.ua ────────────────────────────────────────
    if (action === "search") {
      const query = encodeURIComponent(body.query || "");
      const searchUrl = `https://coffeeone.com.ua/uk/index.php?route=product/search&search=${query}`;

      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept-Language": "uk-UA,uk;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        return { statusCode: 200, body: JSON.stringify({ products: [], searchUrl }) };
      }

      const html = await res.text();
      const products = [];

      // Парсимо посилання + зображення — всі результати пошуку
      const linkRegex = /href="(https:\/\/coffeeone\.com\.ua\/[^"]*\.html)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g;
      const seen = new Set();

      for (const match of html.matchAll(linkRegex)) {
        const url = match[1];
        const img = match[2];
        const name = match[3];

        if (seen.has(url) || !name || name.length < 3) continue;
        seen.add(url);

        const urlIndex = html.indexOf(url);
        const chunk = html.substring(urlIndex, urlIndex + 1500);

        // Шукаємо ціну в гривнях або євро
        const uahMatch = chunk.match(/([\d\s]{3,})\s*грн/);
        const eurMatch = chunk.match(/([\d]+)\s*€/);
        const price = uahMatch
          ? uahMatch[1].trim().replace(/\s+/g, " ") + " грн"
          : eurMatch ? eurMatch[1] + " €" : null;

        products.push({
          name: name.trim(),
          url,
          img: img.startsWith("http") ? img : "https://coffeeone.com.ua" + img,
          price,
        });

        // Показуємо до 6 результатів
        if (products.length >= 6) break;
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, searchUrl, total: products.length }),
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
