# Weather Outfit App (v2)

수정된 사항이 반영된 실시간 야외 날씨 제보 & 옷차림 추천 웹앱입니다.

## 수정 반영 사항
1. `package.json` 추가 (`"type": "module"` 지정으로 Vercel ESM 컴파일 경고 해결)
2. 사용자 역할 분리: 현장 사용자(날씨/체감 제보)와 추천 요청자(옷차림 추천 받기)의 UI 탭 분리
3. 기온 수동 입력 제거: Open-Meteo API를 통한 선택 위치의 실시간 기온 백엔드 자동 조회

## 파일 구조
- `package.json`: 모듈 타입 설정 및 프로젝트 메타데이터
- `index.html`: 프론트엔드 (제보하기 & 추천받기 탭 UI)
- `api/generate.js`: Vercel Serverless Function (실시간 기온 자동 조회 + Gemini API연동)
- `README.md`: 프로젝트 설명 및 안내 문서

## Vercel 배포 방법
1. 압축을 해제한 모든 파일/폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 저장소를 임포트(Import)합니다.
3. Project Settings > Environment Variables 메뉴에서 `GEMINI_API_KEY` 환경변수를 설정합니다.
4. Deploy를 진행합니다.
