// note: 雨の夜の街のように部屋を暗くして青と桃色のネオンで照らし、斜めの雨筋を降らせる。濡れた床に踊る人を映り込ませ、横には浮かぶ表示の枠を出し、ときどき横にずれる乱れを入れる。
// text: 踊 / DANCE-07
void main() {
  vec2 p = uv;
  float g = step(0.97, hash(vec2(floor(uv.y * 20.0), floor(time * 4.0))));
  p.x += g * 0.03;
  vec3 c = rgb(p) * vec3(0.25, 0.3, 0.5);
  c += vec3(1.0, 0.2, 0.7) * smoothstep(0.6, 0.0, uv.x) * 0.25 + vec3(0.1, 0.8, 1.0) * smoothstep(0.4, 1.0, uv.x) * 0.25;
  c = mix(c, rgb(p) * vec3(0.8, 0.7, 1.1), matte(p) * 0.8);
  if (uv.y > 0.86) {
    vec2 r = vec2(uv.x, 1.72 - uv.y + 0.01 * sin(uv.x * 80.0 + time * 3.0));
    c = mix(c, rgb(r) * vec3(0.4, 0.5, 0.9), matte(r) * 0.5);
  }
  vec2 rain = vec2(uv.x * 70.0 + uv.y * 8.0, uv.y * 3.0 - time * 4.0);
  float drop = step(0.92, hash(vec2(floor(rain.x), floor(rain.y)))) * step(abs(fract(rain.x) - 0.5), 0.06);
  c += vec3(0.5, 0.6, 0.8) * drop * 0.4;
  vec2 lo = vec2(0.66, 0.12);
  vec2 hi = vec2(0.95, 0.3);
  float box = step(lo.x, uv.x) * step(uv.x, hi.x) * step(lo.y, uv.y) * step(uv.y, hi.y);
  c = mix(c, vec3(0.0, 0.3, 0.4), box * 0.5);
  c = mix(c, vec3(0.2, 1.0, 1.0), box * (1.0 - step(lo.x + 0.003, uv.x) * step(uv.x, hi.x - 0.003) * step(lo.y + 0.005, uv.y) * step(uv.y, hi.y - 0.005)));
  c = mix(c, vec3(0.6, 1.0, 1.0), textBox(uv, vec2(0.8, 0.21), 0.05, 0));
  outColor = vec4(c, 1.0);
}
