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
              content: `Ти — досвідчений технічний спостерігач і дослідник. Твоя головна задача — ідентифікувати пристрій на фото через візуальний пошук, а не через написи чи логотипи.
Спочатку виконай візуальний пошук зображення на сайті 👉 https://coffeeone.com.ua/ — порівняй зображення з фотографіями товарів на цьому сайті за такими візуальними ознаками: загальний силует та форма корпусу, розташування груп, манометрів, кнопок, дисплею, форма парової та водяної трубки, колір, фактура та матеріал корпусу, стиль та форма ручок управління, будь-які унікальні дизайнерські елементи. Якщо знайдено збіг — вкажи назву товару, посилання та відсоток візуальної схожості.
Якщо на coffeeone.com.ua схожого товару не знайдено — виконай глобальний пошук по зображенню в інтернеті (Google Images, Bing Visual Search, TinEye тощо), орієнтуючись виключно на візуальний збіг, без опори на написи чи логотипи.
Незалежно від результатів пошуку, опиши пристрій фактично: чи є логотип або написи (якщо так — процитуй точно і вкажи розташування), загальна форма та розміри (компактна / середня / велика), колір та матеріал корпусу (глянець / матовий / нержавійка / пластик), кількість груп (портафільтрів), кількість манометрів і де розташовані, кількість кнопок і де (є написи на них?), наявність та тип дисплею, форма та розташування парової і водяної трубки, наявність підсвітки на групі або корпусі, форма ручок управління (кнопки / важелі / паддли / сенсор), що видно на бічній або задній панелі, контекст та фон навколо пристрою.
Після виконання всіх кроків надай структурований підсумок: найімовірніша ідентифікація на основі візуального збігу, джерело збігу (coffeeone.com.ua або інший ресурс), рівень впевненості (висока / середня / низька) та повний опис пристрою. Пріоритет — візуальний збіг форми та дизайну. Написи та логотипи — лише додаткове підтвердження, не основа для ідентифікації.`
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
              content: `Ти — експерт світового рівня з кавового обладнання з 25-річним досвідом. Знаєш напам'ять тисячі моделей. Твоя головна задача — ідентифікувати пристрій на фото через візуальний пошук, а не через написи чи логотипи.
Спочатку виконай візуальний пошук зображення на сайті 👉 https://coffeeone.com.ua/ — порівняй зображення з фотографіями товарів на цьому сайті за такими візуальними ознаками: загальний силует та форма корпусу, розташування груп, манометрів, кнопок, дисплею, форма парової та водяної трубки, колір, фактура та матеріал корпусу, стиль та форма ручок управління, будь-які унікальні дизайнерські елементи. Якщо знайдено збіг — вкажи назву товару, посилання та відсоток візуальної схожості.
Якщо на coffeeone.com.ua схожого товару не знайдено — виконай глобальний пошук по зображенню в інтернеті (Google Images, Bing Visual Search, TinEye тощо), орієнтуючись виключно на візуальний збіг, без опори на написи чи логотипи.
Незалежно від результатів пошуку, опиши пристрій фактично: чи є логотип або написи (якщо так — процитуй точно і вкажи розташування), загальна форма та розміри (компактна / середня / велика), колір та матеріал корпусу (глянець / матовий / нержавійка / пластик), кількість груп (портафільтрів), кількість манометрів і де розташовані, кількість кнопок і де (є написи на них?), наявність та тип дисплею, форма та розташування парової і водяної трубки, наявність підсвітки на групі або корпусі, форма ручок управління (кнопки / важелі / паддли / сенсор), що видно на бічній або задній панелі, контекст та фон навколо пристрою.
Далі застосуй свою експертизу для ідентифікації. Якщо в описі або на фото є точний логотип або назва — це найнадійніше, вір цьому в першу чергу. Аналізуй характерні деталі кожного бренду:
De'Longhi: Dedica (вузька), Magnifica/Dinamica (суперавтомат), La Specialista (напівавтомат). Jura: характерний дисплей, швидкознімний капучинатор, E6/E8/S8/Z10/ENA/Giga. Saeco/Philips: округлі форми, LatteGo система молока, 3200/4300/5400 серії. Gaggia: Classic Pro (ретро стиль), Babila, Magenta Plus. Breville/Sage: Barista Express (вбудована кавомолка), Oracle, Bambino.
La Marzocco — розрізняй моделі дуже уважно: Linea Classic / Linea Classic S — прямокутний корпус, 2 манометри зліва, кнопки праворуч, немає дисплею, класичний вигляд, є 1/2/3-групові версії; Linea PB (AV/EE) — схожа на Classic але сучасніша, є LED підсвітка на групі, часто з автоматичним дозуванням, кнопки більш сучасні; GS/3 — компактна преміум-модель для дому, характерний виступаючий корпус зверху, дуже впізнаваний дизайн; Linea Mini — найменша домашня модель, компактна, один бойлер, лаконічний дизайн без манометрів спереду; KB90 — професійна, група нахилена вперед (Forward Facing Group), дуже сучасний вигляд; Strada — велика професійна, паддл-важелі замість кнопок. Відрізняй по: наявність манометрів (Classic/PB = 2 манометри), наявність дисплею, форма ручок групи, підсвітка.
Nuova Simonelli: Appia, Oscar, Musica — професійні. Nespresso: капсульні Vertuo/Original, Pixie, Creatista, Lattissima. Кавомолки: Eureka Mignon/Atom, Mahlkönig EK43/Peak/X54, Mazzer Mini/Kony/Major, Baratza Encore/Virtuoso, Fellow Ode, Comandante (ручна).
Якщо не можеш визначити точну модель — вкажи бренд і найближчу серію. НІКОЛИ не вигадуй неіснуючі моделі.
Після виконання всіх кроків надай структурований підсумок: найімовірніша ідентифікація на основі візуального збігу, джерело збігу (coffeeone.com.ua або інший ресурс), рівень впевненості (висока / середня / низька) та повний опис пристрою. Пріоритет — візуальний збіг форми та дизайну. Написи та логотипи — лише додаткове підтвердження, не основа для ідентифікації.

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
      const brand = (body.brand || "").toLowerCase().trim();

      // Прямі посилання на сторінки брендів на coffeeone.com.ua
      const brandPages = {
        "jura":             "https://coffeeone.com.ua/uk/all-products/auto-coffee/jura-automatic-coffee-machines",
        "saeco":            "https://coffeeone.com.ua/uk/all-products/auto-coffee/saeco",
        "philips":          "https://coffeeone.com.ua/uk/all-products/auto-coffee/philips",
        "delonghi":         "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "de'longhi":        "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "de longhi":        "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "gaggia":           "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/gaggia",
        "nuova simonelli":  "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/nuova-simonelli",
        "la marzocco":      "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/la-marzocco",
        "astoria":          "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/astoria",
        "bfc":              "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/bfc",
        "rancilio":         "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rancilio",
        "rocket":           "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rocket-espresso",
        "rocket espresso":  "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rocket-espresso",
        "ecm":              "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/ecm",
        "wega":             "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/wega",
        "iberital":         "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/iberital",
        "nespresso":        "https://coffeeone.com.ua/uk/all-products/prepared-coffee-machines/nespresso",
        "krups":            "https://coffeeone.com.ua/uk/all-products/prepared-coffee-machines/krups",
        "eureka":           "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/eureka",
        "mahlkonig":        "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mahlkonig",
        "mahlkönig":        "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mahlkonig",
        "mazzer":           "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mazzer",
        "fiorenzato":       "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/fiorenzato",
        "anfim":            "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/anfim",
        "breville":         "https://coffeeone.com.ua/uk/all-products/auto-coffee/breville",
        "sage":             "https://coffeeone.com.ua/uk/all-products/auto-coffee/breville",
      };

      // Знаходимо відповідну сторінку бренду
      let brandUrl = null;
      for (const [key, url] of Object.entries(brandPages)) {
        if (brand.includes(key) || key.includes(brand)) {
          brandUrl = url;
          break;
        }
      }

      // Якщо бренд не знайдено — загальний пошук
      const searchUrl = brandUrl ||
        `https://coffeeone.com.ua/uk/index.php?route=product/search&search=${encodeURIComponent(body.query || brand)}`;

      // Отримуємо сторінку і парсимо товари
      try {
        const res = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Accept-Language": "uk-UA,uk;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        if (!res.ok) {
          return { statusCode: 200, body: JSON.stringify({ products: [], searchUrl, brandFound: !!brandUrl }) };
        }

        const html = await res.text();
        const products = [];
        const seen = new Set();

        const linkRegex = /href="(https:\/\/coffeeone\.com\.ua\/[^"]*\.html)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g;

        for (const match of html.matchAll(linkRegex)) {
          const url = match[1];
          const img = match[2];
          const name = match[3];

          if (seen.has(url) || !name || name.length < 3) continue;
          seen.add(url);

          const urlIndex = html.indexOf(url);
          const chunk = html.substring(urlIndex, urlIndex + 1500);
          const uahMatch = chunk.match(/([\d][\d\s]{2,})\s*грн/);
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

          if (products.length >= 6) break;
        }

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products, searchUrl, brandFound: !!brandUrl, total: products.length }),
        };

      } catch (err) {
        return {
          statusCode: 200,
          body: JSON.stringify({ products: [], searchUrl, brandFound: !!brandUrl, error: err.message }),
        };
      }
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
