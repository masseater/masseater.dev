// note: 角の丸い箱を格子に並べ、大きな箱に踊る人、小さな箱に拍の数、音量の棒、帯域の棒、題名を入れる。箱は拍ごとに 1 つずつ軽く浮く。
// text: SEIKIN DANCE
// text: 拍の数
float box(vec2 p, vec2 a, vec2 b, float r) {
  vec2 c = (a + b) * 0.5;
  vec2 s = (b - a) * 0.5;
  vec2 q = abs((p - c) * vec2(aspect(), 1.0)) - s * vec2(aspect(), 1.0) + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec3 c = vec3(0.93, 0.92, 0.89);
  float lift = exp(-beat * 6.0) * 0.008;
  int which = int(mod(beatCount, 4.0));
  vec2 a0 = vec2(0.03, 0.05); vec2 b0 = vec2(0.58, 0.95);
  vec2 a1 = vec2(0.61, 0.05); vec2 b1 = vec2(0.97, 0.3);
  vec2 a2 = vec2(0.61, 0.33); vec2 b2 = vec2(0.78, 0.62);
  vec2 a3 = vec2(0.8, 0.33); vec2 b3 = vec2(0.97, 0.62);
  vec2 a4 = vec2(0.61, 0.65); vec2 b4 = vec2(0.97, 0.95);
  vec2 o0 = vec2(0.0, which == 0 ? lift : 0.0);
  vec2 o1 = vec2(0.0, which == 1 ? lift : 0.0);
  vec2 o2 = vec2(0.0, which == 2 ? lift : 0.0);
  vec2 o3 = vec2(0.0, which == 3 ? lift : 0.0);
  float d0 = box(uv + o0, a0, b0, 0.03);
  if (d0 < 0.0) {
    vec2 q = (uv + o0 - a0) / (b0 - a0);
    vec2 at = vec2(0.5 + (q.x - 0.5) * 0.62, q.y);
    c = mix(vec3(0.85, 0.83, 0.95), rgb(at), 1.0);
  }
  float d1 = box(uv + o1, a1, b1, 0.03);
  if (d1 < 0.0) {
    c = vec3(0.16, 0.16, 0.2);
    c = mix(c, vec3(1.0), textBox(uv + o1, (a1 + b1) * 0.5, 0.07, 0));
  }
  float d2 = box(uv + o2, a2, b2, 0.03);
  if (d2 < 0.0) {
    c = vec3(1.0, 0.85, 0.6);
    c = mix(c, vec3(0.3, 0.2, 0.1), number(uv + o2, vec2(a2.x + 0.03, a2.y + 0.05), 0.12, beatCount, 3));
    c = mix(c, vec3(0.3, 0.2, 0.1), textBox(uv + o2, vec2((a2.x + b2.x) * 0.5, b2.y - 0.05), 0.04, 1));
  }
  float d3 = box(uv + o3, a3, b3, 0.03);
  if (d3 < 0.0) {
    c = vec3(0.7, 0.9, 0.8);
    float lv = (uv.y + o3.y - a3.y) / (b3.y - a3.y);
    c = mix(c, vec3(0.1, 0.5, 0.35), step(1.0 - lv, level * 0.9) * step(abs((uv.x - (a3.x + b3.x) * 0.5) * aspect()), 0.05));
  }
  float d4 = box(uv, a4, b4, 0.03);
  if (d4 < 0.0) {
    c = vec3(0.75, 0.82, 1.0);
    float x = (uv.x - a4.x) / (b4.x - a4.x);
    int band = int(clamp(x * 8.0, 0.0, 7.0));
    float y = (b4.y - uv.y) / (b4.y - a4.y);
    c = mix(c, vec3(0.2, 0.3, 0.8), step(y, 0.1 + bands[band] * 0.7) * step(0.15, fract(x * 8.0)) * step(fract(x * 8.0), 0.85));
  }
  outColor = vec4(c, 1.0);
}
