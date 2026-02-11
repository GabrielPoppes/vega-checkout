import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // 🔹 Garantir que o body existe
    const data = req.body;

    if (!data) {
      console.error("Body vazio");
      return res.status(400).send("No body received");
    }

    // 🔹 Só processa vendas aprovadas
    if (data.status !== "approved") {
      return res.status(200).send("IGNORED");
    }

    // 🔹 Validar variáveis de ambiente
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY não definida");
    }

    if (!process.env.GOOGLE_SHEETS_ID) {
      throw new Error("GOOGLE_SHEETS_ID não definida");
    }

    // 🔹 Parse seguro das credenciais
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (err) {
      console.error("Erro ao fazer parse da GOOGLE_SERVICE_ACCOUNT_KEY");
      throw err;
    }

    // 🔹 Autenticação Google
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 🔹 Preparar dados para planilha
    const values = [[
      new Date(data.created_at),
      data.method || "",
      parseFloat(data.total_price)
    ]];

    // 🔹 Inserir nova linha automaticamente na próxima disponível
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "VENDAS_RAW!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });

    console.log("Venda adicionada:", values);

    return res.status(200).send("SUCCESS");

  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send("ERROR");
  }
}
