// note: 下の鍵盤は、流れている曲を 8 つの高さの帯に分け、強い帯ほど対応する鍵をたくさん押したように光らせる。曲の響きを鍵盤の組み合わせで真似る話すピアノのやり方を、鍵盤の動きで見せる。
void main() {
  vec3 c = rgb(vec2(uv.x, uv.y / 0.72));
  if (uv.y > 0.72) {
    float keys = 52.0;
    float k = floor(uv.x * keys);
    float local = fract(uv.x * keys);
    int band = int(clamp(k / keys * 8.0, 0.0, 7.0));
    float press = step(hash(vec2(k, floor(time * 8.0))), bands[band] * 1.2);
    vec3 white = mix(vec3(0.95), vec3(1.0, 0.75, 0.3), press);
    c = mix(white, vec3(0.2), step(0.94, local));
    float black = step(0.65, fract(uv.x * keys + 0.5)) * step(uv.y, 0.86);
    float bk = mod(k, 7.0);
    black *= step(0.5, abs(bk - 2.0)) * step(0.5, abs(bk - 6.0));
    c = mix(c, vec3(0.08), black);
  }
  outColor = vec4(c, 1.0);
}
