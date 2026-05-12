exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const action = body.action || "analyze";

    // ── 1. Розпізнавання фото (триетапне) ──────────────────────────────────
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
          max_tokens: 800,
          messages: [
            {
              role: "system",
              content: `Ти — надзвичайно уважний технічний спостерігач з гострим зором. Твоя єдина задача — описати все що бачиш на фото максимально точно і детально. Від якості твого опису залежить правильна ідентифікація пристрою.

ОБОВ'ЯЗКОВО опиши кожен з цих пунктів:

1. НАПИСИ ТА ЛОГОТИПИ: Уважно роздивись весь корпус. Чи є будь-які літери, слова, логотипи, цифри? Де саме (спереду зверху/знизу/по центру, збоку, на панелі)? Процитуй ТОЧНО кожну літеру — навіть якщо слово незрозуміле або частково видно. Це найважливіший пункт.

2. ФОРМА КОРПУСУ: Загальний силует — прямокутний / округлий / нестандартний. Розміри — компактна (домашня) / середня / велика (барна). Є чи немає виступів зверху, бічних панелей, декоративних елементів.

3. КОЛІР ТА МАТЕРІАЛ: Точний колір (не просто "сірий" а "темно-сірий матовий" або "дзеркальна нержавійка"). Матеріал — нержавійка / глянцевий пластик / матовий пластик / пофарбований метал.

4. ГРУПИ (ПОРТАФІЛЬТРИ): Скільки груп видно? Яка форма групової голівки? Є підсвітка навколо групи?

5. МАНОМЕТРИ: Скільки круглих циферблатів (манометрів)? Де розташовані — зліва / по центру / справа / над групою? Який діаметр приблизно?

6. ПАНЕЛЬ УПРАВЛІННЯ: Скільки кнопок і де? Є написи на кнопках? Є дисплей (LCD / OLED / світлодіодні індикатори / сенсорний)? Що показує дисплей якщо видно?

7. ПАРОВА ТРУБКА: Є? Яка форма — пряма / вигнута / з джойстиком? Розташування — зліва / справа / по центрі?

8. ВОДЯНА ТРУБКА: Є окрема трубка для гарячої води?

9. РУЧКИ УПРАВЛІННЯ: Кнопки / важелі / паддли (горизонтальні важелі) / поворотні регулятори / сенсор? Де розташовані?

10. ДОДАТКОВІ ДЕТАЛІ: Підсвітка — де і якого кольору? Що на бічних панелях? Що видно зверху (бойлер / решітка / кришка)?

11. КОНТЕКСТ: Де знаходиться пристрій — кав'ярня / дім / виставка? Що є поруч?

Відповідай українською, дуже детально і фактично. НЕ вгадуй і НЕ припускай бренд чи модель — тільки описуй що реально бачиш.`
            },
            { role: "user", content: body.content }
          ],
        }),
      });

      const step1Data = await step1.json();
      if (!step1.ok) {
        return {
          statusCode: step1.status,
          body: JSON.stringify({ error: step1Data.error?.message || "Step 1 error" }),
        };
      }
      const visualDescription = step1Data.choices[0].message.content;

      // ЕТАП 2 — ідентифікація на основі опису (внутрішня база знань)
      const step2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content: `Ти — експерт світового рівня з кавового обладнання з 30-річним досвідом. Ти особисто бачив, тестував і обслуговував тисячі машин. Знаєш напам'ять зовнішній вигляд кожної моделі.

Тобі нададуть детальний зоровий опис пристрою. Твоя задача — максимально точно визначити бренд і модель.

АЛГОРИТМ ІДЕНТИФІКАЦІЇ:
1. Якщо в описі є ТОЧНИЙ логотип або назва бренду/моделі — це абсолютний пріоритет
2. Якщо логотипу немає — аналізуй комбінацію унікальних візуальних ознак
3. Якщо не впевнений у моделі — краще вкажи правильний бренд і серію, ніж вигадай модель

БАЗА ЗНАНЬ:

=== ПРЕМІУМ ПРОФЕСІЙНІ ===

LA MARZOCCO:
• Linea Classic / Classic S: прямокутний корпус, 2 круглі манометри ЗЛІВА, кнопки праворуч від груп, немає дисплею, класичний індустріальний вигляд, 1/2/3-групові версії
• Linea PB / PB AV / PB EE: схожа на Classic, але LED підсвітка синього кольору навколо групи, кнопки більш сучасні та плоскі
• GS/3: КОМПАКТНА домашня, характерний виступаючий "горб" зверху корпусу
• Linea Mini: найменша, домашня, лаконічний дизайн, один бойлер
• KB90: Forward Facing Group — група нахилена ВПЕРЕД до баріста, сучасний геометричний вигляд
• Strada: великі горизонтальні ПАДДЛИ замість кнопок, масивна машина

NUOVA SIMONELLI / VICTORIA ARDUINO:
• Appia Life / Appia II: класична барна, прямокутна, кнопки на групі, 1-3 групи
• Aurelia Wave / Aurelia II: преміум, сенсорний дисплей на кожній групі
• Oscar II: домашня/напівпрофесійна, компактна, одна група
• Black Eagle / Maverick: флагманська преміум
• Victoria Arduino White Eagle / Black Eagle Gravitech: преміум дизайн з великим дисплеєм

SYNESSO: MVP Hydra / S-Series — американська, висока панель управління, кнопки/паддли
SLAYER: Single Group / Steam EP — американська преміум, паддли, деревʼяні вставки (горіх/бамбук)
KEES VAN DER WESTEN: Mirage / Spirit — нідерландська, авангардний дизайн, вигнуті форми, паддли
SANREMO: Cafe Racer (мотоциклетний стиль), Opera / You, F18 / X ONE
LELIT: Bianca (паддль + дерев'яні ручки), MaraX (термосифон)
ROCKET ESPRESSO: R9/R58 (манометри + мідні деталі), Appartamento (круглі отвори на боках)
ECM: Synchronika / Classika — нержавійка, манометр по центрі зверху
RANCILIO: Classe 5/7/9/11 (барні), Silvia (маленька домашня нержавійка)
ASTORIA / WEGA: класичні барні машини

=== МАСОВИЙ РИНОК ===
DE'LONGHI: Dedica (вузька 15см), La Specialista, Magnifica/Dinamica (суперавтомат)
JURA: E6/E8 (кольоровий дисплей по центру), S8, Z10, ENA
SAECO/PHILIPS: LatteGo система молока, 3200/4300/5400 серії
GAGGIA: Classic Pro (ретро, нержавійка)
BREVILLE/SAGE: Barista Express (кавомолка зверху), Oracle, Bambino
NESPRESSO: капсульна, компактна

=== КАВОМОЛКИ ===
Mahlkönig EK43 (великий 98мм бур, горизонтальний вихід), Peak/X54
Eureka Mignon (вузька, компактна), Atom (барна)
Mazzer Mini/Super Jolly/Kony/Major
Baratza Encore/Virtuoso, Fellow Ode (пласка мінімалістична)
Comandante/Kinu/1Zpresso (ручні, циліндричні)

ПРАВИЛА:
- НІКОЛИ не вигадуй неіснуючі моделі
- Якщо бренд відомий але модель непевна — вкажи серію
- Для рідкісних брендів — краще низька впевненість з правильним брендом

Відповідай ТІЛЬКИ JSON без markdown:
{
  "is_coffee_equipment": true або false,
  "equipment_type": "тип обладнання українською",
  "brand": "бренд або 'Не визначено'",
  "model": "модель або серія або 'Не визначено'",
  "year_range": "рік або діапазон або null",
  "confidence": "висока / середня / низька",
  "description": "2-3 речення опису",
  "key_features": ["особливість 1", "особливість 2", "особливість 3", "особливість 4"],
  "price_range": "орієнтовна ціна USD або null",
  "coffee_types": ["напій 1", "напій 2"],
  "visual_clues": "що саме допомогло визначити: логотип / форма / деталі",
  "search_brand": "назва бренду латиницею для пошуку або null",
  "search_query": "точний пошуковий запит англійською для уточнення моделі, наприклад 'La Marzocco Linea Classic 2 group espresso machine' або null якщо впевненість висока і бренд відомий"
}`
            },
            {
              role: "user",
              content: `Ось детальний зоровий опис пристрою з фото:\n\n${visualDescription}\n\nВизнач що це за кавове обладнання. Відповідай ТІЛЬКИ JSON.`
            }
          ],
        }),
      });

      const step2Data = await step2.json();
      if (!step2.ok) {
        return {
          statusCode: step2.status,
          body: JSON.stringify({ error: step2Data.error?.message || "Step 2 error" }),
        };
      }

      let identification = null;
      try {
        identification = JSON.parse(step2Data.choices[0].message.content.replace(/```json|```/g, "").trim());
      } catch {
        identification = null;
      }

      // Якщо не кавове обладнання — одразу повертаємо результат
      if (!identification || !identification.is_coffee_equipment) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: step2Data.choices[0].message.content }),
        };
      }

      // ЕТАП 3 — веб-пошук для уточнення (тільки якщо є що шукати)
      const needsWebSearch =
        identification.search_query &&
        (identification.confidence === "низька" || identification.confidence === "середня" || identification.model === "Не визначено");

      if (needsWebSearch) {
        try {
          const step3 = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: "gpt-4o-search-preview",
              web_search_options: {},
              messages: [
                {
                  role: "system",
                  content: `Ти — експерт з кавового обладнання. Твоя задача — знайти в інтернеті точну інформацію про пристрій за пошуковим запитом.

Шукай інформацію про: точну назву моделі, технічні характеристики, рік випуску, орієнтовну ціну.

ВАЖЛИВО: Ти можеш шукати будь-де в інтернеті для збору інформації про пристрій. Але у своїй відповіді НЕ згадуй жодних інтернет-магазинів, сайтів для покупки, цін з конкретних магазинів. Тільки технічна інформація про модель.

Відповідай ТІЛЬКИ JSON без markdown:
{
  "confirmed_brand": "підтверджений бренд або null",
  "confirmed_model": "підтверджена точна модель або null",
  "confirmed_year": "рік або діапазон або null",
  "confirmed_price_usd": "орієнтовна ціна USD (загальна ринкова, не з конкретного магазину) або null",
  "additional_features": ["додаткова характеристика 1", "додаткова характеристика 2"],
  "confidence_boost": "висока / середня / низька",
  "notes": "коротка нотатка що вдалось підтвердити або null"
}`
                },
                {
                  role: "user",
                  content: `Знайди інформацію про: ${identification.search_query}`
                }
              ],
            }),
          });

          const step3Data = await step3.json();

          if (step3.ok && step3Data.choices?.[0]?.message?.content) {
            try {
              const webInfo = JSON.parse(step3Data.choices[0].message.content.replace(/```json|```/g, "").trim());

              // Збагачуємо результат даними з веб-пошуку
              if (webInfo.confirmed_brand && webInfo.confirmed_brand !== "null") {
                identification.brand = webInfo.confirmed_brand;
              }
              if (webInfo.confirmed_model && webInfo.confirmed_model !== "null") {
                identification.model = webInfo.confirmed_model;
              }
              if (webInfo.confirmed_year && webInfo.confirmed_year !== "null") {
                identification.year_range = webInfo.confirmed_year;
              }
              if (webInfo.confirmed_price_usd && webInfo.confirmed_price_usd !== "null") {
                identification.price_range = webInfo.confirmed_price_usd;
              }
              if (webInfo.confidence_boost) {
                identification.confidence = webInfo.confidence_boost;
              }
              if (webInfo.additional_features?.length) {
                identification.key_features = [
                  ...(identification.key_features || []),
                  ...webInfo.additional_features,
                ].slice(0, 6);
              }
            } catch {
              // Якщо парсинг не вдався — продовжуємо з результатом етапу 2
            }
          }
        } catch {
          // Якщо веб-пошук не вдався — продовжуємо з результатом етапу 2
        }
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: JSON.stringify(identification) }),
      };
    }

    // ── 2. Пошук на coffeeone.com.ua ────────────────────────────────────────
    if (action === "search") {
      const brand = (body.brand || "").toLowerCase().trim();

      const brandPages = {
        "jura":             "https://coffeeone.com.ua/uk/all-products/auto-coffee/jura-automatic-coffee-machines",
        "saeco":            "https://coffeeone.com.ua/uk/all-products/auto-coffee/saeco",
        "philips":          "https://coffeeone.com.ua/uk/all-products/auto-coffee/philips",
        "delonghi":         "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "de'longhi":        "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "de longhi":        "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "gaggia":           "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/gaggia",
        "nuova simonelli":  "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/nuova-simonelli",
        "victoria arduino": "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/nuova-simonelli",
        "la marzocco":      "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/la-marzocco",
        "astoria":          "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/astoria",
        "bfc":              "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/bfc",
        "rancilio":         "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rancilio",
        "rocket":           "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rocket-espresso",
        "rocket espresso":  "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rocket-espresso",
        "ecm":              "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/ecm",
        "wega":             "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/wega",
        "iberital":         "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/iberital",
        "sanremo":          "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/sanremo",
        "lelit":            "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/lelit",
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

      let brandUrl = null;
      for (const [key, url] of Object.entries(brandPages)) {
        if (brand.includes(key) || key.includes(brand)) {
          brandUrl = url;
          break;
        }
      }

      const searchUrl = brandUrl ||
        `https://coffeeone.com.ua/uk/index.php?route=product/search&search=${encodeURIComponent(body.query || brand)}`;

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
