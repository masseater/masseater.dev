// note: 画面下に 4 つのつまみと 8 つの鍵盤を並べ、つまみがひとりでに回るのに合わせて、色相、モザイク、鏡写し、色ずれを踊りに掛ける。拍のたびに鍵盤を 1 つずつ押す。
void main() {
  float k1 = 0.5 + 0.5 * sin(time * 0.7);
  float k2 = smoothstep(0.6, 1.0, 0.5 + 0.5 * sin(time * 0.43 + 1.0));
  float k3 = step(0.5, 0.5 + 0.5 * sin(time * 0.31 + 2.0));
  float k4 = 0.5 + 0.5 * sin(time * 0.57 + 3.0);
  vec2 p = uv * vec2(1.0, 1.0 / 0.8);
  if (k3 > 0.5) p.x = 0.5 - abs(p.x - 0.5);
  float px = mix(1.0, 12.0, k2);
  vec2 cells = vec2(160.0, 90.0) / px;
  vec2 q = mix(p, (floor(p * cells) + 0.5) / cells, step(1.5, px));
  vec3 c = vec3(rgb(q + vec2(k4 * 0.01, 0.0)).r, rgb(q).g, rgb(q - vec2(k4 * 0.01, 0.0)).b);
  vec3 h = hsv(vec3(k1, 0.6, 1.0));
  c = mix(c, c * h * 1.4, 0.5);
  if (uv.y > 0.8) {
    c = vec3(0.13, 0.13, 0.15);
    float knobs[4] = float[4](k1, k2, k3, k4);
    for (int i = 0; i < 4; i++) {
      vec2 center = vec2(0.07 + float(i) * 0.1, 0.9);
      vec2 d = (uv - center) * vec2(aspect(), 1.0);
      float r = length(d);
      c = mix(c, vec3(0.3), step(r, 0.04));
      float a = mix(-2.4, 2.4, knobs[i]);
      vec2 tip = vec2(sin(a), -cos(a)) * 0.035;
      float line = length(d - tip * clamp(dot(d, tip) / dot(tip, tip), 0.0, 1.0));
      c = mix(c, vec3(1.0, 0.6, 0.2), step(line, 0.005) * step(r, 0.04));
    }
    for (int i = 0; i < 8; i++) {
      vec2 lo = vec2(0.46 + float(i) * 0.065, 0.84);
      float inKey = step(lo.x, uv.x) * step(uv.x, lo.x + 0.055) * step(lo.y, uv.y) * step(uv.y, 0.96);
      float pressed = step(abs(mod(beatCount, 8.0) - float(i)), 0.0) * exp(-beat * 4.0);
      c = mix(c, mix(vec3(0.85), vec3(0.3, 0.8, 1.0), pressed), inKey);
    }
  }
  outColor = vec4(c, 1.0);
}
