interface ExtractedInfo {
  company: string
  name: string
  email: string
  phone: string
  jobTitle?: string
  badgeId?: string
}

interface MultipleCardsResult {
  cards: ExtractedInfo[]
  count: number
}

export async function extractInfoFromImage(imageBuffer: Buffer): Promise<MultipleCardsResult> {
  try {
    console.log("Starting image extraction process...")
    console.log(`Image buffer size: ${imageBuffer.length} bytes`)

    // 画像をBase64エンコード
    const base64Image = imageBuffer.toString("base64")
    console.log(`Base64 image length: ${base64Image.length} characters`)

    // 画像のMIMEタイプを推測（先頭バイトから判断）
    let mimeType = "image/jpeg"
    if (base64Image.startsWith("/9j/")) {
      mimeType = "image/jpeg"
    } else if (base64Image.startsWith("iVBORw0KGgo")) {
      mimeType = "image/png"
    } else if (base64Image.startsWith("R0lGODlh")) {
      mimeType = "image/gif"
    } else if (base64Image.startsWith("UklGR")) {
      mimeType = "image/webp"
    }

    console.log(`Detected MIME type: ${mimeType}`)

    // 複数名刺対応のプロンプト
    const prompt = `
この画像には名刺または連絡先情報が含まれています。
画像に含まれる全ての名刺から情報を抽出して、JSON配列形式で返してください。

複数の名刺がある場合は、それぞれの名刺について個別に情報を抽出してください。
名刺が1枚しかない場合でも、配列形式で返してください。

必ず以下のJSON形式で返してください：
{
  "cards": [
    {
      "company": "会社名",
      "name": "氏名",
      "email": "メールアドレス",
      "phone": "電話番号",
      "jobTitle": "役職",
      "badgeId": "バッジID"
    }
  ]
}

見つからない情報は空文字列にしてください。
バッジIDとは、社員証や入館証に記載されている識別番号のことです。
JSONのみを返してください。余分なテキストは含めないでください。
`

    try {
      console.log("Using direct OpenAI API call for image analysis...")

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("OpenAI API error response:", errorText)
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Direct OpenAI API response:", JSON.stringify(data, null, 2))

      const responseText = data.choices[0]?.message?.content || ""
      console.log("Response text:", responseText)

      // JSONをパース
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        const jsonText = jsonMatch ? jsonMatch[0] : responseText

        console.log("Extracted JSON text:", jsonText)

        const extractedData = JSON.parse(jsonText)
        console.log("Parsed JSON:", extractedData)

        // データの正規化
        const cards: ExtractedInfo[] = []

        if (extractedData.cards && Array.isArray(extractedData.cards)) {
          // 複数名刺の場合
          for (const card of extractedData.cards) {
            cards.push({
              company: card.company || "",
              name: card.name || "",
              email: card.email || "",
              phone: card.phone || "",
              jobTitle: card.jobTitle || "",
              badgeId: card.badgeId || "",
            })
          }
        } else if (extractedData.company || extractedData.name) {
          // 単一名刺の場合（後方互換性）
          cards.push({
            company: extractedData.company || "",
            name: extractedData.name || "",
            email: extractedData.email || "",
            phone: extractedData.phone || "",
            jobTitle: extractedData.jobTitle || "",
            badgeId: extractedData.badgeId || "",
          })
        }

        const result: MultipleCardsResult = {
          cards:
            cards.length > 0
              ? cards
              : [
                  {
                    company: "情報抽出エラー",
                    name: "情報抽出エラー",
                    email: "",
                    phone: "",
                    jobTitle: "",
                    badgeId: "",
                  },
                ],
          count: cards.length,
        }

        console.log("Final extracted info:", result)
        return result
      } catch (parseError) {
        console.error("Error parsing JSON from GPT response:", parseError)
        console.log("Raw GPT response:", responseText)

        // フォールバック処理
        return {
          cards: [
            {
              company: "情報抽出エラー",
              name: "情報抽出エラー",
              email: "",
              phone: "",
              jobTitle: "",
              badgeId: "",
            },
          ],
          count: 1,
        }
      }
    } catch (error) {
      console.error("Error in image extraction:", error)
      return {
        cards: [
          {
            company: "情報抽出エラー",
            name: "情報抽出エラー",
            email: "",
            phone: "",
            jobTitle: "",
            badgeId: "",
          },
        ],
        count: 1,
      }
    }
  } catch (error) {
    console.error("Error extracting info from image:", error)
    return {
      cards: [
        {
          company: "情報抽出エラー",
          name: "情報抽出エラー",
          email: "",
          phone: "",
          jobTitle: "",
          badgeId: "",
        },
      ],
      count: 1,
    }
  }
}

// 後方互換性のための関数
export async function extractSingleInfoFromImage(imageBuffer: Buffer): Promise<ExtractedInfo> {
  const result = await extractInfoFromImage(imageBuffer)
  return (
    result.cards[0] || {
      company: "情報抽出エラー",
      name: "情報抽出エラー",
      email: "",
      phone: "",
      jobTitle: "",
      badgeId: "",
    }
  )
}
