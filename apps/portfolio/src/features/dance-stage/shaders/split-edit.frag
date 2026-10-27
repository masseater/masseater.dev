// note: 下に編集ソフトのような映像と音の帯を描き、音の切り替わりを映像より半拍早く置く。映像の画は遅れて切り替わり、音が先に次の場面を連れてくる。
void main() {
  float cut = floor((time - 0.6) / 2.4);
  float audioCut = floor(time / 2.4);
  float shot = mod(cut, 2.0);
  vec2 p = shot > 0.5 ? (uv - 0.5) / 1.6 + bodyCenter() : uv;
  vec3 c = rgb(p) * (shot > 0.5 ? vec3(0.95, 1.0, 1.15) : vec3(1.0));
  if (uv.y > 0.8) {
    float x = uv.x * 6.0 + time / 2.4 * 1.0;
    float row = uv.y < 0.9 ? 0.0 : 1.0;
    float offset = row < 0.5 ? 0.6 / 2.4 : 0.0;
    float clip = mod(floor(x - 3.0 - offset * 0.0 + (row < 0.5 ? -0.25 : 0.0)), 2.0);
    vec3 a = row < 0.5 ? vec3(0.35, 0.55, 0.95) : vec3(0.3, 0.8, 0.5);
    vec3 b = row < 0.5 ? vec3(0.95, 0.5, 0.35) : vec3(0.85, 0.75, 0.3);
    c = mix(a, b, clip) * 0.8;
    if (row > 0.5) {
      int band = int(clamp(fract(uv.x * 40.0) * 8.0, 0.0, 7.0));
      c *= 0.6 + 0.6 * step(abs(uv.y - 0.95), bands[band] * 0.04);
    }
    c = mix(c, vec3(1.0), step(abs(uv.x - 0.5), 0.002));
    c = mix(c, vec3(0.1), step(abs(uv.y - 0.9), 0.002));
  }
  outColor = vec4(c + 0.0 * audioCut, 1.0);
}
