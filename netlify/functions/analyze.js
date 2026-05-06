exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const action = body.action || "analyze";

    // ── 1. Розпізнавання фото через GPT-4o ─────────────────────────────────
    if (action === "analyze") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1000,
          messages: [{ role: "user", content: body.content }],
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
