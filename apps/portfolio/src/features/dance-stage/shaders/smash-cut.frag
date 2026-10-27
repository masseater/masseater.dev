// note: 3 秒ごとに、色を抜いてゆっくり流れる静かな画から、色を濃くして寄って揺れる激しい画へ、つなぎを入れずに切り替える。
void main() {
  float phase = fract(time / 3.0);
  vec3 c;
  if (phase < 0.6) {
    c = pastRgb(uv, floor(time / 3.0) * 3.0 + phase * 0.8);
    c = mix(vec3(luma(c)), c, 0.2) * 0.75 + 0.05;
  } else {
    vec2 shake = vec2(hash(vec2(time, 1.0)), hash(vec2(time, 2.0))) * 0.02 - 0.01;
    vec2 p = (uv - 0.5) / 1.5 + bodyCenter() + shake;
    c = rgb(p);
    c = mix(vec3(luma(c)), c, 1.9);
    c = (c - 0.5) * 1.3 + 0.5;
  }
  outColor = vec4(c, 1.0);
}
