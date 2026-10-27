// note: 夜の水辺に 8 本の噴水を並べ、帯域ごとの強さで水柱の高さを、拍の数で照明の色を変える。踊る人は暗くした奥に立ち、水柱の光が手前に重なる。
void main() {
  vec3 c = rgb(uv) * 0.18;
  c = mix(c, rgb(uv) * 0.5, matte(uv));
  vec3 water = vec3(0.0);
  float baseY = 0.86;
  for (int i = 0; i < 8; i++) {
    float x = 0.09 + float(i) * 0.117;
    float h = 0.15 + bands[i] * 0.55;
    float top = baseY - h;
    float y = (baseY - uv.y) / h;
    float width = 0.006 + 0.012 * y * y;
    float col = exp(-pow((uv.x - x) * aspect() / width, 2.0)) * step(top, uv.y) * step(uv.y, baseY);
    col *= 0.6 + 0.4 * noise(vec2(uv.x * 200.0, uv.y * 40.0 + time * 12.0));
    float spray = exp(-dist(uv, vec2(x, top)) * 30.0) * noise(vec2(uv * 120.0 + time * 4.0)) * 1.2;
    vec3 lightColor = hsv(vec3(fract(beatCount * 0.1 + float(i) * 0.06), 0.6, 1.0));
    water += lightColor * (col + spray);
  }
  c += water;
  float pool = step(baseY, uv.y);
  c = mix(c, vec3(0.03, 0.05, 0.12) + water * 0.25 + 0.05 * noise(vec2(uv.x * 80.0, uv.y * 20.0 - time)), pool);
  outColor = vec4(c, 1.0);
}
