// note: 左上から転がった玉が坂を下り、ドミノを倒し、最後に踊る人の足元のボタンを押す。押されるまで踊りは止まったままで、押された瞬間から踊り出す。8 秒ごとに繰り返す。
void main() {
  float t = mod(time, 8.0);
  float start = floor(time / 8.0) * 8.0;
  float pressed = step(4.0, t);
  vec3 c = pressed > 0.5 ? rgb(uv) : pastRgb(uv, start) * 0.85;
  vec2 a = vec2(0.03, 0.12); vec2 b = vec2(0.3, 0.3); vec2 d = vec2(0.32, 0.55); vec2 e = vec2(0.1, 0.7);
  float ramps = min(segment(uv, a, b), segment(uv, d, e));
  c = mix(c, vec3(0.45, 0.3, 0.15), smoothstep(0.008, 0.005, ramps));
  vec2 ball = t < 1.5 ? mix(a, b, t / 1.5) - vec2(0.0, 0.025) : t < 2.0 ? mix(b, d, (t - 1.5) / 0.5) : t < 3.2 ? mix(d, e, (t - 2.0) / 1.2) - vec2(0.0, 0.025) : e - vec2(0.0, 0.025);
  for (int i = 0; i < 5; i++) {
    float x = 0.12 + float(i) * 0.05;
    float fall = clamp((t - 3.2 - float(i) * 0.15) * 6.0, 0.0, 1.0) * 1.2;
    vec2 base = vec2(x, 0.82);
    vec2 top = base + rot(vec2(0.0, -0.08), -fall) * vec2(1.0 / aspect(), 1.0);
    c = mix(c, vec3(0.9, 0.2, 0.2), smoothstep(0.009, 0.006, segment(uv, base, top)));
  }
  vec2 button = vec2(0.42, 0.85);
  c = mix(c, mix(vec3(0.9, 0.1, 0.1), vec3(0.2, 0.9, 0.2), pressed), smoothstep(0.022, 0.018, dist(uv, button)));
  c = mix(c, vec3(0.2, 0.25, 0.8), smoothstep(0.022, 0.016, dist(uv, ball)));
  outColor = vec4(c, 1.0);
}
