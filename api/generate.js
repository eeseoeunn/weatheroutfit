export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { city, lat, lon, feelTemp, weatherCondition } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  try {
    // 1. 선택한 지역의 현재 실제 기온 자동 조회 (Open-Meteo API 사용)
    let currentTemp = '알 수 없음';
    if (lat && lon) {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        currentTemp = `${weatherData.current_weather.temperature}°C`;
      }
    }

    // 2. Gemini API에 전달할 프롬프트 구성
    const prompt = `
당신은 현장 데이터 기반 패션 추천 AI입니다.
현재 해당 위치에 있는 야외 제보자들이 보낸 실시간 체감/날씨 제보와 실시간 기온 데이터를 종합하여, 그 지역으로 나가려는 다른 사용자에게 맞춤 옷차림을 추천해주세요.

[목적지 정보]
- 위치: ${city}
- 현재 실제 기온(자동 측정): ${currentTemp}

[현장 야외 이용자들의 실시간 제보]
- 현장 체감 온도: ${feelTemp}
- 현장 날씨 상황: ${weatherCondition}

[작성 가이드라인]
1. 친근하고 센스 있는 톤앤매너로 작성하세요.
2. "현재 현장 제보에 따르면~" 형태로 제보 상황을 한 줄 요약해 주세요.
3. 상의, 하의, 아우터, 신발 등 구체적인 옷차림 조합을 추천하세요.
4. 햇빛, 바람, 비 등에 대비한 추가 아이템(양산, 선글라스, 우산, 겉옷 등)을 추천하세요.
5. 가독성이 좋게 마크다운 형태로 깔끔하게 작성해 주세요.
  `;

    // 3. Gemini API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error?.message || 'Gemini API 호출 실패' });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '추천 결과를 생성할 수 없습니다.';

    return res.status(200).json({ result: reply, temp: currentTemp });
  } catch (error) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
