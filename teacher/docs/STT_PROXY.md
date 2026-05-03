# STT Proxy Cho Speaking Submit

## Tại sao cần proxy

`Speaking submit` hiện gọi OpenAI STT từ Cloudflare Worker:

- `POST /assignments/:id/submit`
- upstream: `https://api.openai.com/v1/audio/transcriptions`

Nếu log backend hiện:

```json
{
  "colo": "HKG",
  "error": {
    "code": "unsupported_country_region_territory"
  }
}
```

thì lỗi nằm ở **Cloudflare Worker egress region**, không phải do máy người dùng ở Việt Nam.

Giải pháp ổn định là:

1. Dựng một service STT riêng **không chạy trên Cloudflare**.
2. Service đó gọi OpenAI STT trực tiếp.
3. Cloudflare Worker chỉ forward audio sang service này.

---

## File proxy đã có sẵn

Proxy tối giản nằm ở:

- [src/stt-proxy.mjs](/Users/ngoquangduc/Desktop/workspace/ielts_web/teacher/backend/src/stt-proxy.mjs)

Chạy local:

```bash
cd teacher/backend
OPENAI_API_KEY=your_key_here npm run stt-proxy:dev
```

Health check:

```bash
curl http://localhost:8788/health
```

Endpoint nhận STT:

```bash
POST /stt
Content-Type: multipart/form-data
```

Payload tương thích với OpenAI STT hiện tại:

- `file`
- `model`
- `response_format`

Proxy sẽ forward nguyên multipart này sang OpenAI.

---

## Env vars cho proxy

### Bắt buộc

- `OPENAI_API_KEY`

### Khuyên dùng

- `STT_PROXY_TOKEN`
  - shared secret giữa Cloudflare Worker và proxy
  - Worker sẽ gửi `Authorization: Bearer <token>`

### Tuỳ chọn

- `PORT`
  - mặc định `8788`
- `MAX_AUDIO_MB`
  - mặc định `50`
- `OPENAI_STT_UPSTREAM_URL`
  - mặc định `https://api.openai.com/v1/audio/transcriptions`

---

## Env vars cho Cloudflare Worker

Sau khi deploy proxy, set các secret/vars này cho Worker:

- `OPENAI_STT_URL=https://your-proxy-domain/stt`
- `OPENAI_STT_BEARER_TOKEN=your_shared_secret`

`OPENAI_API_KEY` ở Worker vẫn có thể giữ nguyên cho các luồng khác như AI feedback.

---

## Flow sau khi cấu hình

1. Student nộp bài Speaking.
2. Cloudflare Worker nhận file audio.
3. Worker gọi `OPENAI_STT_URL` thay vì gọi OpenAI STT trực tiếp.
4. Proxy gọi OpenAI STT từ hạ tầng riêng.
5. Proxy trả transcript về Worker.
6. Worker lưu `speaking_script` và tiếp tục flow submit như hiện tại.

---

## Gợi ý nơi deploy

Nên deploy proxy ở nơi có outbound ổn định:

- Railway
- Render
- Fly.io
- VPS Singapore
- GCP Cloud Run
- AWS / Lightsail / EC2

Nếu mục tiêu là tránh lỗi region do Cloudflare HKG, ưu tiên:

- Singapore
- Tokyo
- region gần Đông Nam Á nhưng không đi qua Cloudflare Worker egress

---

## Checklist production

1. Deploy `src/stt-proxy.mjs` lên một host riêng.
2. Set `OPENAI_API_KEY` trên host đó.
3. Tạo `STT_PROXY_TOKEN`.
4. Set cho Worker:
   - `OPENAI_STT_URL`
   - `OPENAI_STT_BEARER_TOKEN`
5. Redeploy Worker.
6. Test lại `Speaking submit`.

---

## Ghi chú

- Proxy này chỉ giải quyết phần **STT cho Speaking**.
- Nó không thay đổi flow chấm bài, submit, score, hay render bên student.
- Nếu sau này `AI feedback` cũng gặp lỗi region tương tự từ Cloudflare, có thể áp dụng cùng pattern cho `responses` bằng `OPENAI_RESPONSES_URL`.
