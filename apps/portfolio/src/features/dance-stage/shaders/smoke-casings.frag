// note: 2 拍ごとに右手で撃ったことにして、手首から細い煙をしばらく立ちのぼらせ、金色の薬莢を右へはじいて床に落とす。床の薬莢は 16 拍分まで積もり、その後は片付く。
void main() {
  vec3 c = rgb(uv);
  vec2 hand = joint(16);
  float since = mod(beatCount, 2.0) + beat;
  float y = hand.y - uv.y;
  float sway = sin(uv.y * 30.0 - time * 2.0) * 0.01 * y;
  float smoke = smoothstep(0.02 + y * 0.05, 0.0, abs(uv.x - hand.x - sway) * aspect()) * step(0.0, y) * step(y, 0.3) * exp(-since * 0.8) * (0.5 + 0.5 * fbm(uv * 20.0 + vec2(0.0, time)));
  c = mix(c, vec3(0.85), clamp(smoke, 0.0, 1.0) * 0.6);
  float fired = floor(mod(beatCount, 16.0) / 2.0);
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi > fired) break;
    vec2 rest = vec2(0.55 + hash(vec2(fi, 1.0)) * 0.35, 0.95 - hash(vec2(fi, 2.0)) * 0.02);
    vec2 pos = rest;
    if (fi == fired) {
      float t = min(since, 0.7) / 0.7;
      pos = mix(hand, rest, t) - vec2(0.0, sin(t * PI) * 0.2);
    }
    vec2 q = rot((uv - pos) * vec2(aspect(), 1.0), fi * 1.3 + since * 8.0 * step(abs(fi - fired), 0.0));
    c = mix(c, vec3(0.85, 0.65, 0.2), step(abs(q.x), 0.008) * step(abs(q.y), 0.004));
  }
  outColor = vec4(c, 1.0);
}
