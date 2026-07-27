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
    // 1. Open-Meteo API를 통한 기온, 습도, 강수량, UV 지수 조회
    let weatherDetailText = "기상 데이터 조회 불가";
    if (lat && lon) {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,uv_index&hourly=precipitation_probability&forecast_days=1`;
      const weatherRes = await fetch(weatherUrl);
      
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        const current = wData.current || {};
        const pop = wData.hourly?.precipitation_probability?.[0] || 0; // 강수확률
        
        weatherDetailText = `
- 기온: ${current.temperature_2m ?? '알 수 없음'}°C
- 상대 습도: ${current.relative_humidity_2m ?? '알 수 없음'}%
- 강수량: ${current.precipitation ?? 0}mm (강수 확률: ${pop}%)
- UV 지수 (햇빛 세기): ${current.uv_index ?? '알 수 없음'} (0-2 낮음, 3-5 보통, 6-7 높은, 8+ 매우높음)
        `.trim();
      }
    }

    // 2. 제보 여부에 따른 프롬프트 분기 생성
    let reportPrompt = "";
    if (hasReport) {
      reportPrompt = `
[현장 야외 이용자의 실시간 제보 정보]
- 제보 위치: ${reportLocation || '목적지 인근'}
- 현장 체감 온도: ${feelTemp}
- 현장 날씨 상황: ${weatherCondition}
* 참고: 실제 기상 데이터와 현장 제보 정보를 종합적으로 고려하여 추천해주세요.
      `.trim();
    } else {
      reportPrompt = `
[현장 제보 정보]
- 현재 등록된 현장 사용자 제보 정보가 없습니다.
* 참고: 오직 정밀 기상 데이터(기온, 습도, 강수량, UV 지수)를 바탕으로 가장 적절한 옷차림을 추천해주세요.
      `.trim();
    }

    const prompt = `
당신은 날씨 및 패션 코디 전문 AI 컨설턴트입니다.
사용자가 방문하려는 목적지의 정밀 기상 데이터와 현장 사용자 제보(있는 경우)를 분석하여 최적의 옷차림과 준비물을 추천해주세요.

[목적지 정보]
- 위치: ${locationName}

[목적지 실시간 기상 데이터]
${weatherDetailText}

${reportPrompt}

[작성 가이드라인]
1. 친근하고 세련된 톤앤매너로 작성하세요.
2. 기온, 습도, 강수량, UV 지수(햇빛 세기) 및 제보 여부를 언급하며 현재 종합 날씨 상황을 2줄 이내로 요약하세요.
3. 상의, 하의, 아우터, 신발 등 구체적이고 스타일리시한 옷차림을 추천하세요.
4. 습도, 강수 여부, UV 지수(햇빛 강도)에 맞춰 우산, 양산, 선글라스, 자외선 차단제 등 필수 아이템을 추천하세요.
5. 가독성이 뛰어난 마크다운 형식으로 보기 쉽게 작성해 주세요.
    `;

    // 3. Gemini API 호출
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
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

    return res.status(200).json({ result: reply });
  } catch (error) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
}
