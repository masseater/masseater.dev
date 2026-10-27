// note: 客席の後ろから見た劇場で、視野の大半を覆う大きな画面に踊りを映す。画面はわずかに湾曲し、その光が手前の観客の頭の影の縁を照らす。
void main() {
  vec3 c = vec3(0.01);
  vec2 q = vec2((uv.x - 0.03) / 0.94, (uv.y - 0.03) / 0.72);
  q.y += pow(abs(q.x - 0.5) * 2.0, 2.0) * 0.03 * (q.y - 0.5) * -2.0;
  float on = inside(q);
  vec3 screen = rgb(clamp(q, 0.0, 1.0));
  c = mix(c, screen, on);
  vec3 spill = rgb(vec2(0.5, 0.5)) * 0.3;
  float seats = 0.0;
  for (int row = 0; row < 3; row++) {
    float y = 0.86 + float(row) * 0.06;
    float sx = 0.06 + float(row) * 0.01;
    float x = mod(uv.x + float(row) * 0.03, sx) - sx * 0.5;
    float head = step(length(vec2(x * aspect(), uv.y - y)), 0.035 + float(row) * 0.01);
    float shoulders = step(y + 0.02, uv.y);
    seats = max(seats, max(head, shoulders));
  }
  c = mix(c, spill * 0.25 * smoothstep(1.0, 0.8, uv.y), seats);
  outColor = vec4(c, 1.0);
}
