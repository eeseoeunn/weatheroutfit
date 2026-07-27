# Weather Outfit App

야외 활동 옷차림 추천 웹앱입니다.

## 파일 구조
- `index.html`: 프론트엔드 UI
- `api/generate.js`: Vercel Serverless Function (Gemini API 연동)
- `README.md`: 프로젝트 안내 파일

## Vercel 배포 방법
1. 이 압축 파일의 해제된 내용을 GitHub 저장소에 업로드합니다.
2. Vercel에서 저장소를 임포트(Import)합니다.
3. Project Settings > Environment Variables 메뉴에서 `GEMINI_API_KEY` 환경변수를 설정합니다.
4. Deploy를 진행합니다.
