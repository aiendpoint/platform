# 서비스 가입 체크리스트

## 지금 당장 (코딩 시작 전)

- [x] Supabase — [supabase.com](https://supabase.com) · Southeast Asia (Singapore) 리전
- [x] Railway — [railway.app](https://railway.app) · GitHub 로그인
- [x] Vercel — [vercel.com](https://vercel.com) · GitHub 로그인
- [x] Upstash — [upstash.com](https://upstash.com) · Redis 무료 플랜
- [x] GitHub — [github.com/aiendpoint](https://github.com) · Organization 생성

## 도메인

- [x] aiendpoint.dev 구매 — [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) 추천 ($10/년)

## 코딩 중 필요할 때

- [ ] 공공데이터포털 — [data.go.kr](https://www.data.go.kr) · 날씨, 공휴일 API 키
- [ ] 네이버 개발자 — [developers.naver.com](https://developers.naver.com) · 검색 API 키
- [ ] Anthropic Console — [console.anthropic.com](https://console.anthropic.com) · Claude API 키 (변환 레이어용)

## 나중에 (수익화 단계)

- [ ] Stripe — [stripe.com](https://stripe.com) · 결제
- [ ] Resend — [resend.com](https://resend.com) · 이메일 알림 (무료 플랜)

---

## 리전 설정 메모

```
[x] Supabase  → Southeast Asia (Singapore)  ap-southeast-1  ✅
[] Railway   → Southeast Asia (Singapore)
[] Vercel    → vercel.json 에 "regions": ["sin1"] 추가
[x] Upstash   → Asia Pacific (Singapore) 선택
```


## Railway 추후 작업

1. Railway 대시보드 → New Project
2. GitHub 레포 연결 (aiendpoint/platform)
3. registry/ 폴더를 서비스로 지정
4. 리전 → Southeast Asia (Singapore) 선택
5. 환경변수 입력
   SUPABASE_URL=
   SUPABASE_SERVICE_KEY=
   UPSTASH_REDIS_URL=
   ANTHROPIC_API_KEY=
6. 배포 완료 → 도메인 api.aiendpoint.dev 연결
