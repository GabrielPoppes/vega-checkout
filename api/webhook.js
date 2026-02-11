import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const data = req.body;

    if (data.status !== "approved") {
      return res.status(200).send("IGNORED");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;

    const values = [[
      new Date(data.created_at),
      data.method || "",
      parseFloat(data.total_price)
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "VENDAS_RAW!A:C",
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
