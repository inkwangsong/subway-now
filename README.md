# 지금 어느 역

지하철에서 지금 어느 역인지 보여주는 웹앱. 내 위치로 가장 가까운 역을 찾고, 도착역을 정하면 환승과 하차를 알려준다.

- 노선 데이터: © OpenStreetMap contributors (ODbL), kimmdr2/metroscope의 network.json에서 역 이름·순서·좌표를 추림
- 지도의 나무·건물·명소 모형은 장식이며 실제 건물 위치가 아니다
- 소요 시간은 역간 2분, 환승 5분으로 잡은 추정치다

## 구조
- `index.html` — 배포되는 웹앱 한 파일 (빌드 결과물)
- `src/` — 원본: 화면 템플릿(`markup4.py`), 노선·경로 계산(`helpers4.js`, `class4.js`), 노선 데이터(`net3.json`), 화면 그리기·위치·알림(`host.js`)
