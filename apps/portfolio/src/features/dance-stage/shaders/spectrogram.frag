// note: 曲の 8 つの帯域の強さを毎フレーム右端に縦 1 列ずつ書き足し、左へ流して、時間と高さの平面に音の絵を描く。強い所ほど黄色く、弱い所ほど紫に塗る。
// pass: spec persistent
uniform sampler2D spec;
void main() {
  float shift = 1.0 / 320.0;
  if (uv.x < 1.0 - shift) { outColor = read(spec, uv + vec2(shift, 0.0)); return; }
  float f = clamp((1.0 - uv.y) * 7.0, 0.0, 7.0);
  int i = int(min(floor(f), 6.0));
  float v = mix(bands[i], bands[i + 1], fract(f));
  outColor = vec4(v, 0.0, 0.0, 1.0);
}
// pass:
uniform sampler2D spec;
vec3 heat(float v) {
  return mix(mix(vec3(0.05, 0.0, 0.15), vec3(0.6, 0.1, 0.5), smoothstep(0.0, 0.4, v)), vec3(1.0, 0.9, 0.3), smoothstep(0.4, 1.0, v));
}
void main() {
  vec3 c = rgb(uv) * 0.3;
  if (uv.y > 0.55) {
    vec2 q = vec2(uv.x, (uv.y - 0.55) / 0.45);
    c = heat(read(spec, q).r);
  } else {
    c = mix(c, rgb(uv), matte(uv));
  }
  c = mix(c, vec3(1.0), step(abs(uv.y - 0.55), 0.002));
  outColor = vec4(c, 1.0);
}
