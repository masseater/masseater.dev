// note: 上の骨組みに並べた 6 台の照明の首を振らせ、光の束で扇や交差の形を順に描く。光の中には模様の型を抜いた明暗を入れる。
void main() {
  vec3 c = rgb(uv) * 0.25;
  c = mix(c, rgb(uv) * 0.5, matte(uv));
  float shape = floor(mod(time / 4.0, 3.0));
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 head = vec2(0.1 + fi * 0.16, 0.02);
    float fan = (fi - 2.5) * 0.18;
    float cross_ = (fi < 3.0 ? 1.0 : -1.0) * 0.4;
    float wave = sin(time * 1.5 + fi * 0.8) * 0.4;
    float a = shape < 0.5 ? fan * (1.0 + 0.3 * sin(time)) : (shape < 1.5 ? cross_ * (0.7 + 0.3 * sin(time)) : wave);
    vec2 d = (uv - head) * vec2(aspect(), 1.0);
    vec2 dir = vec2(sin(a), cos(a));
    float along = dot(d, dir);
    float across = d.x * dir.y - d.y * dir.x;
    float width = 0.02 + along * 0.1;
    float beam = smoothstep(width, width * 0.6, abs(across)) * step(0.0, along);
    float gobo = 0.6 + 0.4 * step(0.5, fract(across / max(width, 1e-3) * 2.0 + along * 3.0));
    vec3 col = hsv(vec3(0.55 + 0.08 * fi, 0.4, 1.0));
    c += col * beam * gobo * 0.35 * (0.6 + 0.4 * fbm(uv * 4.0 + time * 0.2));
    c = mix(c, vec3(0.3), step(dist(uv, head), 0.02));
  }
  outColor = vec4(c, 1.0);
}
