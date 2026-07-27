export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { feelTemp, weatherCondition, temp, location } = req.body;

  // GEMINI_API_KEY 환경변수 확인
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  // Gemini에 전달할 프롬프트 구성
  const prompt = `
당신은 센스 있는 패션 및 날씨 코디 추천 AI입니다.
현재 야외 활동 중인 사용자의 제보와 날씨 정보를 바탕으로, 다른 사용자들에게 필요한 최적의 옷차림과 준비물을 추천해주세요.

[현재 현장 상태 및 날씨 데이터]
- 위치: ${location || '알 수 없음'}
- 기온: ${temp ? temp + '°C' : '알 수 없음'}
- 야외 사용자가 느낀 체감 온도: ${feelTemp}
- 야외 사용자가 보고한 날씨 상황: ${weatherCondition}

[작성 가이드라인]
1. 친근하고 쾌적한 톤앤매너로 작성하세요.
2. 현재 날씨 및 사용자 체감 제보를 한 줄로 요약해 주세요.
3. 상의, 하의, 아우터, 신발 등 구체적인 옷차림 조합을 추천하세요.
4. 햇빛, 바람, 비 등에 대비한 추가 아이템(양산, 선글라스, 우산, 겉옷 등)을 추천하세요.
5. 가독성이 좋게 마크다운 형태로 깔끔하게 작성해 주세요.
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error?.message || 'Gemini API 호출 실패' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '추천 결과를 생성할 수 없습니다.';

    return res.status(200).json({ result: reply });
  } catch (error) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
