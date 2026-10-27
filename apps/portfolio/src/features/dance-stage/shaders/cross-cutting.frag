// note: 部屋で踊る画と、夜の街の屋上に切り抜いて置いた画を 1.5 秒ずつ交互に切り替える。同じ時間に別の場所で起きている出来事のように並ぶ。
void main() {
  float other = mod(floor(time / 1.5), 2.0);
  vec3 c = rgb(uv);
  if (other > 0.5) {
    vec3 sky = mix(vec3(0.05, 0.06, 0.15), vec3(0.2, 0.12, 0.3), uv.y);
    float x = floor(uv.x * 30.0);
    float h = 0.25 + 0.35 * hash(vec2(x, 4.0));
    if (1.0 - uv.y < h + 0.15) {
      sky = vec3(0.04, 0.04, 0.07);
      sky += vec3(1.0, 0.85, 0.5) * step(0.8, hash(floor(uv * vec2(160.0, 90.0)))) * 0.4;
    }
    if (uv.y > 0.86) sky = vec3(0.12, 0.12, 0.14);
    vec3 body = rgb(uv) * vec3(0.55, 0.6, 0.85);
    c = mix(sky, body, matte(uv));
  }
  outColor = vec4(c, 1.0);
}
