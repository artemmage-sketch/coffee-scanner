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
              content: `Ти — експерт світового рівня з кавового обладнання з 30-річним досвідом. Ти особисто бачив, тестував і обслуговував тисячі машин. Знаєш напам'ять зовнішній вигляд кожної моделі.

Тобі нададуть детальний зоровий опис пристрою. Твоя задача — максимально точно визначити бренд і модель.

АЛГОРИТМ ІДЕНТИФІКАЦІЇ:
1. Якщо в описі є ТОЧНИЙ логотип або назва бренду/моделі — це абсолютний пріоритет, вір цьому перш за все
2. Якщо логотипу немає — аналізуй комбінацію унікальних візуальних ознак
3. Якщо не впевнений у моделі — краще вкажи правильний бренд і серію, ніж вигадай модель

БАЗА ЗНАНЬ (детальна):

=== ПРЕМІУМ ПРОФЕСІЙНІ ===

LA MARZOCCO — розрізняй дуже уважно:
• Linea Classic / Classic S: прямокутний корпус, 2 круглі манометри ЗЛІВА на фронтальній панелі, кнопки праворуч від груп, немає дисплею, класичний індустріальний вигляд, є 1/2/3-групові версії. Найпоширеніша барна машина світу.
• Linea PB / PB AV / PB EE: зовні схожа на Classic, але є LED підсвітка синього кольору навколо групової голівки, кнопки більш сучасні та плоскі, часто є мала цифрова індикація
• GS/3: КОМПАКТНА домашня/напівпрофесійна, характерний виступаючий "горб" зверху корпусу, унікальний дизайн, немає великих манометрів спереду
• Linea Mini: найменша, домашня, дуже лаконічний дизайн, один бойлер, манометр може бути зверху або зовсім відсутній спереду
• KB90: Forward Facing Group — група нахилена ВПЕРЕД до баріста, дуже сучасний геометричний вигляд
• Strada: великі горизонтальні ПАДДЛИ (важелі) замість кнопок, масивна машина

NUOVA SIMONELLI / VICTORIA ARDUINO (один виробник):
• Appia Life / Appia II: класична барна, прямокутна, кнопки на групі, немає дисплею або є малий, 1-3 групи
• Aurelia Wave / Aurelia II: преміум, сенсорний дисплей на кожній групі, T3 технологія
• Oscar II: домашня/напівпрофесійна, компактна, одна група
• Black Eagle / Maverick: флагманська, важільний або кнопковий, преміум вигляд
• Victoria Arduino White Eagle / Black Eagle Gravitech: преміум дизайн, часто з великим дисплеєм

SYNESSO:
• MVP Hydra / S-Series: американська машина, характерна висока панель управління, кнопки/паддли, часто нержавійка

SLAYER:
• Single Group / Steam EP: американська преміум, дуже характерні паддли, деревʼяні вставки (горіх/бамбук), унікальний дизайн

KEES VAN DER WESTEN:
• Mirage / Spirit: нідерландська, ДУЖЕ впізнаваний авангардний дизайн, вигнуті форми, нержавійка + кольорові панелі, паддли

SANREMO:
• Cafe Racer: характерний мотоциклетний стиль, круглі елементи
• Opera / You: класичні барні машини
• F18 / X ONE: сучасні з дисплеями

LELIT:
• Bianca: домашня з паддлем, нержавійка + дерев'яні ручки
• MaraX: компактна домашня, термосифон

ROCKET ESPRESSO:
• R9 / R58: характерний круглий манометр по центру або 2 манометри, нержавійка + мідні/латунні деталі
• Appartamento: компактна, характерні круглі отвори на бічних панелях

ECM:
• Synchronika / Classika: нержавійка, класичний вигляд, манометр по центрі зверху

RANCILIO:
• Classe 5 / 7 / 9 / 11: барні, характерна форма, кнопки на групі
• Silvia: культова домашня, маленька прямокутна нержавійка

=== МАСОВИЙ РИНОК ===

DE'LONGHI:
• Dedica: дуже вузька (15 см), висока, одна група
• La Specialista: більша напівавтомат, вбудована кавомолка
• Magnifica / Dinamica: суперавтомат, відсік для зерен зверху

JURA:
• E-серія (E6/E8): округлий дизайн, кольоровий дисплей спереду по центру, швидкознімний капучинатор
• S-серія (S8): преміумніша, більший дисплей
• Z-серія (Z10): флагман, великий кольоровий дисплей

SAECO / PHILIPS:
• 3200/4300/5400 серії: система LatteGo (прозорий контейнер для молока збоку), округлі форми

GAGGIA:
• Classic Pro: ретро стиль, нержавійка, характерна кнопкова панель

BREVILLE / SAGE:
• Barista Express: вбудована кавомолка зверху
• Oracle: більша, автоматизована
• Bambino: маленька, мінімалістична

NESPRESSO: капсульна — видно відсік для капсул, дуже компактна

=== КАВОМОЛКИ ===
• Mahlkönig EK43: великий плоский бур 98мм, висока, горизонтальний вихід
• Mahlkönig Peak / X54: висока, цифровий дисплей
• Eureka Mignon серія: компактна, вузька форма (Silenzio/Specialita/Oro)
• Eureka Atom: більша, для бару
• Mazzer Mini / Super Jolly / Kony / Major: класичні форми різного розміру
• Baratza Encore / Virtuoso: пластиковий корпус
• Fellow Ode: дуже мінімалістична, пласка, домашня
• Comandante / Kinu / 1Zpresso: ручні, циліндрична форма

ПРАВИЛА:
- НІКОЛИ не вигадуй неіснуючі моделі
- Якщо бренд відомий але модель не певна — вкажи серію або "невідома модель [Бренд]"
- Якщо це кастомна/унікальна машина — вкажи це
- Для рідкісних брендів — краще низька впевненість з правильним брендом

Відповідай ТІЛЬКИ JSON без markdown, без пояснень, без коментарів:
{
  "is_coffee_equipment": true або false,
  "equipment_type": "тип обладнання українською",
  "brand": "бренд або 'Не визначено'",
  "model": "модель або серія або 'Не визначено'",
  "year_range": "рік або діапазон або null",
  "confidence": "висока / середня / низька",
  "description": "2-3 речення опису що це за машина і чим особлива",
  "key_features": ["особливість 1", "особливість 2", "особливість 3", "особливість 4"],
  "price_range": "орієнтовна ціна USD або null",
  "coffee_types": ["напій 1", "напій 2"],
  "visual_clues": "детально — що саме на фото допомогло визначити: які конкретні елементи, написи, форми",
  "search_brand": "назва бренду латиницею для пошуку або null"
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

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: step2Data.choices[0].message.content }),
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
