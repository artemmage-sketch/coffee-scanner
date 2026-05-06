exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const action = body.action || "analyze";

    // ── 1. Розпізнавання фото ───────────────────────────────────────────────
    if (action === "analyze") {
      const systemPrompt = `Ти — експерт світового рівня з кавового обладнання з 25-річним досвідом. Ти знаєш напам'ять тисячі моделей кавомашин, кавомолок та іншого кавового обладнання від усіх виробників світу.

ТВОЄ ЗАВДАННЯ: Детально проаналізувати фото та максимально точно визначити обладнання.

ЯК АНАЛІЗУВАТИ:
1. Спочатку визнач загальний тип: кавомашина еспресо / суперавтомат / автоматична / капсульна / кавомолка / пуровер / аеропрес / кемекс / мока / турка / інше
2. Шукай логотип або назву бренду на корпусі — це найнадійніший спосіб
3. Аналізуй форму корпусу, розташування кнопок, дисплею, групи, носика
4. Звертай увагу на характерні деталі: форма парової трубки, тип дозатора, розташування бункера для зерен
5. Враховуй колір, матеріал, розміри відносно інших предметів на фото
6. Якщо бачиш серійний номер або маркування — використовуй це

ВІДОМІ БРЕНДИ ТА ЇХНІ ОСОБЛИВОСТІ:
- De'Longhi: характерний дизайн, часто чорний або сріблястий, моделі: Dedica, Magnifica, Dinamica, Eletta, La Specialista
- Jura: швидкознімний капучинатор, фірмовий дисплей, моделі: E8, S8, Z10, ENA, Giga
- Saeco: круглі форми, моделі: Xelsis, Incanto, Pico Baristo, Minuto
- Philips: схожий дизайн до Saeco (компанія-власник), моделі: 3200, 4300, 5400, LatteGo
- Gaggia: класичний італійський дизайн, моделі: Classic Pro, Babila, Magenta
- Rancilio: промисловий вигляд, моделі: Silvia, Classe
- La Marzocco: преміум, характерний подвійний бойлер, моделі: Linea Mini, GS3, Strada
- Nuova Simonelli: професійні, моделі: Oscar, Appia, Musica
- ECM: німецька якість, моделі: Synchronika, Classika, Puristika
- Rocket Espresso: італійський дизайн, моделі: Appartamento, Mozzafiato
- Breville/Sage: австралійський бренд, моделі: Barista Express, Oracle, Bambino
- Nespresso: капсульні, характерний дизайн, моделі: Vertuo, Pixie, Creatista
- Illy: моделі Francis&Francis, X7, X9
- Кавомолки: Eureka (Mignon, Atom), Mahlkönig (EK43, Peak), Mazzer (Mini, Kony), Baratza (Encore, Virtuoso), Fellow (Ode), Comandante

ВАЖЛИВО:
- Якщо бачиш логотип — вір йому більше ніж формі
- Якщо не впевнений у точній моделі — вкажи найбільш схожу і знизь confidence до "середня"
- Якщо взагалі не можеш визначити модель — вкажи хоча б бренд
- НІКОЛИ не вигадуй моделі яких не існує

Відповідай ТІЛЬКИ у форматі JSON без markdown та без додаткового тексту:
{
  "is_coffee_equipment": true або false,
  "equipment_type": "точний тип обладнання",
  "brand": "бренд або 'Не визначено'",
  "model": "точна назва моделі або 'Не визначено'",
  "year_range": "приблизний рік випуску або діапазон або null",
  "confidence": "висока / середня / низька",
  "description": "Детальний опис 2-3 речення: що це, для чого, чим особливе",
  "key_features": ["характеристика 1", "характеристика 2", "характеристика 3", "характеристика 4"],
  "price_range": "орієнтовна роздрібна ціна в USD або null",
  "coffee_types": ["вид кави який можна приготувати 1", "вид кави 2"],
  "visual_clues": "які саме візуальні ознаки допомогли визначити модель",
  "search_query": "короткий пошуковий запит для магазину: бренд + модель латиницею"
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          max_tokens: 1200,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: body.content }
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          statusCode: response.status,
          body: JSON.stringify({ error: data.error?.message || "API Error" }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: data.choices[0].message.content }),
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
        return {
          statusCode: 200,
          body: JSON.stringify({ products: [], searchUrl }),
        };
      }

      const html = await res.text();

      // Парсимо товари з HTML
      const products = [];

      // Знаходимо блоки товарів (OpenCart структура)
      const productRegex = /<div[^>]*class="[^"]*product-thumb[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
      const nameRegex = /class="name"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/;
      const priceRegex = /class="price[^"]*"[^>]*>[\s\S]*?<span[^>]*>([\d\s,\.]+\s*(?:грн|€|\$|₴))<\/span>/;
      const imgRegex = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/;

      // Альтернативний парсинг — шукаємо посилання на товари
      const linkRegex = /href="(https:\/\/coffeeone\.com\.ua\/[^"]*\.html)"[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g;
      const priceBlockRegex = /href="(https:\/\/coffeeone\.com\.ua\/[^"]*\.html)"[\s\S]{0,500}?([\d\s]+\s*грн)/g;

      // Парсимо посилання + зображення
      const linkMatches = [...html.matchAll(linkRegex)];
      const seen = new Set();

      for (const match of linkMatches) {
        const url = match[1];
        const img = match[2];
        const name = match[3];

        if (seen.has(url) || !name || name.length < 3) continue;
        seen.add(url);

        // Шукаємо ціну поряд з цим товаром
        const urlIndex = html.indexOf(url);
        const chunk = html.substring(urlIndex, urlIndex + 1000);
        const priceMatch = chunk.match(/([\d\s]+)\s*грн/);
        const price = priceMatch ? priceMatch[1].trim().replace(/\s+/g, " ") + " грн" : null;

        // Шукаємо ціну в євро якщо немає гривні
        const eurMatch = chunk.match(/([\d]+)\s*€/);
        const priceEur = eurMatch ? eurMatch[1] + " €" : null;

        products.push({
          name: name.trim(),
          url,
          img: img.startsWith("http") ? img : "https://coffeeone.com.ua" + img,
          price: price || priceEur || null,
        });

        if (products.length >= 3) break;
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
          searchUrl,
          total: products.length,
        }),
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
