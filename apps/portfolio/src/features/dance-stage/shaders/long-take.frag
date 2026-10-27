// note: カットを割らずに、カメラが人物の周りをゆっくり寄ったり回り込んだりし続ける。左上の時計は途切れずに進む。
void main() {
  float t = time * 0.25;
  float zoom = 1.2 + 0.35 * sin(t * 1.3);
  vec2 target = mix(vec2(0.5), bodyCenter(), 0.6) + vec2(0.12 * sin(t), 0.04 * cos(t * 0.7));
  vec2 q = rot((uv - 0.5) * vec2(aspect(), 1.0), 0.05 * sin(t * 0.9));
  vec2 p = q / vec2(aspect(), 1.0) / zoom + target;
  vec3 c = rgb(p);
  float secs = floor(time);
  float n = number(uv, vec2(0.04, 0.05), 0.06, secs, 2) + number(uv, vec2(0.11, 0.05), 0.06, floor(fract(time) * 30.0), 2);
  c = mix(c, vec3(1.0), clamp(n, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}
