// note: 画面を白黒の細い縞と数字だけにする。上は曲の 8 つの音域の強さを縞の密度に、中は踊る人を 1 と 0 の画素に、下は拍の数と経過時間を数字で出す。
void main() {
  vec3 c = vec3(0.0);
  if (uv.y < 0.3) {
    int band = int(clamp(uv.x * 8.0, 0.0, 7.0));
    float density = 20.0 + bands[band] * 300.0;
    c = vec3(step(0.5, fract(uv.x * density + time * 5.0 * float(band + 1))));
  } else if (uv.y < 0.82) {
    vec2 grid = vec2(240.0, 72.0);
    vec2 cell = floor(uv * grid);
    float bit = step(0.5, matte((cell + 0.5) / grid));
    float flicker = step(0.5, hash(cell + floor(time * 10.0)));
    c = vec3(mix(flicker * 0.15, 1.0, bit));
  } else {
    c = vec3(number(uv, vec2(0.05, 0.86), 0.1, beatCount, 4));
    c = max(c, vec3(number(uv, vec2(0.55, 0.86), 0.1, floor(mod(time, DURATION) * 100.0), 4)));
    c = max(c, vec3(step(abs(uv.y - 0.84), 0.002)));
  }
  outColor = vec4(c, 1.0);
}
