// note: 時間で切り替わる乱数で横の帯をずらし、帯ごとに色の版を分けて壊れた画を作る。
void main() {
  float t = floor(time * 8.0);
  float band = floor(uv.y * 24.0);
  float on = step(0.7, hash(vec2(band, t)));
  float shift = (hash(vec2(t, band)) - 0.5) * 0.2 * on;
  vec2 p = vec2(fract(uv.x + shift), uv.y);
  vec3 c = vec3(rgb(p + vec2(0.01 * on, 0)).r, rgb(p).g, rgb(p - vec2(0.01 * on, 0)).b);
  float block = step(0.93, hash(floor(uv * vec2(16.0, 9.0)) + t));
  c = mix(c, vec3(hash(vec2(t, 1.0)), hash(vec2(t, 2.0)), hash(vec2(t, 3.0))), block * 0.8);
  outColor = vec4(c, 1.0);
}
