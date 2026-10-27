// note: 踊る人を頭、胴、脚の 3 つの部品に横で切り分け、6 秒ごとに宙へ離して浮かべ、また組み上げる。離れている間は部品をつなぐ点線と部品名の印を出す。
// text: 頭
// text: 胴
// text: 脚
void main() {
  float t = mod(time, 6.0);
  float spread = smoothstep(0.5, 2.0, t) * (1.0 - smoothstep(4.0, 5.5, t));
  float neck = mix(joint(0).y, (joint(11).y + joint(12).y) * 0.5, 0.6);
  float hip = (joint(23).y + joint(24).y) * 0.5;
  vec3 c = mix(vec3(0.93, 0.94, 0.96), vec3(0.85, 0.87, 0.9), uv.y);
  float offsets[3] = float[3](-0.12, 0.0, 0.12);
  float cuts[4] = float[4](0.0, neck, hip, 1.0);
  for (int i = 0; i < 3; i++) {
    vec2 p = uv - vec2(0.0, offsets[i] * spread);
    if (p.y >= cuts[i] && p.y < cuts[i + 1]) {
      float m = matte(p);
      c = mix(c, rgb(p), m);
    }
    float labelY = (cuts[i] + cuts[i + 1]) * 0.5 + offsets[i] * spread;
    c = mix(c, vec3(0.2), textBox(uv, vec2(0.85, labelY), 0.05, i) * spread);
    c = mix(c, vec3(0.4), step(0.5, fract(uv.x * 80.0)) * smoothstep(0.002, 0.0, abs(uv.y - labelY)) * step(bodyCenter().x + 0.1, uv.x) * step(uv.x, 0.8) * spread);
  }
  float axis = step(abs(uv.x - bodyCenter().x) * aspect(), 0.0015) * step(0.5, fract(uv.y * 60.0)) * spread;
  c = mix(c, vec3(0.3), axis);
  outColor = vec4(c, 1.0);
}
