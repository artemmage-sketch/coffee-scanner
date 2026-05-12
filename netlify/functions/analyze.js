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
              content: `Ти — надзвичайно уважний технічний спостерігач з гострим зором. Твоя єдина задача — описати все що бачиш на фото максимально точно і детально.

НАЙВАЖЛИВІШЕ — НАПИСИ ТА ЛОГОТИПИ:
Уважно роздивись ВЕСЬ корпус пристрою. Чи є будь-які літери, слова, логотипи, цифри, символи? Де саме (спереду зверху/знизу/по центру, збоку, на панелі, на ручці)? Процитуй ТОЧНО кожну літеру і кожне слово — навіть якщо слово незрозуміле, частково видно або це незнайомий бренд. Не пропускай жодного напису. Це найважливіший пункт — від нього залежить правильна ідентифікація.

ТАКОЖ ОПИШИ:
2. ФОРМА КОРПУСУ: Загальний силует — прямокутний / округлий / нестандартний. Розміри — компактна (домашня) / середня / велика (барна). Виступи зверху, бічні панелі, декоративні елементи.
3. КОЛІР ТА МАТЕРІАЛ: Точний колір і матеріал — нержавійка / глянцевий пластик / матовий пластик / пофарбований метал / лакований.
4. ГРУПИ (ПОРТАФІЛЬТРИ): Скільки груп? Яка форма голівки? Є підсвітка?
5. МАНОМЕТРИ: Скільки? Де розташовані?
6. ПАНЕЛЬ УПРАВЛІННЯ: Кількість і розташування кнопок, наявність дисплею (тип, що показує).
7. ПАРОВА ТА ВОДЯНА ТРУБКА: Є? Форма, розташування.
8. РУЧКИ УПРАВЛІННЯ: Кнопки / важелі / паддли / поворотні / сенсор?
9. ДОДАТКОВІ ДЕТАЛІ: Підсвітка, бічні панелі, що видно зверху.
10. КОНТЕКСТ: Де знаходиться пристрій, що є поруч.

Відповідай українською, дуже детально і фактично. НЕ вгадуй бренд чи модель — тільки описуй що реально бачиш.`
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

      // ЕТАП 2 — ідентифікація на основі опису
      const step2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content: `Ти — експерт світового рівня з кавового обладнання з 30-річним досвідом. Знаєш напам'ять тисячі моделей з усього світу.

Тобі нададуть детальний зоровий опис пристрою. Визнач бренд і модель.

АЛГОРИТМ ІДЕНТИФІКАЦІЇ — ДОТРИМУЙСЯ СУВОРО:

КРОК 1 — ЛОГОТИП (найвищий пріоритет):
Якщо в описі згадується будь-який напис або логотип на корпусі пристрою — це АБСОЛЮТНИЙ пріоритет.
- Використовуй САМЕ ЦЕЙ текст як назву бренду, дослівно
- НІКОЛИ не заміняй прочитаний напис іншим брендом зі своєї бази
- Якщо бренд тобі невідомий або незнайомий — це нормально. Просто вкажи його як є
- Новий, регіональний, нішевий або маловідомий бренд — все одно вказуй дослівно
- Якщо модель на логотипі теж написана — вкажи її

КРОК 2 — ЯКЩО ЛОГОТИПУ НЕМАЄ:
Аналізуй комбінацію візуальних ознак з бази знань нижче.

КРОК 3 — НЕВПЕВНЕНІСТЬ:
Якщо не можеш визначити модель — вкажи правильний бренд і "Не визначено" для моделі.
НІКОЛИ не вигадуй неіснуючі моделі.

БАЗА ЗНАНЬ:

=== ПРЕМІУМ ПРОФЕСІЙНІ ===

LA MARZOCCO:
• Linea Classic / Classic S: прямокутний корпус, 2 круглі манометри ЗЛІВА, кнопки праворуч від груп, немає дисплею, класичний індустріальний вигляд, 1/2/3-групові версії
• Linea PB / PB AV / PB EE: схожа на Classic, але LED підсвітка синього кольору навколо групи, кнопки більш сучасні та плоскі
• GS/3: КОМПАКТНА домашня, характерний виступаючий "горб" зверху корпусу
• Linea Mini: найменша, домашня, лаконічний дизайн, один бойлер
• KB90: Forward Facing Group — група нахилена ВПЕРЕД до баріста, сучасний геометричний вигляд
• Strada: великі горизонтальні ПАДДЛИ замість кнопок, масивна машина

NUOVA SIMONELLI / VICTORIA ARDUINO (один виробник):
• Appia Life / Appia II: класична барна, прямокутна, кнопки на групі, 1-3 групи
• Aurelia Wave / Aurelia II: преміум, сенсорний дисплей на кожній групі
• Oscar II: домашня/напівпрофесійна, компактна, одна група
• Black Eagle / Maverick: флагманська преміум
• Victoria Arduino White Eagle / Black Eagle Gravitech / Adonis: преміум з великим дисплеєм
• Mythos: кавомолка, висока та вузька

SYNESSO: MVP / MVP Hydra / S-Series — американська, висока панель управління, кнопки/паддли
SLAYER: Single Group / Steam EP — американська преміум, паддли, деревʼяні вставки (горіх/бамбук)
KEES VAN DER WESTEN: Mirage / Spirit — нідерландська, авангардний дизайн, вигнуті форми, паддли
KASTOR: український бренд, професійні барні еспресо-машини
ASTORIA: Storm / Tanya / Plus4You / Gloria / Core / Lisa — барні машини різних серій
SANREMO: Cafe Racer, Opera / You, F18 / X ONE, Torino
LELIT: Bianca (паддль + дерев'яні ручки), MaraX (термосифон), Elizabeth, Victoria
ROCKET ESPRESSO: R9/R58 (манометри + мідні деталі), Appartamento (круглі отвори на боках), Boxer
ECM: Synchronika / Classika / Technika — нержавійка, манометр по центрі зверху
RANCILIO: Classe 5/7/9/11 (барні), Silvia (маленька домашня нержавійка)
WEGA: Polaris / Orion / Concept / Pegaso — барні, заокруглена верхня панель
BFC: De Lux / Antelao / Classica — італійські барні машини
IBERITAL: Expression / L'Anna / MC2 — іспанські барні машини
FIAMMA: Caravel / Lambro — класичні італійські барні машини
BRUGNETTI: Alexia / Giulia — нішеві італійські машини
AURORA: барні машини
BEZZERA: Matrix / BZ / Magica / Mitica — італійські барні/домашні машини
MACAP: кавомолки різних серій

=== СУПЕРАВТОМАТИ PROFESSIONAL ===
DR. COFFEE: F11 / F16 / Coffee Center CCM — сучасні суперавтомати з великими дисплеями
RHEAVENDORS: rhea BL / rhTT — вендингові суперавтомати
TALIA: барні суперавтомати

=== МАСОВИЙ РИНОК ===
DE'LONGHI: Dedica (вузька 15см), La Specialista, Magnifica/Dinamica (суперавтомат)
JURA: E6/E8 (кольоровий дисплей по центру), S8, Z10, ENA — швидкознімний капучинатор
SAECO/PHILIPS: LatteGo система молока, 3200/4300/5400 серії
GAGGIA: Classic Pro (ретро, нержавійка), Babila, Magenta
BREVILLE/SAGE: Barista Express (кавомолка зверху), Oracle, Bambino
NESPRESSO: капсульна, компактна, відсік для капсул
KRUPS: суперавтомати та напівавтомати

=== КАВОМОЛКИ ===
MAHLKÖNIG / MAHLKOENIG: EK43 (великий 98мм бур, горизонтальний вихід), Peak, X54, Guatemala
EUREKA: Mignon Silenzio/Specialita/Oro (вузька компактна), Atom (барна)
MAZZER: Mini / Super Jolly / Kony / Major — класичні форми
ANFIM: CODY / SP II — барні кавомолки
FIORENZATO: F64 / F83 / AllGround — сучасні кавомолки
OTTO FLORENCE: Dante — преміум кавомолки
ACAIA: ваги для кави (Lunar / Pearl / Pyxis)
MACAP: M2 / M4 / M7 — барні кавомолки
BARATZA: Encore / Virtuoso — домашні пластиковий корпус
FELLOW ODE: дуже мінімалістична, пласка, домашня
COMANDANTE / KINU / 1ZPRESSO: ручні, циліндрична форма

=== ОБЛАДНАННЯ ДЛЯ МОРОЗИВА ===
TAYLOR: фризери для м'якого морозива та мілкшейків

=== АКСЕСУАРИ ===
ACAIA: ваги (Lunar, Pearl, Pyxis — круглі або прямокутні з дисплеєм)
BARISTA SPACE / BARISTA BASICS: темпери, дистрибʼютори, аксесуари
BEAUMONT: молочники, аксесуари
BRAVILOR BONAMAT: фільтрові кавоварки, термоси
AGE: обладнання для кав'ярень
LIBERTY'S: аксесуари
REMIDAG: обладнання
MAKITA: інструменти (не кавове обладнання)

Відповідай ТІЛЬКИ JSON без markdown:
{
  "is_coffee_equipment": true або false,
  "equipment_type": "тип обладнання українською",
  "brand": "бренд ДОСЛІВНО як написано на логотипі, або визначений по вигляду, або 'Не визначено'",
  "model": "модель або серія або 'Не визначено'",
  "year_range": "рік або діапазон або null",
  "confidence": "висока / середня / низька",
  "description": "2-3 речення опису",
  "key_features": ["особливість 1", "особливість 2", "особливість 3", "особливість 4"],
  "price_range": "орієнтовна ціна USD або null",
  "coffee_types": ["напій 1", "напій 2"],
  "visual_clues": "що саме допомогло визначити: який конкретний напис прочитано / які форми",
  "search_brand": "назва бренду латиницею для пошуку або null",
  "search_query": "пошуковий запит англійською для уточнення, наприклад 'Kastor espresso machine professional 2gr' або null якщо впевненість висока"
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

      if (!identification || !identification.is_coffee_equipment) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: step2Data.choices[0].message.content }),
        };
      }

      // ЕТАП 3 — веб-пошук для уточнення
      const needsWebSearch =
        identification.search_query &&
        (identification.confidence === "низька" ||
          identification.confidence === "середня" ||
          identification.model === "Не визначено");

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
                  content: `Ти — експерт з кавового обладнання. Знайди в інтернеті точну інформацію про пристрій.
