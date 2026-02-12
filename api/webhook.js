import { google } from "googleapis";

const STORE_SHEETS = {
  "Compra Segura": "1NPjRpJb6oIksiVPpCJOHC1nxgnzxwMHP_OowMen56yE",
  "Pagamento Seguro": "1mXYkWjJKmJQaP327RL4YGUk4UtcroOguiMmNqydb_Kc",
  "Projeto Gênio Brasil": "1UvpVKHAMpK6XswCC4a43u27-FepcBm_E5-Qg6Kx9ilg",
  "Escola Pequeno Gênio": "11_PUCtLNRDLPqNURJLIDX4kqIPDVxvrs4u1WwCeKumU"
};

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

    const businessName = data.business_name;
    const saleCode = data.sale_code;

    if (!STORE_SHEETS[businessName]) {
      console.log("LOJA NÃO MAPEADA:", businessName);
      return res.status(200).send("STORE NOT FOUND");
    }

    const spreadsheetId = STORE_SHEETS[businessName];

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 🔎 Verifica duplicidade
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "VENDAS_RAW!D:D",
    });

    const existingCodes = existing.data.values?.flat() || [];

    if (existingCodes.includes(saleCode)) {
      console.log("VENDA DUPLICADA IGNORADA:", saleCode);
      return res.status(200).send("DUPLICATE");
    }

    // 💰 Corrige centavos
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

    console.log("VENDA INSERIDA EM:", businessName);

    return res.status(200).send("SUCCESS");

  } catch (error) {
    console.error(error);
    return res.status(500).send("ERROR");
  }
}
