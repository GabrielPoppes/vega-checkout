import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const data = req.body;

    console.log("BODY RECEBIDO:", data);

    if (data.status !== "approved") {
      return res.status(200).send("IGNORED");
    }

    const saleCode = data.sale_code;
    if (!saleCode) {
      return res.status(200).send("SEM SALE_CODE");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    // 🔎 Buscar vendas já existentes
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "VENDAS_RAW!D:D", // Coluna D guardará sale_code
    });

    const existingCodes = existing.data.values?.flat() || [];

    if (existingCodes.includes(saleCode)) {
      console.log("VENDA DUPLICADA IGNORADA:", saleCode);
      return res.status(200).send("DUPLICATE");
    }

    // 💰 Corrigir valor (centavos → reais)
    const totalPrice = Number(data.total_price) / 100;

    const createdAt = new Date(data.created_at);
    const formattedDate = createdAt.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    const values = [[
      formattedDate,
      data.method || "",
      totalPrice,
      saleCode
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "VENDAS_RAW!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

    return res.status(200).send("SUCCESS");

  } catch (error) {
    console.error(error);
    return res.status(500).send("ERROR");
  }
}