Шукай: точну назву моделі, технічні характеристики, рік випуску, орієнтовну ціну.
У відповіді НЕ згадуй жодних інтернет-магазинів чи сайтів для покупки. Тільки технічна інформація.
Відповідай ТІЛЬКИ JSON без markdown:
{
  "confirmed_brand": "підтверджений бренд або null",
  "confirmed_model": "підтверджена точна модель або null",
  "confirmed_year": "рік або діапазон або null",
  "confirmed_price_usd": "орієнтовна ринкова ціна USD або null",
  "additional_features": ["характеристика 1", "характеристика 2"],
  "confidence_boost": "висока / середня / низька",
  "notes": "що вдалось підтвердити або null"
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
              if (webInfo.confirmed_brand && webInfo.confirmed_brand !== "null") identification.brand = webInfo.confirmed_brand;
              if (webInfo.confirmed_model && webInfo.confirmed_model !== "null") identification.model = webInfo.confirmed_model;
              if (webInfo.confirmed_year && webInfo.confirmed_year !== "null") identification.year_range = webInfo.confirmed_year;
              if (webInfo.confirmed_price_usd && webInfo.confirmed_price_usd !== "null") identification.price_range = webInfo.confirmed_price_usd;
              if (webInfo.confidence_boost) identification.confidence = webInfo.confidence_boost;
              if (webInfo.additional_features?.length) {
                identification.key_features = [...(identification.key_features || []), ...webInfo.additional_features].slice(0, 6);
              }
            } catch { /* продовжуємо з результатом етапу 2 */ }
          }
        } catch { /* якщо веб-пошук не вдався */ }
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: JSON.stringify(identification) }),
      };
    }

    // ── 2. Пошук на coffeeone.com.ua ─────────────────────────────────────────
    if (action === "search") {
      const brand = (body.brand || "").toLowerCase().trim();

      // Всі бренди з coffeeone.com.ua — прямі посилання на пошук
      const brandPages = {
        // Професійні кавомашини
        "la marzocco":        "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/la-marzocco",
        "nuova simonelli":    "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/nuova-simonelli",
        "victoria arduino":   "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/victoria-arduino-coffee-machines",
        "astoria":            "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/astoria",
        "bfc":                "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/bfc",
        "rancilio":           "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rancilio",
        "rocket":             "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rocket-espresso",
        "rocket espresso":    "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/rocket-espresso",
        "ecm":                "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/ecm",
        "wega":               "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/wega",
        "iberital":           "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/iberital",
        "sanremo":            "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/sanremo",
        "lelit":              "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/lelit",
        "gaggia":             "https://coffeeone.com.ua/uk/all-products/professional-coffeemachines/gaggia",
        "fiamma":             "https://coffeeone.com.ua/uk/index.php?route=product/search&search=fiamma",
        "fiamma espresso":    "https://coffeeone.com.ua/uk/index.php?route=product/search&search=fiamma+espresso",
        "brugnetti":          "https://coffeeone.com.ua/uk/index.php?route=product/search&search=brugnetti",
        "bezzera":            "https://coffeeone.com.ua/uk/index.php?route=product/search&search=bezzera",
        "aurora":             "https://coffeeone.com.ua/uk/index.php?route=product/search&search=aurora",
        "kastor":             "https://coffeeone.com.ua/uk/index.php?route=product/search&search=kastor",
        "synesso":            "https://coffeeone.com.ua/uk/index.php?route=product/search&search=synesso",
        "slayer":             "https://coffeeone.com.ua/uk/index.php?route=product/search&search=slayer",

        // Суперавтомати
        "jura":               "https://coffeeone.com.ua/uk/all-products/auto-coffee/jura-automatic-coffee-machines",
        "delonghi":           "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "de'longhi":          "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "de longhi":          "https://coffeeone.com.ua/uk/all-products/auto-coffee/delonghi",
        "saeco":              "https://coffeeone.com.ua/uk/all-products/auto-coffee/saeco",
        "philips":            "https://coffeeone.com.ua/uk/all-products/auto-coffee/philips",
        "breville":           "https://coffeeone.com.ua/uk/all-products/auto-coffee/breville",
        "sage":               "https://coffeeone.com.ua/uk/all-products/auto-coffee/breville",
        "dr. coffee":         "https://coffeeone.com.ua/uk/index.php?route=product/search&search=dr+coffee",
        "dr coffee":          "https://coffeeone.com.ua/uk/index.php?route=product/search&search=dr+coffee",
        "rheavendors":        "https://coffeeone.com.ua/uk/index.php?route=product/search&search=rheavendors",

        // Капсульні
        "nespresso":          "https://coffeeone.com.ua/uk/all-products/prepared-coffee-machines/nespresso",
        "krups":              "https://coffeeone.com.ua/uk/all-products/prepared-coffee-machines/krups",

        // Кавомолки
        "eureka":             "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/eureka",
        "mahlkonig":          "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mahlkonig",
        "mahlkönig":          "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mahlkonig",
        "mahlkoenig":         "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mahlkonig",
        "mazzer":             "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/mazzer",
        "fiorenzato":         "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/fiorenzato",
        "anfim":              "https://coffeeone.com.ua/uk/all-products/professional-coffee-grinders/anfim",
        "otto florence":      "https://coffeeone.com.ua/uk/index.php?route=product/search&search=otto+florence",
        "macap":              "https://coffeeone.com.ua/uk/index.php?route=product/search&search=macap",

        // Аксесуари та інше
        "acaia":              "https://coffeeone.com.ua/uk/index.php?route=product/search&search=acaia",
        "bravilor":           "https://coffeeone.com.ua/uk/index.php?route=product/search&search=bravilor",
        "bravilor bonamat":   "https://coffeeone.com.ua/uk/index.php?route=product/search&search=bravilor+bonamat",
        "taylor":             "https://coffeeone.com.ua/uk/index.php?route=product/search&search=taylor",
        "liberty's":          "https://coffeeone.com.ua/uk/index.php?route=product/search&search=liberty",
        "liberties":          "https://coffeeone.com.ua/uk/index.php?route=product/search&search=liberty",
        "remidag":            "https://coffeeone.com.ua/uk/index.php?route=product/search&search=remidag",
        "age":                "https://coffeeone.com.ua/uk/index.php?route=product/search&search=age",
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
