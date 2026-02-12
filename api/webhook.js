import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const data = req.body;

    if (!data || data.status !== "approved") {
      return res.status(200).send("IGNORED");
    }

    // 🔹 Converte data para horário do Brasil
    const date = new Date(data.created_at);

    const brasilDate = new Date(
      date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    );

    const formattedDate =
      brasilDate.getDate().toString().padStart(2, "0") + "/" +
      (brasilDate.getMonth() + 1).toString().padStart(2, "0") + "/" +
      brasilDate.getFullYear() + " " +
      brasilDate.getHours().toString().padStart(2, "0") + ":" +
      brasilDate.getMinutes().toString().padStart(2, "0") + ":" +
      brasilDate.getSeconds().toString().padStart(2, "0");

    const paymentMethod = data.method || "";
    const totalPrice = parseFloat(data.total_price);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: "VENDAS_RAW!A:C",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          formattedDate,
          paymentMethod,
          totalPrice
        ]],
      },
    });

    return res.status(200).send("SUCCESS");

  } catch (error) {
    console.error(error);
    return res.status(500).send("ERROR");
  }
}
