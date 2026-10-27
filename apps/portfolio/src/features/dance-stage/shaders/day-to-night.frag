// note: 画面を左から右へ、昼の色から夜の色へ少しずつ変える。夜の側では背景を青く沈め、窓のような灯りを足し、人物だけを横から照らす。
void main() {
  float edge = uv.x + 0.15 * sin(uv.y * 3.0 + time * 0.5);
  float night = smoothstep(0.25, 0.75, edge);
  vec3 bg = plate(uv);
  vec3 day = bg * vec3(1.08, 1.02, 0.92) + vec3(0.04, 0.03, 0.0);
  vec3 dark = bg * vec3(0.18, 0.22, 0.42);
  vec2 cell = floor(uv * vec2(18.0, 10.0));
  float lamp = step(0.82, hash(cell)) * step(0.4, uv.y) * (0.6 + 0.4 * sin(time * 2.0 + hash(cell) * 6.0));
  dark += vec3(1.0, 0.75, 0.35) * lamp * 0.25 * smoothstep(0.4, 0.0, length(fract(uv * vec2(18.0, 10.0)) - 0.5));
  vec3 back = mix(day, dark, night);
  vec3 body = rgb(uv);
  vec3 lit = mix(body * vec3(1.05, 1.0, 0.95), body * vec3(0.35, 0.4, 0.7) + vec3(0.25, 0.15, 0.05) * smoothstep(0.3, 0.7, uv.x), night);
  outColor = vec4(mix(back, lit, matte(uv)), 1.0);
}
