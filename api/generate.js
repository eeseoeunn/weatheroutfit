export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { locationName, lat, lon, hasReport, feelTemp, weatherCondition, reportLocation } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  try {
    // 1. Open-Meteo API를 통한 정밀 기상 데이터 조회
    let weatherDetailText = "기상 데이터 조회 불가";
    if (lat && lon) {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,uv_index&hourly=precipitation_probability&forecast_days=1`;
      const weatherRes = await fetch(weatherUrl);
      
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        const current = wData.current || {};
        const pop = wData.hourly?.precipitation_probability?.[0] || 0;
        
        weatherDetailText = `
- 기온: ${current.temperature_2m ?? '알 수 없음'}°C
- 상대 습도: ${current.relative_humidity_2m ?? '알 수 없음'}%
- 강수량: ${current.precipitation ?? 0}mm (강수 확률: ${pop}%)
- UV 지수 (햇빛 세기): ${current.uv_index ?? '알 수 없음'} (0-2 낮음, 3-5 보통, 6-7 높은, 8+ 매우높음)
        `.trim();
      }
    }

    // 2. 제보 여부에 따른 설명 구성
    let reportPrompt = "";
    if (hasReport) {
      reportPrompt = `
[현장 이용자의 실시간 제보]
- 제보 위치: ${reportLocation || '목적지 인근'}
- 현장 체감 온도: ${feelTemp}
- 현장 날씨 상황: ${weatherCondition}
* 정밀 기상 데이터와 현장 제보를 함께 고려하세요.
      `.trim();
    } else {
      reportPrompt = `
[현장 제보 정보]
- 현재 등록된 현장 제보가 없습니다.
* 정밀 기상 데이터(기온, 습도, 강수량, UV 지수)를 바탕으로 추천하세요.
      `.trim();
    }

    // 3. Gemini API 프롬프트 (특수문자 * # @ 금지 규칙 명시)
    const prompt = `
당신은 친절한 패션 코디 AI입니다.
사용자가 선택한 지역의 기상 데이터와 현장 제보(있는 경우)를 바탕으로 옷차림을 추천해주세요.

[목적지 정보]
- 위치: ${locationName}

[목적지 기상 데이터]
${weatherDetailText}

${reportPrompt}

[반드시 지켜야 할 작성 규칙]
1. 특수문자(*, #, @, -, _, ~ 등 마크다운 기호)를 절대로 사용하지 마세요.
2. 대신 이모티콘(👕, 👖, ☀️, ☂️ 등)은 자유롭게 사용하여 보기 편하고 깔끔하게 작성하세요.
3. 별도의 마크다운 제목 기호(#) 없이 줄바꿈과 이모티콘만 사용하여 정갈하게 단락을 나누세요.
4. 요약 설명, 추천 상의, 추천 하의, 추천 아우터, 추천 신발, 챙겨야 할 소지품 순서로 깔끔하게 정리해 주세요.
    `;

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
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '추천 결과를 생성할 수 없습니다.';

    // 백엔드 차원에서도 마크다운 특수문자(*, #, @) 2차 제거 안전장치
    reply = reply.replace(/[*#@]/g, '');

    return res.status(200).json({ result: reply });
  } catch (error) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
