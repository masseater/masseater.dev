// note: 黒い枠で区切った 3 枚の画面を横に並べ、真ん中に踊る人、左右にその続きの部屋を写して、3 枚で 1 つの広い視野にする。左右の画面には少し遅れた踊りの残像も淡く出す。
void main() {
  vec3 c = vec3(0.02);
  float w = 0.31;
  float gap = 0.015;
  for (int i = 0; i < 3; i++) {
    float x0 = gap + float(i) * (w + gap);
    vec2 q = vec2((uv.x - x0) / w, (uv.y - 0.25) / 0.5);
    if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
      float pano = (float(i) + q.x) / 3.0;
      vec2 p = vec2(pano * 1.8 - 0.4, q.y);
      vec2 m = vec2(1.0 - abs(1.0 - mod(p.x, 2.0)), p.y);
      vec3 img = plate(m);
      if (i == 1) img = rgb(p);
      if (i != 1) img = mix(img, pastRgb(m, time - 0.5) , pastMatte(m, time - 0.5) * 0.35);
      c = img;
    }
  }
  outColor = vec4(c, 1.0);
}
