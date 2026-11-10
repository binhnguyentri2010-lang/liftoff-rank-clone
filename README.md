# Liftoff — Ranked Gym Workouts Clone (EN / VI)

Ứng dụng Web / iOS PWA ghi mức tạ, tính **1RM Epley chuẩn hóa theo cân nặng** ($\text{BW}^{2/3}$) và xếp hạng sức mạnh **9 bậc từ Wood đến Olympian** cho 36 bài tập & 15 nhóm cơ trên Bodygraph.

- **Mở chạy trực tiếp (GitHub Pages)**: https://binhnguyentri2010-lang.github.io/liftoff-rank-clone/
- **Bản 1 file HTML độc lập (chạy offline `file://`)**: [`liftoff-singlefile.html`](./liftoff-singlefile.html)

---

## Cài lên màn hình chính iPhone (Safari PWA)

1. Mở link GitHub Pages trên **Safari iPhone**.
2. Bấm nút **Chia sẻ (Share)** ở thanh dưới cùng.
3. Chọn **Thêm vào MH chính (Add to Home Screen)** → mở app toàn màn hình, tự lưu lịch sử tập & rank ngay trên máy (`localStorage`).

---

## Tính năng chính

- **Home (`375×812`)**: Chuỗi ngày tập (Streak quy tắc 3 ngày của Liftoff), trạng thái hồi phục cơ 60h, thẻ `Start Ranked Workout`, nút chuyển nhanh **EN / VI** 1 chạm.
- **Workout Logger**: Chọn bài tập theo nhóm cơ hoặc Preset (`Push`, `Pull`, `Legs`, `Calibration`), tích set tính trực tiếp **Est. 1RM** (bỏ qua set `Warmup`), giải ngược chính xác mức tạ cần nâng để chạm bậc Rank tiếp theo, màn hình ăn mừng **Rank Up** kèm âm thanh WebAudio.
- **Ranks & Bodygraph 15 nhóm cơ**: Sơ đồ cơ thể Mặt trước / Mặt sau tô màu trực tiếp theo bậc Rank từng vùng cơ + công cụ ướm thử **1RM & Rank Calculator**.
- **Profile, Nutrition & Friends**: Chỉnh cân nặng, giới tính, đơn vị `kg / lb`, xem lịch sử buổi tập và xóa buổi tập (tự động tính lại / hạ bậc Rank chuẩn xác).

---

## Kiểm thử cục bộ

```bash
node --test tests/rankEngine.test.mjs
python3 scripts/bundle_singlefile.py
```
